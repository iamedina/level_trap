// LEVEL TRAP - Autenticación y Transición al Juego (CERO MOCKS)
const API_BASE = '/api';
let authToken = sessionStorage.getItem('level_trap_token') || null;
let gameInstance = null;

// Elementos del DOM
const socketStatusEl = document.getElementById('socket-status');
const quickUsernameEl = document.getElementById('quick-username');
const btnQuickLogout = document.getElementById('btn-quick-logout');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const authSection = document.getElementById('auth-section');
const gameWrapper = document.getElementById('game-wrapper');
const authAlert = document.getElementById('auth-alert');

const btnOpenLevels = document.getElementById('btn-open-levels');
const btnOpenAchievements = document.getElementById('btn-open-achievements');
const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
const btnOpenVersus = document.getElementById('btn-open-versus');
const btnOpenDaily = document.getElementById('btn-open-daily');

function showAlert(message, type = 'error') {
  authAlert.textContent = message;
  authAlert.className = `alert alert-${type}`;
  authAlert.classList.remove('hidden');
}

function clearAlert() {
  authAlert.textContent = '';
  authAlert.classList.add('hidden');
}

let globalSocket = null;

function initSocket() {
  try {
    globalSocket = io();
    globalSocket.on('connect', () => {
      if (socketStatusEl) {
        socketStatusEl.textContent = `WebSocket: Conectado (${globalSocket.id.substring(0, 5)})`;
        socketStatusEl.style.color = 'var(--color-success)';
      }
      if (window.versusClient) {
        window.versusClient.init(globalSocket);
      }
    });
    globalSocket.on('disconnect', () => {
      if (socketStatusEl) {
        socketStatusEl.textContent = 'WebSocket: Desconectado';
        socketStatusEl.style.color = 'var(--color-danger)';
      }
    });
  } catch (e) {
    console.error('Socket error:', e);
  }
}

// Verificar sesión existente con /api/auth/me y arrancar juego
async function verifySession() {
  if (!authToken) {
    showAuthView();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showGameView(data.data.user);
    } else {
      logout();
    }
  } catch (err) {
    console.error('Error al verificar sesión:', err);
    showAuthView();
  }
}

// Mostrar vista de autenticación
function showAuthView() {
  authSection.classList.remove('hidden');
  gameWrapper.classList.add('hidden');
  quickUsernameEl.textContent = 'Invitado';
  btnQuickLogout.classList.add('hidden');
  if (btnOpenLevels) btnOpenLevels.classList.add('hidden');
  if (btnOpenAchievements) btnOpenAchievements.classList.add('hidden');
  if (btnOpenLeaderboard) btnOpenLeaderboard.classList.add('hidden');
  if (btnOpenVersus) btnOpenVersus.classList.add('hidden');
  if (btnOpenDaily) btnOpenDaily.classList.add('hidden');
}

// Activar vista de juego real
async function showGameView(user) {
  window.currentUser = user;
  authSection.classList.add('hidden');
  gameWrapper.classList.remove('hidden');

  quickUsernameEl.textContent = `Jugador: ${user.username}`;
  btnQuickLogout.classList.remove('hidden');

  if (btnOpenLevels) btnOpenLevels.classList.remove('hidden');
  if (btnOpenAchievements) btnOpenAchievements.classList.remove('hidden');
  if (btnOpenLeaderboard) btnOpenLeaderboard.classList.remove('hidden');
  if (btnOpenVersus) btnOpenVersus.classList.remove('hidden');
  if (btnOpenDaily) btnOpenDaily.classList.remove('hidden');

  // Obtener progreso persistido del jugador en SQLite
  let targetLevel = 1;
  try {
    const progRes = await fetch(`${API_BASE}/game/progress`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const progData = await progRes.json();
    if (progRes.ok && progData.success) {
      targetLevel = progData.data.progress.current_level || 1;
      const deathsEl = document.getElementById('hud-deaths');
      if (deathsEl) deathsEl.textContent = `Muertes: ${progData.data.progress.total_deaths || 0}`;
    }
  } catch (e) {
    console.error('Error al obtener progreso:', e);
  }

  // Inicializar motor de juego si aún no existe
  if (!gameInstance) {
    gameInstance = new LevelTrapGame();
    window.gameInstance = gameInstance;
    if (window.uiManager) {
      window.uiManager.init(gameInstance);
    }
  }

  // Iniciar audio al primer clic en cualquier parte del juego
  document.body.addEventListener('click', () => {
    if (window.soundEngine) window.soundEngine.ensureContext();
  }, { once: true });

  gameInstance.start(targetLevel);
}

function logout() {
  authToken = null;
  sessionStorage.removeItem('level_trap_token');
  if (gameInstance) {
    if (gameInstance.animationFrameId) {
      cancelAnimationFrame(gameInstance.animationFrameId);
      gameInstance.animationFrameId = null;
    }
    if (window.soundEngine) {
      window.soundEngine.stopBgm();
    }
  }
  showAuthView();
  showAlert('Sesión cerrada.', 'success');
}

// Pestañas
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.remove('hidden');
  formRegister.classList.add('hidden');
  clearAlert();
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.remove('hidden');
  formLogin.classList.add('hidden');
  clearAlert();
});

// Manejo de Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Credenciales inválidas');
    }

    authToken = data.data.token;
    sessionStorage.setItem('level_trap_token', authToken);
    showGameView(data.data.user);
  } catch (err) {
    showAlert(err.message, 'error');
  }
});

// Manejo de Registro
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo crear la cuenta');
    }

    authToken = data.data.token;
    sessionStorage.setItem('level_trap_token', authToken);
    showGameView(data.data.user);
  } catch (err) {
    showAlert(err.message, 'error');
  }
});

btnQuickLogout.addEventListener('click', logout);

window.addEventListener('DOMContentLoaded', () => {
  initSocket();
  verifySession();
});
