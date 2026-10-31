/**
 * LEVEL TRAP - UI & Modal Manager
 * Conecta el HUD, controles táctiles, modales de logros, leaderboard, Versus 1v1 y Daily Seed
 */
class UIManager {
  constructor() {
    this.game = null;
    this.touchEnabled = false;

    // Elementos DOM
    this.hudBar = document.getElementById('game-hud');
    this.canvasContainer = document.getElementById('canvas-container');
    this.touchControls = document.getElementById('touch-controls');
    this.btnToggleTouch = document.getElementById('btn-toggle-touch');
    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.btnOpenAchievements = document.getElementById('btn-open-achievements');
    this.btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    this.btnOpenLevels = document.getElementById('btn-open-levels');
    this.btnOpenVersus = document.getElementById('btn-open-versus');
    this.btnOpenDaily = document.getElementById('btn-open-daily');

    // Modales
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.modalClose = document.getElementById('modal-close');

    this.initEvents();
  }

  init(gameInstance) {
    this.game = gameInstance;
  }

  initEvents() {
    // 1. Toggle Táctil ON/OFF
    if (this.btnToggleTouch) {
      this.btnToggleTouch.addEventListener('click', () => {
        this.touchEnabled = !this.touchEnabled;
        if (this.touchControls) {
          if (this.touchEnabled) {
            this.touchControls.classList.remove('hidden');
            this.btnToggleTouch.textContent = 'Táctil: ON';
            this.btnToggleTouch.classList.add('active');
          } else {
            this.touchControls.classList.add('hidden');
            this.btnToggleTouch.textContent = 'Táctil: OFF';
            this.btnToggleTouch.classList.remove('active');
          }
        }
      });
    }

    // 2. Toggle Mute / Unmute Audio
    if (this.btnToggleAudio) {
      this.btnToggleAudio.addEventListener('click', () => {
        if (window.soundEngine) {
          const isMuted = window.soundEngine.toggleMute();
          this.btnToggleAudio.textContent = isMuted ? '🔊 Mute: ON' : '🔊 Mute: OFF';
          if (isMuted) {
            this.btnToggleAudio.classList.add('muted');
          } else {
            this.btnToggleAudio.classList.remove('muted');
          }
        }
      });
    }

    // 3. Abrir Modal de Logros
    if (this.btnOpenAchievements) {
      this.btnOpenAchievements.addEventListener('click', () => this.showAchievementsModal());
    }

    // 4. Abrir Modal de Leaderboard
    if (this.btnOpenLeaderboard) {
      this.btnOpenLeaderboard.addEventListener('click', () => this.showLeaderboardModal());
    }

    // 5. Abrir Selector de Niveles
    if (this.btnOpenLevels) {
      this.btnOpenLevels.addEventListener('click', () => this.showLevelsModal());
    }

    // 6. Abrir Modal Versus 1v1
    if (this.btnOpenVersus) {
      this.btnOpenVersus.addEventListener('click', () => this.showVersusModal());
    }

    // 7. Abrir Modal Daily Seed
    if (this.btnOpenDaily) {
      this.btnOpenDaily.addEventListener('click', () => this.showDailySeedModal());
    }

    // 8. Cerrar Modal
    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => this.closeModal());
    }
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.closeModal();
      });
    }
  }

  openModal(title, contentHtml) {
    if (!this.modalOverlay) return;
    this.modalTitle.textContent = title;
    this.modalBody.innerHTML = contentHtml;
    this.modalOverlay.classList.remove('hidden');
  }

  closeModal() {
    if (!this.modalOverlay) return;
    this.modalOverlay.classList.add('hidden');
  }

  // =========================================================================
  // MODAL: VERSUS MULTIJUGADOR REAL 1V1 (WEBSOCKETS)
  // =========================================================================
  showVersusModal() {
    const html = `
      <div class="versus-lobby">
        <p class="muted-text">Enfréntate a otro jugador en tiempo real con sincronización de silueta y <strong>Efecto Dominó de Trampas</strong>.</p>
        <div class="versus-status-card" id="versus-status-card">
          <div class="spinner"></div>
          <p id="versus-status-text">Conectando con el servidor de emparejamiento...</p>
        </div>
        <div class="form-group" style="margin-top: 16px;">
          <label for="versus-level-select">Nivel de la Contienda:</label>
          <select id="versus-level-select" class="input-field">
            <option value="5">Nivel 5 - Desafío Inicial (Zona 1)</option>
            <option value="15">Nivel 15 - La Puerta Vigilante (JEFE 1)</option>
            <option value="25">Nivel 25 - Plataformas de Fuego (Zona 2)</option>
            <option value="35">Nivel 35 - El Titán de Lava (JEFE 2)</option>
            <option value="50">Nivel 50 - La Puerta del Caos (JEFE 3)</option>
          </select>
        </div>
        <div class="action-buttons" style="margin-top: 20px;">
          <button id="btn-versus-start" class="btn btn-primary">Buscar Oponente</button>
          <button id="btn-versus-cancel" class="btn btn-secondary hidden">Cancelar Búsqueda</button>
        </div>
      </div>
    `;
    this.openModal('⚔️ MODO VERSUS MULTIJUGADOR (1V1)', html);

    const btnStart = document.getElementById('btn-versus-start');
    const btnCancel = document.getElementById('btn-versus-cancel');
    const lvlSelect = document.getElementById('versus-level-select');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const selectedLvl = parseInt(lvlSelect.value, 10) || 5;
        if (window.versusClient) {
          window.versusClient.joinQueue(selectedLvl);
        }
        btnStart.classList.add('hidden');
        btnCancel.classList.remove('hidden');
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        if (window.versusClient) {
          window.versusClient.leaveQueue();
        }
        btnCancel.classList.add('hidden');
        btnStart.classList.remove('hidden');
        const statusText = document.getElementById('versus-status-text');
        if (statusText) statusText.textContent = 'Búsqueda cancelada.';
      });
    }
  }

  notifyVersusWaiting() {
    const statusText = document.getElementById('versus-status-text');
    if (statusText) {
      statusText.innerHTML = '🔍 Buscando rival en tiempo real... Esperando a que otro jugador ingrese.';
    }
  }

  notifyVersusMatched(opponent, levelNumber) {
    const statusCard = document.getElementById('versus-status-card');
    if (statusCard) {
      statusCard.innerHTML = `
        <div class="versus-matched-banner">
          <span class="text-success" style="font-weight: 700; font-size: 1.1rem;">¡RIVAL ENCONTRADO!</span>
          <p>Te enfrentas a: <strong>${opponent.username}</strong></p>
          <p>Nivel: <strong>${levelNumber}</strong> | ¡La partida comienza ya!</p>
        </div>
      `;
    }
    setTimeout(() => {
      this.closeModal();
    }, 1400);
  }

  showVersusResultModal(isWinner, winnerName, timeMs) {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const millis = timeMs % 1000;
    const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;

    const html = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: ${isWinner ? '#ffcc00' : '#ef4444'}; font-size: 2rem; margin-bottom: 12px;">
          ${isWinner ? '🏆 ¡HAS GANADO LA PARTIDA!' : '💀 DERROTA'}
        </h2>
        <p style="font-size: 1.1rem; margin-bottom: 8px;">Ganador de la carrera: <strong>${winnerName}</strong></p>
        <p class="muted-text">Tiempo registrado: <strong>${timeFormatted}</strong></p>
        <button class="btn btn-primary" style="margin-top: 24px;" onclick="window.uiManager.closeModal()">Continuar</button>
      </div>
    `;
    this.openModal('FIN DE LA PARTIDA VERSUS', html);
  }

  // =========================================================================
  // MODAL: SEMILLA DIARIA (DAILY SEED)
  // =========================================================================
  async showDailySeedModal() {
    this.openModal('🎲 SEMILLA DIARIA (DAILY SEED)', '<p class="loading-text">Consultando semilla del día vía WebSockets...</p>');
    try {
      const res = await fetch('/api/seed/daily');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener semilla');
      }

      const seedInfo = data.data;
      const html = `
        <div class="daily-seed-card">
          <div class="seed-badge">Fecha: <strong>${seedInfo.date}</strong></div>
          <div class="seed-number">Semilla Global: <code>#${seedInfo.seedValue}</code></div>
          <div class="seed-rules">
            <h4>Modificador Especial del Día:</h4>
            <p class="text-accent" style="font-size: 1.05rem;">${seedInfo.config.specialRule || 'Trampas Silenciosas Aceleradas'}</p>
            <p class="muted-text" style="margin-top: 6px;">Multiplicador de velocidad de trampas: <strong>${seedInfo.config.trapSpeedMultiplier || 1.1}x</strong></p>
            <p class="muted-text">Multiplicador de puntos de speedrun: <strong>${seedInfo.config.bonusPointsFactor || 1.2}x</strong></p>
          </div>
          <p class="muted-text" style="font-size: 0.85rem; margin-top: 14px;">Todos los jugadores compiten hoy con exactamente la misma distribución procedural.</p>
          <div class="action-buttons" style="margin-top: 20px;">
            <button id="btn-start-daily" class="btn btn-primary">Jugar Reto Diario</button>
          </div>
        </div>
      `;
      this.modalBody.innerHTML = html;

      const btnStart = document.getElementById('btn-start-daily');
      if (btnStart) {
        btnStart.addEventListener('click', () => {
          if (this.game) {
            this.game.start(1);
            this.closeModal();
            this.game.displayAchievementNotification({
              icon: '🎲',
              name: 'RETO DIARIO ACTIVO',
              description: `Regla activa: ${seedInfo.config.specialRule || 'Competencia Oficial'}`
            });
          }
        });
      }
    } catch (e) {
      this.modalBody.innerHTML = `<p class="error-text">${e.message}</p>`;
    }
  }

  // =========================================================================
  // MODALES ESTÁNDAR: LOGROS, LEADERBOARD, NIVELES
  // =========================================================================
  async showAchievementsModal() {
    this.openModal('LOGROS DE LEVEL TRAP', '<p class="loading-text">Consultando base de datos...</p>');
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch('/api/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar logros');
      }

      const list = data.data.achievements;
      let html = `<div class="achievements-list">`;
      list.forEach((ach) => {
        html += `
          <div class="achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'}">
            <div class="ach-card-icon">${ach.icon || '🏆'}</div>
            <div class="ach-card-content">
              <h4>${ach.name}</h4>
              <p>${ach.description}</p>
              <span class="ach-status">${ach.isUnlocked ? `✅ Desbloqueado (${new Date(ach.unlockedAt).toLocaleDateString()})` : '🔒 Bloqueado'}</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      this.modalBody.innerHTML = html;
    } catch (err) {
      this.modalBody.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  async showLeaderboardModal() {
    this.openModal('TABLA DE CLASIFICACIÓN GLOBAL', '<p class="loading-text">Cargando puntuaciones reales...</p>');
    try {
      const currentLevel = this.game ? this.game.currentLevel : 1;
      const res = await fetch(`/api/speedrun/leaderboard?level=${currentLevel}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al consultar leaderboard');
      }

      const rows = data.data.leaderboard;
      if (rows.length === 0) {
        this.modalBody.innerHTML = `<p class="muted-text">Aún no hay récords registrados para el Nivel ${currentLevel}. ¡Sé el primero en marcar la silueta fantasma!</p>`;
        return;
      }

      let html = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rango</th>
              <th>Jugador</th>
              <th>Tiempo</th>
              <th>Muertes</th>
              <th>Puntuación</th>
            </tr>
          </thead>
          <tbody>
      `;
      rows.forEach((r) => {
        html += `
          <tr>
            <td><span class="rank-badge rank-${r.rank}">#${r.rank}</span></td>
            <td><strong>${r.username}</strong></td>
            <td>${r.timeFormatted}</td>
            <td>${r.deaths}</td>
            <td class="text-accent">${r.score} pts</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
      this.modalBody.innerHTML = html;
    } catch (err) {
      this.modalBody.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  async showLevelsModal() {
    this.openModal('SELECCIÓN DE NIVEL (50 NIVELES)', '<p class="loading-text">Cargando progreso desde SQLite...</p>');
    try {
      const token = sessionStorage.getItem('level_trap_token');
      const res = await fetch('/api/game/levels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener niveles');
      }

      const levels = data.data.levels;
      let html = `<div class="level-grid">`;
      levels.forEach((lvl) => {
        const isCurrent = this.game && this.game.currentLevel === lvl.level_number;
        const bossTag = lvl.is_boss_level ? '👑 JEFE' : '';
        html += `
          <button class="level-cell ${lvl.is_unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}" 
                  data-level="${lvl.level_number}" 
                  ${!lvl.is_unlocked ? 'disabled' : ''}>
            <span class="lvl-num">${lvl.level_number}</span>
            <span class="lvl-zone">Z${lvl.zone_id}</span>
            ${bossTag ? `<span class="lvl-boss">${bossTag}</span>` : ''}
          </button>
        `;
      });
      html += `</div>`;
      this.modalBody.innerHTML = html;

      const buttons = this.modalBody.querySelectorAll('.level-cell.unlocked');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const selectedLvl = parseInt(btn.getAttribute('data-level'), 10);
          if (this.game) {
            this.game.start(selectedLvl);
            this.closeModal();
          }
        });
      });
    } catch (err) {
      this.modalBody.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }
}

window.uiManager = new UIManager();
