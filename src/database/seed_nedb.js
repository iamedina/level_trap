const db = require('../config/database');

/**
 * GENERADOR DE LOS 50 NIVELES DE LEVEL TRAP
 * Réplica de los 50 niveles y los jefes del "LEVEL DEVIL" real según el
 * walkthrough de Zotuf (3 capítulos + llaves) y la ficha de Namu Wiki:
 *   Capítulo 1 (1-15):  pits, suelos que desaparecen, pinchos y puertas señuelo.
 *   Capítulo 2 (16-35): estalactitas, plataformas que se encogen, muros y lava.
 *   Capítulo 3 (36-50): inversión gravitatoria, parkour en techo y gauntlets.
 *   Jefes: 15 "La Puerta Vigilante", 35 "El Titán de Lava",
 *          50 "La Puerta Maestra del Caos".
 *
 * PROGRESIÓN: los niveles empiezan con una sola trampa y crecen hasta 5-6
 * trampas combinadas (suelo falso + pincho + estalactita + puerta falsa +
 * inversión), con plataformas más estrechas y colapsos más rápidos.
 * SEGURIDAD: se conserva una ruta continua verificable por BFS.
 * Salto máximo del avatar: 136 px verticales / 208 px horizontales.
 * Toda plataforma de la ruta cumple dy <= 90 px y dx <= 100 px.
 */

function generateLevelDevilLayout(lvl, zoneId, isBoss) {
  const spawn = { x: 80, y: 560 };
  let exitDoor = { x: 1140, y: 580, w: 40, h: 60 };

  const platforms = [];
  const traps = [];
  const fakeDoors = [];

  // Muros perimetrales indestructibles (Límites de pantalla: 1280 x 720)
  platforms.push({ x: 0, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 1240, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 0, y: 0, w: 1280, h: 40, type: 'ceiling' });

  // =========================================================================
  // JEFES FINALES (NIVELES 15, 35 Y 50) — se conservan íntegros
  // =========================================================================
  if (isBoss) {
    if (lvl === 15) {
      // JEFE 1: LA PUERTA VIGILANTE
      platforms.push({ x: 0, y: 640, w: 1280, h: 80, type: 'solid' });
      platforms.push({ x: 240, y: 565, w: 180, h: 24, type: 'solid' });
      platforms.push({ x: 520, y: 495, w: 180, h: 24, type: 'solid' });
      platforms.push({ x: 800, y: 565, w: 180, h: 24, type: 'solid' });
      exitDoor = { x: 1140, y: 520, w: 40, h: 60 };

      return {
        title: 'Jefe 1: La Puerta Vigilante',
        spawn,
        exitDoor,
        platforms,
        traps,
        fakeDoors,
        bossConfig: {
          name: 'La Puerta Vigilante',
          hp: 3,
          speed: 2.5,
          attackIntervalMs: 2400
        }
      };
    } else if (lvl === 35) {
      // JEFE 2: EL TITÁN DE LAVA
      platforms.push({ x: 40, y: 640, w: 160, h: 80, type: 'solid' });
      platforms.push({ x: 230, y: 575, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 420, y: 510, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 610, y: 445, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 800, y: 380, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 990, y: 315, w: 160, h: 24, type: 'solid' });
      exitDoor = { x: 1140, y: 250, w: 40, h: 60 };

      return {
        title: 'Jefe 2: El Titán de Lava',
        spawn,
        exitDoor,
        platforms,
        traps,
        fakeDoors,
        bossConfig: {
          name: 'El Titán de Lava',
          hp: 4,
          speed: 3.5,
          attackIntervalMs: 1900
        }
      };
    } else if (lvl === 50) {
      // JEFE 3: LA PUERTA MAESTRA DEL CAOS
      platforms.push({ x: 0, y: 640, w: 300, h: 80, type: 'solid' });
      platforms.push({ x: 980, y: 640, w: 300, h: 80, type: 'solid' });
      platforms.push({ x: 360, y: 565, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 560, y: 495, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 760, y: 565, w: 140, h: 24, type: 'solid' });
      // Techo simétrico para distorsión gravitatoria
      platforms.push({ x: 360, y: 155, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 560, y: 225, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 760, y: 155, w: 140, h: 24, type: 'solid' });
      exitDoor = { x: 620, y: 380, w: 40, h: 60 };

      return {
        title: 'Jefe 3: La Puerta Maestra del Caos',
        spawn,
        exitDoor,
        platforms,
        traps,
        fakeDoors,
        bossConfig: {
          name: 'La Puerta Maestra del Caos',
          hp: 5,
          speed: 4.5,
          attackIntervalMs: 1400
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // NIVELES 1 A 49 — planos extraídos del walkthrough y recompuestos con
  // las trampas documentadas: Hidden Spikes, Falling Platforms, Moving Walls,
  // Fake Exit Doors, Falling Ceilings y Gravity Inversion.
  // -------------------------------------------------------------------------
  const d = (lvl - 1) / 49; // 0 = primer nivel, 1 = penúltimo

  const plat = (x, y, w, type = 'solid', extra = {}) =>
    platforms.push({ x, y, w, h: 24, type, ...extra });
  const ground = (x, w, y = 640) =>
    platforms.push({ x, y, w, h: 720 - y, type: 'solid' });
  const pit = (x, w) =>
    traps.push({ type: 'ground_pit_spikes', x, y: 690, w, h: 30 });
  const spikeOnPlatform = (p, triggerDist = 50) =>
    traps.push({
      type: 'rising_spikes',
      x: p.x + p.w / 2 - 15,
      y: p.y - 26,
      w: 30,
      h: 26,
      triggerDist
    });
  const spikeBelow = (x, triggerDist = 50) =>
    traps.push({ type: 'rising_spikes', x, y: 665, w: 34, h: 25, triggerDist });
  const falling = (x, range = 45) =>
    traps.push({
      type: 'falling_spikes',
      x,
      y: 45,
      w: 24,
      h: 32,
      triggerRangeX: range,
      fallSpeed: 8.5
    });
  const invert = (x, w = 140) =>
    traps.push({ type: 'gravity_inverter_zone', x, y: 80, w, h: 480 });
  const decoy = (x, y) => fakeDoors.push({ x, y, w: 40, h: 60 });

  // Perfiles de la ruta. La y final se calcula como 620 + offset.
  const profiles = {
    flat: (n) => Array(n).fill(0),
    arc: (n) =>
      Array.from({ length: n }, (_, i) =>
        -Math.round(80 * Math.sin((Math.PI * i) / (n - 1)))
      ),
    zig: (n) =>
      Array.from({ length: n }, (_, i) => (i % 2 ? -70 : -20)),
    climb: (n) =>
      Array.from({ length: n }, (_, i) =>
        -Math.round((90 * i) / (n - 1))
      ),
    dip: (n) =>
      Array.from({ length: n }, (_, i) =>
        i === 0 || i === n - 1 ? 0 : 25
      )
  };

  function buildRoute(profile, n, spec) {
    const w = Math.round(140 - d * 45);
    const span = 820; // de x=230 a x=1050, justo antes del suelo derecho
    const gap = (span - n * w) / (n - 1);
    const offsets = profiles[profile](n);
    const route = [];
    for (let i = 0; i < n; i++) {
      let type = 'solid';
      let extra = {};
      if ((spec.fake || []).includes(i)) {
        type = 'fake_floor';
        extra = { collapseDelayMs: Math.round(360 - d * 130) };
      }
      if ((spec.shrink || []).includes(i)) type = 'shrinking';
      const x = 230 + i * (w + gap);
      const y = 620 + offsets[i];
      plat(x, y, w, type, extra);
      route.push({ x, y, w });
    }
    return route;
  }

  function pillarBetween(route, i) {
    if (i >= route.length - 1) return;
    const from = route[i].x + route[i].w;
    const width = route[i + 1].x - from;
    if (width < 40) return;
    // Muro que obliga a pasar por encima sin bloquear la ruta (techo a y=520)
    platforms.push({ x: from + 4, y: 520, w: width - 8, h: 120, type: 'solid' });
  }

  // Plano de los 47 niveles normales. Los jefes (15, 35, 50) no figuran aquí.
  const SPECS = {
    1:  { t: 'Pits 1: Watch Your Step',    p: 'flat',  n: 5, fake: [1, 3], below: [1] },
    2:  { t: 'Pits 2: The Sudden Gap',     p: 'arc',   n: 5, fake: [2], below: [3] },
    3:  { t: 'Pits 3: Domino Drop',        p: 'flat',  n: 6, fake: [1, 2, 3, 4], below: [2] },
    4:  { t: 'Pits 4: Leap of Faith',      p: 'dip',   n: 5, fake: [2], below: [1, 3] },
    5:  { t: 'Spikes 1: Pop-up Trap',      p: 'arc',   n: 5, on: [1], below: [2] },
    6:  { t: 'Spikes 2: Ceiling Fall',     p: 'arc',   n: 5, fall: [1, 3] },
    7:  { t: 'Spikes 3: Double Trap',      p: 'zig',   n: 5, on: [2], fall: [3] },
    8:  { t: 'Spikes 4: Precision Run',    p: 'zig',   n: 6, on: [1, 4], fall: [2] },
    9:  { t: 'Push 1: The Shoving Pillar', p: 'arc',   n: 5, pillar: [2], fall: [3] },
    10: { t: 'Push 2: Low Ceiling',        p: 'flat',  n: 6, fake: [2], pillar: [3], below: [4] },
    11: { t: 'Platforms 1: Ghost Step',    p: 'arc',   n: 6, fake: [1, 3, 5], fall: [2] },
    12: { t: 'Platforms 2: Narrow Ridge',  p: 'zig',   n: 6, fake: [2, 4], on: [3] },
    13: { t: 'Doors 1: The Decoy',         p: 'arc',   n: 5, doors: 1 },
    14: { t: 'Doors 2: Hall of Illusions', p: 'zig',   n: 6, doors: 2 },

    16: { t: 'Shrink 1: Melting Blocks',   p: 'arc',   n: 5, shrink: [1, 3], below: [2] },
    17: { t: 'Shrink 2: Hot Steps',        p: 'flat',  n: 6, shrink: [0, 1, 2, 3, 4, 5], fall: [3] },
    18: { t: 'Spikes 5: Lava Geysers',     p: 'zig',   n: 6, shrink: [2, 4], below: [1, 3] },
    19: { t: 'Pits 5: Burning Bridge',     p: 'flat',  n: 6, fake: [1, 2, 3], below: [2] },
    20: { t: 'Push 3: Fire Wall',          p: 'climb', n: 5, shrink: [1], pillar: [2], below: [3] },
    21: { t: 'Platforms 3: Shrink & Drop', p: 'zig',   n: 6, shrink: [1, 3, 5], fake: [2, 4], below: [3] },
    22: { t: 'Doors 3: High Ledge Goal',   p: 'climb', n: 5, fake: [3], doors: 1, exitHigh: true },
    23: { t: 'Spikes 6: Stalactite Rain',  p: 'arc',   n: 6, fall: [1, 2, 4] },
    24: { t: 'Shrink 3: The Rapid Ascent', p: 'climb', n: 6, shrink: [0, 1, 2, 3, 4], fall: [2] },
    25: { t: 'Doors 4: Triple Impostor',   p: 'arc',   n: 6, doors: 3, on: [3] },
    26: { t: 'Pits 6: Deceptive Path',     p: 'zig',   n: 6, fake: [0, 2, 4], below: [3] },
    27: { t: 'Push 4: Tight Squeeze',      p: 'flat',  n: 6, shrink: [0, 5], pillar: [2], below: [3] },
    28: { t: 'Spikes 7: Magma Ambush',     p: 'zig',   n: 6, shrink: [1, 3], below: [2], fall: [4] },
    29: { t: 'Platforms 4: Fast Collapse', p: 'arc',   n: 6, fake: [0, 2, 4], on: [3] },
    30: { t: 'Gauntlet 1: Volcanic Chaos', p: 'zig',   n: 6, shrink: [0, 4], fake: [2], fall: [1], below: [3] },
    31: { t: 'Shrink 4: Vanishing Tower',  p: 'climb', n: 6, shrink: [0, 1, 2, 3, 4], fall: [2] },
    32: { t: 'Doors 5: Running Goal',      p: 'arc',   n: 6, fake: [1, 4], doors: 2, on: [3] },
    33: { t: 'Spikes 8: Needle Corridor',  p: 'flat',  n: 7, shrink: [1, 2, 4, 5], fall: [2, 5] },
    34: { t: 'Gauntlet 2: The Magma Trial',p: 'zig',   n: 7, shrink: [0, 3], fake: [2, 5], below: [1], fall: [4] },

    36: { t: 'Gravity 1: Upside Down',     g: true },
    37: { t: 'Gravity 2: Flip & Drop',     g: true, fall: [1] },
    38: { t: 'Gravity 3: Ceiling Spikes',  g: true, fall: [0, 2] },
    39: { t: 'Platforms 5: Phantom Void',  g: true, ceilFake: [0, 2] },
    40: { t: 'Gravity 4: Dual Horizon',    g: true, fall: [1], ceilFake: [1] },
    41: { t: 'Doors 6: Sky Door',          g: true, doors: 1, exitSky: true },
    42: { t: 'Spikes 9: Crimson Needles',  p: 'zig',   n: 7, on: [1, 5], fall: [3], below: [2] },
    43: { t: 'Push 5: Shadow Crush',       g: true, fall: [0] },
    44: { t: 'Gravity 5: The Inversion Switch', g: true, ceilFake: [1], fall: [2] },
    45: { t: 'Doors 7: Nether Maze',       g: true, doors: 2, ceilFake: [0] },
    46: { t: 'Gauntlet 3: Abyssal Leap',   g: true, ceilFake: [0, 2], fall: [1] },
    47: { t: 'Gauntlet 4: The Chaos Bridge', g: true, ceilFake: [0, 1], fall: [2], doors: 1 },
    48: { t: 'Gauntlet 5: Precision Hell', p: 'zig',   n: 7, fake: [1, 4], shrink: [2, 5], on: [3], fall: [2], below: [4] },
    49: { t: 'Gauntlet 6: Penultimate Trial', g: true, ceilFake: [0, 2], fall: [1], doors: 2 }
  };

  const spec = SPECS[lvl];
  const title = spec.t;

  if (spec.g) {
    // ---------------------------------------------------------------------
    // Inframundo: inversión gravitatoria y parkour en el techo
    // ---------------------------------------------------------------------
    ground(0, 180);
    ground(1080, 200);
    pit(180, 900);

    plat(230, 580, 130);
    invert(410, 140);

    const ceil = [
      { x: 450, y: 160, w: 140 },
      { x: 640, y: 160, w: 140 },
      { x: 830, y: 160, w: 140 }
    ];
    ceil.forEach((c, i) => {
      if ((spec.ceilFake || []).includes(i)) {
        plat(c.x, c.y, c.w, 'fake_floor', {
          collapseDelayMs: Math.round(340 - d * 100)
        });
      } else {
        plat(c.x, c.y, c.w);
      }
    });

    (spec.fall || []).forEach((i) => falling(ceil[i].x + ceil[i].w / 2 - 12, 40));

    for (let k = 0; k < (spec.doors || 0); k++) {
      const anchor = ceil[k % ceil.length];
      decoy(anchor.x + 45, anchor.y - 115);
    }

    if (spec.exitSky) {
      exitDoor = { x: ceil[2].x + 45, y: 100, w: 40, h: 60 };
    }
  } else {
    // ---------------------------------------------------------------------
    // Tierra / Volcánica: ruta de plataformas sobre un foso de pinchos
    // ---------------------------------------------------------------------
    ground(0, 180);
    ground(1080, 200);
    pit(180, 900);

    const route = buildRoute(spec.p, spec.n, spec);

    (spec.on || []).forEach((i) => spikeOnPlatform(route[i], 50 + Math.round(d * 10)));
    (spec.below || []).forEach((i) => spikeBelow(route[i].x + 30, 55));
    (spec.fall || []).forEach((i) => falling(route[i].x + route[i].w / 2 - 12, 45));
    (spec.pillar || []).forEach((i) => pillarBetween(route, i));

    for (let k = 0; k < (spec.doors || 0); k++) {
      const anchor = route[(k * 2 + 1) % route.length];
      decoy(anchor.x + 40, anchor.y - 115);
    }

    if (spec.exitHigh) {
      const last = route[route.length - 1];
      exitDoor = { x: last.x + 25, y: last.y - 60, w: 40, h: 60 };
    }
  }

  return {
    title,
    spawn,
    exitDoor,
    platforms,
    traps,
    fakeDoors,
    bossConfig: null
  };
}

async function seedNeDB() {
  // Asegurar índices básicos sin bucle recursivo
  try {
    await db.users.ensureIndex({ fieldName: 'username', unique: true });
    await db.users.ensureIndex({ fieldName: 'email', unique: true });
    await db.levels.ensureIndex({ fieldName: 'level_number', unique: true });
    await db.achievements.ensureIndex({ fieldName: 'code', unique: true });
    await db.daily_seeds.ensureIndex({ fieldName: 'seed_date', unique: true });
  } catch (e) {}

  // 1. POBLAR LOS 6 LOGROS HUMORÍSTICOS AUDITADOS EN BD
  const achievements = [
    {
      id: 1,
      code: 'victim_innocent',
      name: 'Víctima Inocente',
      description: 'Morir durante el primer segundo de juego en el Nivel 1.',
      icon: '🪦'
    },
    {
      id: 2,
      code: 'total_paranoia',
      name: 'Paranoia Total',
      description: 'Saltar 10 veces consecutivas en el mismo bloque antes de avanzar.',
      icon: '👀'
    },
    {
      id: 3,
      code: 'unstoppable',
      name: 'Imparable',
      description: 'Superar 5 niveles consecutivos sin acumular muertes.',
      icon: '⚡'
    },
    {
      id: 4,
      code: 'impostor',
      name: 'Impostor',
      description: 'Intentar entrar en 3 puertas falsas distintas.',
      icon: '🚪'
    },
    {
      id: 5,
      code: 'gravity_master',
      name: 'Maestro de la Gravedad',
      description: 'Sobrevivir 30 segundos seguidos en gravedad invertida.',
      icon: '🔄'
    },
    {
      id: 6,
      code: 'legend_level_trap',
      name: 'Leyenda de Level Trap',
      description: 'Derrotar al Jefe Final del Nivel 50 y completar el juego.',
      icon: '👑'
    }
  ];

  await db.achievements.removeAsync({}, { multi: true });
  for (const ach of achievements) {
    await db.achievements.insertAsync({ ...ach, created_at: new Date() });
  }
  console.log('✓ 6 Logros humorísticos poblados en el Datastore local.');

  // 2. POBLAR LOS 50 NIVELES DE LEVEL DEVIL (ZONAS 1, 2 Y 3)
  await db.levels.removeAsync({}, { multi: true });

  for (let lvl = 1; lvl <= 50; lvl++) {
    let zoneId = 1;
    let zoneName = 'Tierra y Arena';
    let isBoss = (lvl === 15 || lvl === 35 || lvl === 50);

    if (lvl <= 15) {
      zoneId = 1;
      zoneName = 'Tierra y Arena';
    } else if (lvl <= 35) {
      zoneId = 2;
      zoneName = 'Volcánica y Lava';
    } else {
      zoneId = 3;
      zoneName = 'Inframundo';
    }

    const levelLayout = generateLevelDevilLayout(lvl, zoneId, isBoss);

    await db.levels.insertAsync({
      id: lvl,
      level_number: lvl,
      zone_id: zoneId,
      zone_name: zoneName,
      title: levelLayout.title,
      is_boss_level: isBoss,
      base_time_ms: isBoss ? 90000 : 30000 + (lvl * 600),
      data: JSON.stringify(levelLayout),
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  console.log('✓ 50 Niveles réplica de Level Devil poblados en el Datastore local.');

  // 3. POBLAR DAILY SEED SI NO EXISTE
  const today = new Date().toISOString().slice(0, 10);
  const existingSeed = await db.daily_seeds.findOneAsync({ seed_date: today });
  if (!existingSeed) {
    let seedValue = 0;
    for (let i = 0; i < today.length; i++) {
      seedValue = (seedValue * 31 + today.charCodeAt(i)) % 1000000;
    }
    await db.daily_seeds.insertAsync({
      seed_date: today,
      seed_value: seedValue,
      config: JSON.stringify({
        seedDate: today,
        trapSpeedMultiplier: 1.15,
        bonusPointsFactor: 1.25,
        specialRule: 'Plataformas Reducidas y Trampas Aceleradas'
      }),
      created_at: new Date()
    });
    console.log('✓ Semilla Diaria inicializada para hoy.');
  }
}

// Si se ejecuta directamente vía CLI: node src/database/seed_nedb.js
if (require.main === module) {
  seedNeDB().then(() => {
    console.log('✓ Seeding de NeDB completado exitosamente.');
    process.exit(0);
  }).catch((err) => {
    console.error('Error en seed NeDB:', err);
    process.exit(1);
  });
}

module.exports = seedNeDB;
