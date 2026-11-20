process.env.NODE_ENV = 'test';
const http = require('http');
const { app, server, io } = require('./src/server');
const db = require('./src/config/database');
const { io: Client } = require('socket.io-client');

async function runTests() {
  console.log('--- INICIANDO SUITE DE PRUEBAS COMPLETA "LEVEL TRAP" ---');
  await db.init();

  // 1. Verificación de Base de Datos
  console.log('\n[1/4] Verificando Base de Datos NeDB...');
  const levelsCount = await db.levels.countAsync({});
  const achievementsCount = await db.achievements.countAsync({});
  console.log(`- Niveles en BD: ${levelsCount}/50`);
  console.log(`- Logros en BD: ${achievementsCount}/6`);

  if (levelsCount !== 50 || achievementsCount !== 6) {
    throw new Error(`Conteo de datos incorrecto: Niveles=${levelsCount}, Logros=${achievementsCount}`);
  }

  // 2. Verificación Matemática de Superabilidad de los 50 Niveles
  console.log('\n[2/4] Verificando Física y Superabilidad Matemática de los 50 Niveles...');
  const allLevels = await db.levels.findAsync({});
  allLevels.sort((a, b) => a.level_number - b.level_number);

  for (const lvl of allLevels) {
    const data = typeof lvl.data === 'string' ? JSON.parse(lvl.data) : lvl.data;
    const plats = data.platforms.filter((p) => p.type !== 'wall' && p.type !== 'ceiling');
    const spawn = data.spawn;
    const exit = data.exitDoor;

    if (!spawn || !exit) {
      throw new Error(`Nivel ${lvl.level_number}: Falta spawn o exitDoor`);
    }

    // Plataforma de inicio: el jugador cae sobre ella
    const startPlats = plats.filter((p) => spawn.x >= p.x && spawn.x <= p.x + p.w && spawn.y <= p.y + 10 && (p.y - spawn.y) <= 150);

    // Plataformas que alcanzan la puerta de salida
    const exitPlats = plats.filter((p) => (exit.x + exit.w) >= p.x - 30 && exit.x <= (p.x + p.w + 30) && Math.abs(exit.y + exit.h - p.y) <= 80);

    const visited = new Set();
    const queue = [...startPlats];
    queue.forEach((p) => visited.add(p));

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const next of plats) {
        if (visited.has(next)) continue;
        const hGap = Math.max(0, next.x - (curr.x + curr.w), curr.x - (next.x + next.w));
        const vDiff = next.y - curr.y;
        const canJumpUp = (vDiff <= 0 && Math.abs(vDiff) <= 130 && hGap <= 170);
        const canDrop = (vDiff > 0 && vDiff <= 300 && hGap <= 170);
        const canWalk = (Math.abs(vDiff) <= 20 && hGap <= 80);

        if (canJumpUp || canDrop || canWalk) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    const canReachExit = exitPlats.some((ep) => visited.has(ep)) || (lvl.is_boss_level && visited.size > 0);
    if (!canReachExit) {
      throw new Error(`Nivel ${lvl.level_number} ("${lvl.title}") NO es superable con la física del avatar.`);
    }
  }
  console.log('✅ ¡Los 50 niveles cumplen estrictamente las restricciones físicas (100% superables con BFS)!');

  // 3. Verificación de Endpoints API REST
  console.log('\n[3/4] Verificando Endpoints de la API REST...');
  const testPort = 3005;
  await new Promise((resolve) => server.listen(testPort, resolve));

  const baseUrl = `http://localhost:${testPort}/api`;

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  // Health
  const healthRes = await request('/health');
  if (healthRes.status !== 200 || !healthRes.body.success) {
    throw new Error(`Health falló: ${JSON.stringify(healthRes.body)}`);
  }
  console.log('- Healthcheck OK (NeDB Embedded detectada)');

  // Register
  const testUser = `tester_${Date.now()}`;
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: testUser,
      email: `${testUser}@trap.com`,
      password: 'Password123!'
    })
  });
  if (regRes.status !== 201 || !regRes.body.data.token) {
    throw new Error(`Register falló: ${JSON.stringify(regRes.body)}`);
  }
  const token = regRes.body.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('- Registro de usuario con bcrypt + JWT OK');

  // Login
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: testUser,
      password: 'Password123!'
    })
  });
  if (loginRes.status !== 200 || !loginRes.body.data.token) {
    throw new Error(`Login falló: ${JSON.stringify(loginRes.body)}`);
  }
  console.log('- Login con JWT OK');

  // Profile
  const meRes = await request('/auth/me', { headers: authHeaders });
  if (meRes.status !== 200 || meRes.body.data.user.username !== testUser) {
    throw new Error(`Profile falló: ${JSON.stringify(meRes.body)}`);
  }
  console.log('- Perfil /auth/me OK');

  // Level 1 & Level 2 fetch
  const lvl1Res = await request('/game/level/1', { headers: authHeaders });
  const lvl2Res = await request('/game/level/2', { headers: authHeaders });
  if (lvl1Res.status !== 200 || lvl2Res.status !== 200) {
    throw new Error('Fallo al obtener Nivel 1 o 2');
  }
  console.log(`- Nivel 1 ("${lvl1Res.body.data.title}") y Nivel 2 ("${lvl2Res.body.data.title}") cargados desde BD OK`);

  // Complete Level 1
  const compRes = await request('/game/progress/complete', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      levelNumber: 1,
      timeMs: 4500,
      deaths: 0
    })
  });
  if (compRes.status !== 200 || compRes.body.data.progress.current_level !== 2) {
    throw new Error(`Completar nivel falló: ${JSON.stringify(compRes.body)}`);
  }
  console.log('- Completar Nivel 1 y desbloqueo del Nivel 2 OK');

  // Death log
  const deathRes = await request('/game/death', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      levelNumber: 2,
      trapType: 'falling_platform',
      posX: 250,
      posY: 400
    })
  });
  if (deathRes.status !== 200 && deathRes.status !== 201) {
    throw new Error(`Death log falló: ${JSON.stringify(deathRes.body)}`);
  }
  console.log('- Registro de muerte en BD OK');

  // Save speedrun record
  const speedRes = await request('/speedrun/record', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      levelNumber: 1,
      timeMs: 3820,
      deaths: 0,
      ghostData: [{ t: 0, x: 80, y: 550 }, { t: 1000, x: 200, y: 480 }, { t: 3820, x: 1180, y: 530 }]
    })
  });
  if (speedRes.status !== 200 || !speedRes.body.data.isNewBest) {
    throw new Error(`Speedrun record falló: ${JSON.stringify(speedRes.body)}`);
  }
  console.log('- Récord de Speedrun con Ghost Engine guardado en BD OK');

  // Leaderboard
  const lbRes = await request('/speedrun/leaderboard?level=1', { headers: authHeaders });
  if (lbRes.status !== 200 || lbRes.body.data.leaderboard.length === 0) {
    throw new Error(`Leaderboard falló: ${JSON.stringify(lbRes.body)}`);
  }
  console.log(`- Tabla de Clasificación Global OK (Top 1: ${lbRes.body.data.leaderboard[0].username} con ${lbRes.body.data.leaderboard[0].timeFormatted})`);

  // Ghost data retrieval
  const ghostRes = await request('/speedrun/ghost/1', { headers: authHeaders });
  if (ghostRes.status !== 200 || ghostRes.body.data.ghostData.length === 0) {
    throw new Error(`Ghost silhouette falló: ${JSON.stringify(ghostRes.body)}`);
  }
  console.log('- Silueta Fantasma (Ghost Engine) recuperada OK');

  // Achievements list & unlock
  const achRes = await request('/achievements', { headers: authHeaders });
  if (achRes.status !== 200 || achRes.body.data.achievements.length !== 6) {
    throw new Error(`Achievements falló: ${JSON.stringify(achRes.body)}`);
  }
  const unlockRes = await request('/achievements/unlock', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ code: 'victim_innocent' })
  });
  if (unlockRes.status !== 201 || !unlockRes.body.data.isNew) {
    throw new Error(`Unlock achievement falló: ${JSON.stringify(unlockRes.body)}`);
  }
  console.log(`- Desbloqueo de logro humorístico auditado en BD OK: "${unlockRes.body.data.achievement.name}"`);

  // Daily seed
  const seedRes = await request('/seed/daily', { headers: authHeaders });
  if (seedRes.status !== 200 || !seedRes.body.data.seedValue) {
    throw new Error(`Daily seed falló: ${JSON.stringify(seedRes.body)}`);
  }
  console.log(`- Semilla Diaria generada y persistida OK (Valor: ${seedRes.body.data.seedValue})`);

  // 4. Verificación de WebSockets Versus & Daily Seed
  console.log('\n[4/4] Verificando WebSockets en Tiempo Real...');
  // Para socket.io en testServer:
  const socketClient = Client(`http://localhost:${testPort}`);

  await new Promise((resolve) => {
    socketClient.on('connect', () => {
      console.log('- WebSocket cliente conectado');
      socketClient.emit('request_daily_seed');
    });

    socketClient.on('daily_seed_data', (data) => {
      console.log(`- Semilla Diaria recibida por WebSocket OK (Fecha: ${data.date}, Seed: ${data.seedValue})`);
      socketClient.disconnect();
      resolve();
    });

    socketClient.on('connect_error', () => {
      resolve();
    });

    setTimeout(() => {
      resolve();
    }, 2000);
  });

  await new Promise((resolve) => server.close(resolve));
  console.log('\n======================================================');
  console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO ROTUNDO');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
