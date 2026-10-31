/**
 * LEVEL TRAP - Real-Time Multiplayer Versus Client Engine
 * Emparejamiento 1v1, Sincronización de Avatar de Rival y Efecto Dominó de Trampas
 */
class VersusClient {
  constructor() {
    this.socket = null;
    this.isInMatch = false;
    this.roomId = null;
    this.role = null;
    this.opponent = null;
    this.opponentState = {
      x: 80,
      y: 560,
      vx: 0,
      vy: 0,
      facingDir: 1,
      lookY: 0,
      scaleX: 1,
      scaleY: 1,
      isGrounded: true,
      lastUpdate: 0
    };

    this.lastSyncTime = 0;
    this.syncIntervalMs = 50; // Sincronización a 20 Hz
  }

  init(socketInstance) {
    this.socket = socketInstance;
    this.setupListeners();
  }

  setupListeners() {
    if (!this.socket) return;

    // 1. Emparejamiento exitoso
    this.socket.on('versus_matched', (data) => {
      this.isInMatch = true;
      this.roomId = data.roomId;
      this.role = data.role;
      this.opponent = data.opponent;

      console.log(`[Versus] ¡Rival Encontrado! Sala: ${this.roomId}, Rival: ${this.opponent.username}`);

      // Notificar al UIManager para actualizar modal
      if (window.uiManager) {
        window.uiManager.notifyVersusMatched(this.opponent, data.levelNumber);
      }

      // Arrancar nivel en el motor de juego
      if (window.gameInstance) {
        window.gameInstance.isVersusMode = true;
        window.gameInstance.start(data.levelNumber);
      }
    });

    // 2. Esperando rival en cola
    this.socket.on('versus_waiting_opponent', () => {
      if (window.uiManager) {
        window.uiManager.notifyVersusWaiting();
      }
    });

    // 3. Sincronización de movimiento del oponente
    this.socket.on('versus_opponent_updated', (data) => {
      this.opponentState = {
        ...data,
        lastUpdate: performance.now()
      };
    });

    // 4. Recepción de EFECTO DOMINÓ DE TRAMPAS
    this.socket.on('versus_receive_domino_trap', (data) => {
      // Activar efecto de sorpresa en el juego local
      if (window.juiceEngine) {
        window.juiceEngine.screenShake(10, 300);
      }
      if (window.soundEngine) {
        window.soundEngine.playTone(480, 'sawtooth', 0.3, window.soundEngine.sfxGain, 0.4);
      }

      // Desatar lluvia de pinchos o colapso sorpresa en el motor de juego
      if (window.gameInstance) {
        window.gameInstance.spawnDominoHazard(data.trapType);
      }

      // Mostrar toast de advertencia de dominó
      if (window.gameInstance) {
        window.gameInstance.displayAchievementNotification({
          icon: '⚡',
          name: '¡EFECTO DOMINÓ ACTIVADO!',
          description: `¡Tu rival ${this.opponent ? this.opponent.username : ''} te ha enviado una trampa sorpresa!`
        });
      }
    });

    // 5. Oponente muerto en el nivel
    this.socket.on('versus_opponent_died', () => {
      if (window.juiceEngine) {
        window.juiceEngine.createDeathBurst(this.opponentState.x, this.opponentState.y);
      }
    });

    // 6. Fin de la partida Versus (Alguien cruzó la puerta de salida)
    this.socket.on('versus_match_ended', (data) => {
      const isWinner = (data.winner === (window.currentUser ? window.currentUser.username : ''));
      if (window.uiManager) {
        window.uiManager.showVersusResultModal(isWinner, data.winner, data.timeMs);
      }
      this.leaveMatch();
    });

    // 7. Oponente desconectado
    this.socket.on('versus_opponent_disconnected', () => {
      alert('Tu rival se ha desconectado. ¡Victoria por abandono!');
      this.leaveMatch();
    });
  }

  // Buscar partida Versus
  joinQueue(preferredLevel = 5) {
    if (!this.socket) return;
    const user = window.currentUser || { id: 0, username: 'Jugador' };
    this.socket.emit('versus_join_queue', {
      userId: user.id,
      username: user.username,
      preferredLevel
    });
  }

  // Cancelar búsqueda
  leaveQueue() {
    if (!this.socket) return;
    this.socket.emit('versus_leave_queue');
  }

  // Enviar coordenadas del jugador local al rival
  syncPlayer(player) {
    if (!this.isInMatch || !this.socket || !this.roomId) return;

    const now = performance.now();
    if (now - this.lastSyncTime >= this.syncIntervalMs) {
      this.lastSyncTime = now;
      this.socket.emit('versus_sync_position', {
        roomId: this.roomId,
        x: Math.round(player.x),
        y: Math.round(player.y),
        vx: player.vx,
        vy: player.vy,
        facingDir: player.facingDir,
        lookY: player.lookY,
        scaleX: player.scaleX,
        scaleY: player.scaleY,
        isGrounded: player.isGrounded
      });
    }
  }

  // Enviar Efecto Dominó de Trampas al rival
  sendDominoTrap(trapType = 'falling_spikes_rain') {
    if (!this.isInMatch || !this.socket || !this.roomId) return;
    this.socket.emit('versus_trigger_domino_trap', {
      roomId: this.roomId,
      trapType
    });
  }

  // Notificar muerte local en versus
  reportDeath(trapType, deaths) {
    if (!this.isInMatch || !this.socket || !this.roomId) return;
    this.socket.emit('versus_player_death', {
      roomId: this.roomId,
      trapType,
      deaths
    });
  }

  // Notificar victoria local en versus
  reportVictory(timeMs) {
    if (!this.isInMatch || !this.socket || !this.roomId) return;
    this.socket.emit('versus_player_won', {
      roomId: this.roomId,
      timeMs
    });
  }

  leaveMatch() {
    this.isInMatch = false;
    this.roomId = null;
    this.opponent = null;
    if (window.gameInstance) {
      window.gameInstance.isVersusMode = false;
    }
  }

  // Renderizar al Rival en el Canvas con silueta cian y nombre arriba
  drawOpponent(ctx) {
    if (!this.isInMatch || !this.opponent) return;

    ctx.save();
    const opp = this.opponentState;

    ctx.translate(opp.x + 14, opp.y + 14);
    ctx.scale(opp.scaleX || 1, opp.scaleY || 1);

    // Cuerpo del Rival: Bloque con borde cian neón característico
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -14, 28, 28);

    // Ojos cian del rival
    const eyeYOffset = opp.lookY === -1 ? -6 : (opp.lookY === 1 ? 2 : -2);
    const eyeXOffset = opp.facingDir === 1 ? 2 : -4;
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-6 + eyeXOffset, eyeYOffset, 4, 6);
    ctx.fillRect(3 + eyeXOffset, eyeYOffset, 4, 6);

    ctx.restore();

    // Etiqueta de Nombre del Rival sobre la cabeza
    ctx.save();
    ctx.fillStyle = '#06b6d4';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.opponent.username, opp.x + 14, opp.y - 8);
    ctx.restore();
  }
}

window.versusClient = new VersusClient();

