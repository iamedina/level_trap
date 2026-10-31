/**
 * LEVEL TRAP - Main Game Engine
 * HTML5 Canvas 1280x720 (Rejilla 32x18 bloques de 40px)
 * CERO MOCKS: Consumo directo de la API REST y sincronización de base de datos
 */
class LevelTrapGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Estado del juego
    this.currentLevel = 1;
    this.totalDeaths = 0;
    this.gameState = 'INIT'; // INIT, PLAYING, DYING, LEVEL_CLEAR, GAME_WON
    this.levelData = null;
    this.theme = getZoneTheme(1);

    // Entidades
    this.player = new Player(80, 560);
    this.platforms = [];
    this.traps = [];
    this.fakeDoors = [];
    this.exitDoor = { x: 1160, y: 540, w: 40, h: 60 };

    // Cronómetro de Speedrun
    this.runStartTime = 0;
    this.runElapsedMs = 0;
    this.levelStartTime = 0;
    this.levelElapsedMs = 0;
    this.isTimerRunning = false;

    // Entradas y Controles duales
    this.inputs = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpPressed: false
    };

    // Auditoría de logros en cliente
    this.currentLevelDeaths = 0;
    this.consecutiveCleanLevels = 0;
    this.fakeDoorsTouchedCount = 0;
    this.invertedGravityTimeTotal = 0;
    this.isVersusMode = false;
    this.dominoSentInLevel = false;

    // Bucle
    this.lastFrameTime = performance.now();
    this.animationFrameId = null;

    this.initInputs();
    this.initTouchControls();
  }

  // Inicialización de Controles por Teclado
  initInputs() {
    window.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en campos de formulario
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') this.inputs.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.inputs.right = true;
      if (code === 'KeyW' || code === 'ArrowUp') this.inputs.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.inputs.down = true;
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
        if (!this.inputs.jump) {
          this.inputs.jumpPressed = true;
        }
        this.inputs.jump = true;
        // Iniciar audio en primera interacción
        if (window.soundEngine) window.soundEngine.ensureContext();
      }

      // Reinicio rápido manual con 'R'
      if (code === 'KeyR' && this.gameState === 'PLAYING') {
        this.handlePlayerDeath('manual_restart');
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') this.inputs.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.inputs.right = false;
      if (code === 'KeyW' || code === 'ArrowUp') this.inputs.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.inputs.down = false;
      if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
        this.inputs.jump = false;
      }
    });
  }

  // Inicialización de Controles Táctiles en Pantalla
  initTouchControls() {
    const bindBtn = (id, prop, isJump = false) => {
      const el = document.getElementById(id);
      if (!el) return;

      const onPress = (e) => {
        e.preventDefault();
        this.inputs[prop] = true;
        if (isJump) this.inputs.jumpPressed = true;
        if (window.soundEngine) window.soundEngine.ensureContext();
      };

      const onRelease = (e) => {
        e.preventDefault();
        this.inputs[prop] = false;
      };

      el.addEventListener('touchstart', onPress, { passive: false });
      el.addEventListener('touchend', onRelease, { passive: false });
      el.addEventListener('mousedown', onPress);
      el.addEventListener('mouseup', onRelease);
      el.addEventListener('mouseleave', onRelease);
    };

    bindBtn('touch-left', 'left');
    bindBtn('touch-right', 'right');
    bindBtn('touch-jump', 'jump', true);
  }

  // Iniciar o reanudar el juego
  async start(levelNumber = 1) {
    this.currentLevel = levelNumber;
    await this.loadLevel(this.currentLevel);

    this.runStartTime = performance.now();
    this.runElapsedMs = 0;
    this.isTimerRunning = true;

    if (!this.animationFrameId) {
      this.lastFrameTime = performance.now();
      this.loop();
    }
  }

  // Cargar nivel desde el Servidor REST (Cero Mocks)
  async loadLevel(levelNumber) {
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch(`/api/game/levels/${levelNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo cargar el nivel.');
      }

      this.levelData = data.data;
      this.currentLevel = this.levelData.levelNumber;
      this.theme = getZoneTheme(this.levelData.zoneId);

      // Configurar entidades
      const layout = this.levelData.layout;
      this.platforms = JSON.parse(JSON.stringify(layout.platforms || []));
      this.traps = JSON.parse(JSON.stringify(layout.traps || []));
      this.fakeDoors = JSON.parse(JSON.stringify(layout.fakeDoors || []));
      this.exitDoor = layout.exitDoor || { x: 1160, y: 540, w: 40, h: 60 };

      // Spawn del jugador
      const spawn = layout.spawn || { x: 80, y: 560 };
      this.player.reset(spawn.x, spawn.y);

      // Partículas ambientales de ceniza si es Zona 2
      if (this.theme.hasEmbers) {
        window.juiceEngine.initZone2Embers(this.canvas.width, this.canvas.height);
      } else {
        window.juiceEngine.clearAmbient();
      }

      // Inicializar jefe si aplica
      if (this.levelData.isBossLevel) {
        window.bossManager.initBoss(this.currentLevel, layout.bossConfig);
        if (window.soundEngine) window.soundEngine.startBgm(true);
      } else {
        window.bossManager.initBoss(0, null);
        if (window.soundEngine) window.soundEngine.startBgm(false);
      }

      // Cargar silueta fantasma del mejor récord
      this.loadBestGhost(this.currentLevel);

      // Iniciar grabador de Ghost Engine
      window.ghostEngine.startRecording();

      this.currentLevelDeaths = 0;
      this.dominoSentInLevel = false;
      this.levelStartTime = performance.now();
      this.gameState = 'PLAYING';

      // Actualizar UI del HUD
      this.updateHud();

    } catch (err) {
      console.error('Error al cargar nivel:', err);
    }
  }

  // Cargar silueta fantasma de la mejor marca
  async loadBestGhost(levelNumber) {
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch(`/api/speedrun/ghost/${levelNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.ghostData) {
          window.ghostEngine.loadGhost(data.data.ghostData);
        }
      } else {
        window.ghostEngine.clearGhost();
      }
    } catch (e) {
      window.ghostEngine.clearGhost();
    }
  }

  // Manejo de Muerte del Jugador
  async handlePlayerDeath(trapType = 'unknown') {
    if (this.gameState !== 'PLAYING') return;

    this.gameState = 'DYING';
    this.totalDeaths++;
    this.currentLevelDeaths++;
    this.consecutiveCleanLevels = 0; // Se rompe la racha para "Imparable"

    const survivalTime = Math.round(performance.now() - this.levelStartTime);

    // Juice: Sonido seco de pop y explosión de 8-12 píxeles negros
    if (window.soundEngine) window.soundEngine.playDeath();
    if (window.juiceEngine) window.juiceEngine.createDeathBurst(this.player.x, this.player.y);

    // Detener grabación de Ghost Engine
    window.ghostEngine.stopRecording();

    // Notificar en modo Versus Multijugador
    if (this.isVersusMode && window.versusClient) {
      window.versusClient.reportDeath(trapType, this.totalDeaths);
    }

    // Actualizar HUD
    this.updateHud();

    // Persistir muerte en la Base de Datos Real
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch('/api/game/death', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          levelNumber: this.currentLevel,
          trapType,
          positionX: Math.round(this.player.x),
          positionY: Math.round(this.player.y),
          survivalTimeMs: survivalTime
        })
      });
      const data = await res.json();
      if (data.success && data.data.unlockedAchievements && data.data.unlockedAchievements.length > 0) {
        this.displayAchievementNotification(data.data.unlockedAchievements[0]);
      }
    } catch (err) {
      console.error('Error al auditar muerte en backend:', err);
    }

    // Reinicio instantáneo del nivel tras 320ms de efecto de juice
    setTimeout(() => {
      this.loadLevel(this.currentLevel);
    }, 320);
  }

  // Manejo de Superación de Nivel (Tocar Puerta Dorada)
  async handleLevelVictory() {
    if (this.gameState !== 'PLAYING') return;

    this.gameState = 'LEVEL_CLEAR';
    const levelTime = Math.round(performance.now() - this.levelStartTime);

    // Juice: Destello de chispas doradas y Jingle de victoria
    if (window.soundEngine) window.soundEngine.playVictory();
    if (window.juiceEngine) {
      window.juiceEngine.createVictorySparkles(this.exitDoor.x, this.exitDoor.y, this.exitDoor.w, this.exitDoor.h);
      window.juiceEngine.screenShake(4, 150);
    }

    // Detener y guardar Ghost Run
    const ghostFrames = window.ghostEngine.stopRecording();

    // Notificar victoria en modo Versus Multijugador
    if (this.isVersusMode && window.versusClient) {
      window.versusClient.reportVictory(levelTime);
    }

    // Verificar racha de niveles sin muertes (Logro "Imparable")
    if (this.currentLevelDeaths === 0) {
      this.consecutiveCleanLevels++;
      if (this.consecutiveCleanLevels >= 5) {
        this.unlockAchievementClient('unstoppable');
      }
    } else {
      this.consecutiveCleanLevels = 0;
    }

    // Persistir récord de speedrun en BD
    try {
      const token = sessionStorage.getItem('level_trap_token');
      await fetch('/api/speedrun/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          levelNumber: this.currentLevel,
          timeMs: levelTime,
          deaths: this.currentLevelDeaths,
          ghostData: ghostFrames
        })
      });

      // Notificar completado al backend
      const completeRes = await fetch('/api/game/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ levelNumber: this.currentLevel })
      });
      const completeData = await completeRes.json();
      if (completeData.success && completeData.data.unlockedAchievements) {
        completeData.data.unlockedAchievements.forEach((ach) => this.displayAchievementNotification(ach));
      }
    } catch (err) {
      console.error('Error al reportar victoria de nivel:', err);
    }

    // Avanzar al siguiente nivel tras 900ms
    setTimeout(() => {
      if (this.currentLevel < 50) {
        this.start(this.currentLevel + 1);
      } else {
        this.gameState = 'GAME_WON';
        alert('¡FELICIDADES! Has completado los 50 niveles de LEVEL TRAP.');
      }
    }, 900);
  }

  // Desbloquear logro desde el cliente de forma segura y auditada
  async unlockAchievementClient(code) {
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch('/api/achievements/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success && data.data && data.data.isNew) {
        this.displayAchievementNotification(data.data.achievement);
      }
    } catch (e) {
      console.error('Error al desbloquear logro en cliente:', e);
    }
  }

  // Notificación tipo toast de Logro Desbloqueado
  displayAchievementNotification(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <span class="ach-icon">${achievement.icon || '🏆'}</span>
      <div class="ach-info">
        <strong>${achievement.name}</strong>
        <p>${achievement.description}</p>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 50);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Bucle Principal de Juego (60 FPS)
  loop() {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.isTimerRunning && this.gameState === 'PLAYING') {
      this.runElapsedMs = now - this.runStartTime;
      this.levelElapsedMs = now - this.levelStartTime;
      this.updateTimerDisplay();
    }

    this.update(deltaTime);
    this.render();

    // Resetear jumpPressed
    this.inputs.jumpPressed = false;

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update(deltaTimeMs) {
    if (this.gameState !== 'PLAYING') {
      window.juiceEngine.update(deltaTimeMs);
      return;
    }

    // Invertir controles si el Jefe del Nivel 50 tiene activa la distorsión del Caos
    let effectiveInputs = { ...this.inputs };
    if (window.bossManager.chaosControlInverted) {
      const tempLeft = effectiveInputs.left;
      effectiveInputs.left = effectiveInputs.right;
      effectiveInputs.right = tempLeft;
    }

    // 1. Actualizar Jugador
    this.player.update(effectiveInputs, this.platforms, deltaTimeMs);

    // Sincronizar jugador en Versus Multijugador
    if (this.isVersusMode && window.versusClient) {
      window.versusClient.syncPlayer(this.player);

      // Efecto Dominó de Trampas: Al superar la mitad del nivel, envía una trampa al rival
      if (!this.dominoSentInLevel && this.player.x > 620) {
        this.dominoSentInLevel = true;
        window.versusClient.sendDominoTrap('falling_spikes_rain');
      }
    }

    // Auditoría logro "Paranoia Total" (10 saltos en el mismo bloque)
    if (this.player.sameBlockJumpCount >= 10) {
      this.unlockAchievementClient('total_paranoia');
      this.player.sameBlockJumpCount = 0;
    }

    // Auditoría logro "Maestro de la Gravedad" (30s en gravedad invertida)
    if (this.player.invertedGravityTimer >= 30000) {
      this.unlockAchievementClient('gravity_master');
      this.player.invertedGravityTimer = 0;
    }

    // 2. Grabar fotograma de Speedrun Ghost Engine
    window.ghostEngine.recordFrame(this.levelElapsedMs, this.player);

    // 3. Caída fuera de límites (vacío)
    if (this.player.y > 750 || this.player.y < -50) {
      this.handlePlayerDeath('pit_fall');
      return;
    }

    // 4. Actualizar Trampas Silenciosas
    const triggeredTrap = window.trapsEngine.update(this.traps, this.platforms, this.player, deltaTimeMs);
    if (triggeredTrap) {
      this.handlePlayerDeath(triggeredTrap.type);
      return;
    }

    // 5. Verificar colisión con Puertas Falsas (Logro "Impostor")
    for (const fDoor of this.fakeDoors) {
      if (this.player.isCollidingWith(fDoor)) {
        this.fakeDoorsTouchedCount++;
        if (this.fakeDoorsTouchedCount >= 3) {
          this.unlockAchievementClient('impostor');
        }
        this.handlePlayerDeath('fake_door');
        return;
      }
    }

    // 6. Actualizar Jefes de Zona (Niveles 15, 35, 50)
    const bossFatalHit = window.bossManager.update(this.player, this.platforms, deltaTimeMs);
    if (bossFatalHit) {
      this.handlePlayerDeath(bossFatalHit.trapType);
      return;
    }

    // 7. Colisión con Puerta Dorada de Salida
    if (this.player.isCollidingWith(this.exitDoor)) {
      // En niveles de jefe, la puerta sólo se cruza si el jefe ha sido derrotado
      if (this.levelData && this.levelData.isBossLevel) {
        if (window.bossManager.boss && !window.bossManager.boss.isDead) {
          // El jefe aún está vivo, la puerta permanece sellada
          return;
        }
      }
      this.handleLevelVictory();
      return;
    }

    // 8. Actualizar Juice Visual
    window.juiceEngine.update(deltaTimeMs, this.canvas.width, this.canvas.height);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Aplicar Sacudida de Pantalla (Screen Shake)
    ctx.translate(window.juiceEngine.shakeOffsetX, window.juiceEngine.shakeOffsetY);

    // 1. Fondo según la Zona
    ctx.fillStyle = this.theme.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Partículas Ambientales (Zona 2 Carbón/Ceniza)
    if (this.theme.hasEmbers) {
      window.juiceEngine.drawAmbient(ctx);
    }

    // 3. Plataformas
    window.trapsEngine.drawPlatforms(ctx, this.platforms, this.theme);

    // 4. Pinchos y Trampas Silenciosas
    window.trapsEngine.drawTraps(ctx, this.traps, this.theme);

    // 5. Puertas Falsas
    window.trapsEngine.drawFakeDoors(ctx, this.fakeDoors, this.theme);

    // 6. Puerta Dorada de Salida
    window.trapsEngine.drawExitDoor(ctx, this.exitDoor, this.theme);

    // 7. Jefes Finales
    window.bossManager.draw(ctx);

    // 8. Silueta Fantasma (Ghost Engine Speedrun)
    window.ghostEngine.drawGhost(ctx, this.levelElapsedMs);

    // 8.5 Rival en Modo Versus Multijugador
    if (this.isVersusMode && window.versusClient) {
      window.versusClient.drawOpponent(ctx);
    }

    // 9. Jugador (Avatar 28x28 con ojos dinámicos)
    if (this.gameState === 'PLAYING' || this.gameState === 'LEVEL_CLEAR') {
      this.player.draw(ctx);
    }

    // 10. Partículas de Impacto y Juice
    window.juiceEngine.drawParticles(ctx);

    // 11. Pantalla de Victoria Total (Nivel 50 Superado)
    if (this.gameState === 'GAME_WON') {
      this.drawGameWonScreen(ctx);
    }

    ctx.restore();
  }

  drawGameWonScreen(ctx) {
    ctx.fillStyle = 'rgba(12, 13, 18, 0.92)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';

    // Título Retro Dorado
    ctx.fillStyle = '#ffcc00';
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillText('¡VICTORIA TOTAL!', 640, 220);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px "Space Grotesk", sans-serif';
    ctx.fillText('¡Has conquistado los 50 niveles de LEVEL TRAP!', 640, 270);

    // Cuadro de Estadísticas
    ctx.fillStyle = '#1e2333';
    ctx.fillRect(440, 310, 400, 160);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.strokeRect(440, 310, 400, 160);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.fillText('Tiempo Total de Speedrun:', 640, 345);

    ctx.fillStyle = '#10b981';
    ctx.font = '700 24px "Space Grotesk", monospace';
    const timerText = document.getElementById('hud-timer') ? document.getElementById('hud-timer').textContent : '00:00.000';
    ctx.fillText(timerText, 640, 380);

    ctx.fillStyle = '#ef4444';
    ctx.font = '700 18px "Space Grotesk", sans-serif';
    ctx.fillText(`Muertes Totales: ${this.totalDeaths}`, 640, 420);

    ctx.fillStyle = '#fde047';
    ctx.font = '700 16px "Space Grotesk", sans-serif';
    ctx.fillText('👑 Logro Otorgado: "Leyenda de Level Trap"', 640, 450);

    // Botón / Instrucción
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Space Grotesk", sans-serif';
    ctx.fillText('Presiona "R" para iniciar un nuevo Speedrun o consulta el Leaderboard en el HUD', 640, 520);
  }

  // Generar trampa del Efecto Dominó enviada por el rival en Versus
  spawnDominoHazard(trapType = 'falling_spikes_rain') {
    // Generar una lluvia sorpresa de 4 pinchos descendentes sobre la ruta del jugador
    const playerX = this.player.x;
    for (let i = -1; i <= 2; i++) {
      this.traps.push({
        type: 'falling_spikes',
        x: Math.round(playerX + i * 55),
        y: 45,
        w: 24,
        h: 30,
        triggerRangeX: 200,
        fallSpeed: 10,
        isFalling: true
      });
    }
  }

  // Actualizar indicadores del HUD
  updateHud() {
    const lvlEl = document.getElementById('hud-level');
    const deathsEl = document.getElementById('hud-deaths');
    const zoneEl = document.getElementById('hud-zone');

    if (lvlEl) lvlEl.textContent = `Nivel ${this.currentLevel}/50`;
    if (deathsEl) deathsEl.textContent = `Muertes: ${this.totalDeaths}`;
    if (zoneEl) zoneEl.textContent = `Zona: ${this.theme.name}`;
  }

  // Formato $00:00.000$ para cronómetro
  updateTimerDisplay() {
    const timerEl = document.getElementById('hud-timer');
    if (!timerEl) return;

    const ms = Math.floor(this.runElapsedMs);
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
}

window.LevelTrapGame = LevelTrapGame;

