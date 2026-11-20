const db = require('../config/database');

/**
 * Generador Completo de los 50 Niveles de LEVEL TRAP
 * 6 Arquetipos de Nivel, Dificultad Creciente, Obstáculos Múltiples
 * Garantía Matemática y Física de Superabilidad:
 * - dy <= 75 px por salto (Límite del jugador: 136 px)
 * - dx <= 110 px por salto (Límite del jugador: 208 px)
 * - Ancho mínimo de plataforma: 90 px
 */
async function seedNeDB() {
  await db.init();

  // 1. POBLAR LOS 6 LOGROS HUMORÍSTICOS
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

  // 2. POBLAR LOS 50 NIVELES CON 6 ARQUETIPOS Y DIFICULTAD CRECIENTE
  await db.levels.removeAsync({}, { multi: true });

  for (let lvl = 1; lvl <= 50; lvl++) {
    let zoneId = 1;
    let zoneName = 'Tierra y Arena';
    let isBoss = false;
    let title = `Nivel ${lvl}`;

    if (lvl <= 15) {
      zoneId = 1;
      zoneName = 'Tierra y Arena';
      if (lvl === 15) {
        isBoss = true;
        title = 'Jefe 1: La Puerta Vigilante';
      }
    } else if (lvl <= 35) {
      zoneId = 2;
      zoneName = 'Volcánica y Lava';
      if (lvl === 35) {
        isBoss = true;
        title = 'Jefe 2: El Titán de Lava';
      }
    } else {
      zoneId = 3;
      zoneName = 'Inframundo';
      if (lvl === 50) {
        isBoss = true;
        title = 'Jefe 3: La Puerta Maestra del Caos';
      }
    }

    const levelLayout = generateDiverseLevel(lvl, zoneId, isBoss);

    await db.levels.insertAsync({
      id: lvl,
      level_number: lvl,
      zone_id: zoneId,
      zone_name: zoneName,
      title,
      is_boss_level: isBoss,
      base_time_ms: isBoss ? 90000 : 30000 + (lvl * 600),
      data: JSON.stringify(levelLayout),
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  console.log('✓ 50 Niveles diversos y complejos poblados en el Datastore local.');

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

/**
 * Generador de Niveles Ricos y Complejos con 6 Arquetipos
 */
function generateDiverseLevel(lvl, zoneId, isBoss) {
  const spawn = { x: 80, y: 560 };
  const exitDoor = { x: 1160, y: 540, w: 40, h: 60 };

  const platforms = [];
  const traps = [];
  const fakeDoors = [];

  // Muros perimetrales indestructibles
  platforms.push({ x: 0, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 1240, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 0, y: 0, w: 1280, h: 40, type: 'ceiling' });

  // =========================================================================
  // JEFES FINALES DE ZONA (15, 35, 50)
  // =========================================================================
  if (isBoss) {
    if (lvl === 15) {
      // JEFE 1: LA PUERTA VIGILANTE
      platforms.push({ x: 0, y: 640, w: 1280, h: 80, type: 'solid' });
      platforms.push({ x: 240, y: 565, w: 180, h: 24, type: 'solid' });
      platforms.push({ x: 520, y: 495, w: 180, h: 24, type: 'solid' });
      platforms.push({ x: 800, y: 565, w: 180, h: 24, type: 'solid' });
      exitDoor.x = 1140;
      exitDoor.y = 520;
    } else if (lvl === 35) {
      // JEFE 2: EL TITÁN DE LAVA
      platforms.push({ x: 40, y: 640, w: 160, h: 80, type: 'solid' });
      platforms.push({ x: 230, y: 575, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 420, y: 510, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 610, y: 445, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 800, y: 380, w: 140, h: 24, type: 'shrinking' });
      platforms.push({ x: 990, y: 315, w: 160, h: 24, type: 'solid' });
      exitDoor.x = 1140;
      exitDoor.y = 250;
    } else if (lvl === 50) {
      // JEFE 3: LA PUERTA MAESTRA DEL CAOS
      platforms.push({ x: 0, y: 640, w: 300, h: 80, type: 'solid' });
      platforms.push({ x: 980, y: 640, w: 300, h: 80, type: 'solid' });
      platforms.push({ x: 360, y: 565, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 560, y: 495, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 760, y: 565, w: 140, h: 24, type: 'solid' });
      // Techo simétrico para gravedad invertida
      platforms.push({ x: 360, y: 155, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 560, y: 225, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 760, y: 155, w: 140, h: 24, type: 'solid' });
      exitDoor.x = 620;
      exitDoor.y = 380;
    }

    return {
      spawn,
      exitDoor,
      platforms,
      traps,
      fakeDoors,
      bossConfig: {
        name: lvl === 15 ? 'La Puerta Vigilante' : (lvl === 35 ? 'El Titán de Lava' : 'La Puerta Maestra del Caos'),
        hp: lvl === 15 ? 3 : (lvl === 35 ? 4 : 5),
        speed: lvl === 15 ? 2.5 : (lvl === 35 ? 3.5 : 4.5),
        attackIntervalMs: lvl === 15 ? 2400 : (lvl === 35 ? 1900 : 1400)
      }
    };
  }

  // =========================================================================
  // NIVELES 1 Y 2: CALIBRADOS A LA PERFECCIÓN
  // =========================================================================
  if (lvl === 1) {
    // Nivel 1: Foso inicial ciego para el logro "Víctima Inocente"
    platforms.push({ x: 0, y: 640, w: 160, h: 80, type: 'solid' });
    traps.push({ type: 'ground_pit_spikes', x: 160, y: 680, w: 80, h: 40 });

    platforms.push({ x: 240, y: 590, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 420, y: 535, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 600, y: 480, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 320 });
    platforms.push({ x: 780, y: 535, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 950, y: 590, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 1080, y: 640, w: 200, h: 80, type: 'solid' });

    traps.push({ type: 'ground_pit_spikes', x: 240, y: 690, w: 840, h: 30 });
    return { spawn, exitDoor, platforms, traps, fakeDoors, bossConfig: null };
  }

  if (lvl === 2) {
    // Nivel 2: 100% Superable, saltos continuos sin trampas imposibles
    platforms.push({ x: 0, y: 640, w: 180, h: 80, type: 'solid' });
    platforms.push({ x: 230, y: 590, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 540, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 570, y: 490, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 320 });
    platforms.push({ x: 740, y: 490, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 910, y: 550, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 1080, y: 640, w: 200, h: 80, type: 'solid' });

    // Foso con pinchos inferior
    traps.push({ type: 'ground_pit_spikes', x: 180, y: 690, w: 900, h: 30 });

    // Pincho emergente en el foso (bajo el salto entre p1 y p2)
    traps.push({ type: 'rising_spikes', x: 355, y: 665, w: 35, h: 25, triggerDist: 50 });

    // Estalactita que cae al pasar por debajo
    traps.push({ type: 'falling_spikes', x: 610, y: 45, w: 24, h: 30, triggerRangeX: 45, fallSpeed: 8 });

    return { spawn, exitDoor, platforms, traps, fakeDoors, bossConfig: null };
  }

  // =========================================================================
  // ARQUETIPOS DE NIVELES (3 a 49) CON MÚLTIPLES OBSTÁCULOS
  // =========================================================================
  const startPlat = { x: 0, y: 640, w: 180, h: 80, type: 'solid' };
  const endPlat = { x: 1080, y: 640, w: 200, h: 80, type: 'solid' };
  platforms.push(startPlat, endPlat);

  // Foso general inferior
  traps.push({ type: 'ground_pit_spikes', x: 180, y: 690, w: 900, h: 30 });

  // Arquetipo según el nivel (rotación dinámica de 5 arquetipos)
  const archetype = lvl % 5;

  if (archetype === 0) {
    // ARQUETIPO 1: ASCENSO VERTICAL EN ZIGZAG Y DESCENSO DE PRECISIÓN (Tower Climber)
    // Sube hasta una cornisa alta (y: 380) y desciende gradualmente
    const steps = [
      { x: 230, y: 585, w: 110, type: 'solid' },
      { x: 390, y: 525, w: 110, type: 'solid' },
      { x: 550, y: 465, w: 110, type: (lvl >= 6 ? 'fake_floor' : 'solid'), collapseDelayMs: 300 },
      { x: 710, y: 410, w: 120, type: 'solid' }, // Cima
      { x: 880, y: 475, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'solid') },
      { x: 1000, y: 550, w: 100, type: 'solid' }
    ];

    steps.forEach((s) => platforms.push({ ...s, h: 24 }));

    // Trampas: Estalactitas sobre la cima
    traps.push({ type: 'falling_spikes', x: 740, y: 45, w: 24, h: 30, triggerRangeX: 50, fallSpeed: 8.5 });
    traps.push({ type: 'rising_spikes', x: 500, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (archetype === 1) {
    // ARQUETIPO 2: EL PUENTE DE COLAPSO VELOZ (Crumbling Domino Chain)
    // Varias plataformas consecutivas de tipo fake_floor con tiempo justo de salto
    const steps = [
      { x: 220, y: 580, w: 115, type: 'solid' },
      { x: 385, y: 525, w: 115, type: 'fake_floor', collapseDelayMs: 300 },
      { x: 550, y: 480, w: 115, type: 'fake_floor', collapseDelayMs: 300 },
      { x: 715, y: 480, w: 115, type: 'fake_floor', collapseDelayMs: 300 },
      { x: 880, y: 535, w: 115, type: 'solid' },
      { x: 1000, y: 585, w: 100, type: 'solid' }
    ];

    steps.forEach((s) => platforms.push({ ...s, h: 24 }));

    // Trampa: Doble estalactita durante el puente falso
    traps.push({ type: 'falling_spikes', x: 430, y: 45, w: 24, h: 30, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'falling_spikes', x: 760, y: 45, w: 24, h: 30, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (archetype === 2) {
    // ARQUETIPO 3: EL CAÑÓN DE AGUJAS Y ESTALACTITAS (Precision Corridor)
    // Plataformas flotantes centrales con pinchos en techo y foso
    const steps = [
      { x: 240, y: 580, w: 120, type: 'solid' },
      { x: 410, y: 520, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'solid') },
      { x: 570, y: 465, w: 110, type: 'solid' },
      { x: 730, y: 515, w: 110, type: 'fake_floor', collapseDelayMs: 300 },
      { x: 900, y: 565, w: 120, type: 'solid' }
    ];

    steps.forEach((s) => platforms.push({ ...s, h: 24 }));

    // Múltiples estalactitas en el techo
    traps.push({ type: 'falling_spikes', x: 300, y: 45, w: 24, h: 30, triggerRangeX: 50, fallSpeed: 8 });
    traps.push({ type: 'falling_spikes', x: 620, y: 45, w: 24, h: 30, triggerRangeX: 50, fallSpeed: 8 });
    traps.push({ type: 'falling_spikes', x: 930, y: 45, w: 24, h: 30, triggerRangeX: 50, fallSpeed: 8 });
    traps.push({ type: 'rising_spikes', x: 500, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (archetype === 3) {
    // ARQUETIPO 4: LABERINTO CON PUERTAS SEÑUELO Y RUTA OCULTA (Deceptive Maze)
    const steps = [
      { x: 230, y: 580, w: 110, type: 'solid' },
      { x: 390, y: 520, w: 110, type: 'solid' },
      { x: 550, y: 460, w: 110, type: 'solid' },
      { x: 710, y: 460, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'fake_floor'), collapseDelayMs: 300 },
      { x: 870, y: 520, w: 110, type: 'solid' },
      { x: 990, y: 580, w: 100, type: 'solid' }
    ];

    steps.forEach((s) => platforms.push({ ...s, h: 24 }));

    // Puerta falsa en una plataforma señuelo alta (alimenta logro "Impostor")
    const fakeDoorX = 560;
    const fakeDoorY = 400;
    fakeDoors.push({
      x: fakeDoorX,
      y: fakeDoorY,
      w: 40,
      h: 60,
      trapEffect: 'instant_explosion'
    });

    traps.push({ type: 'rising_spikes', x: 320, y: 665, w: 35, h: 25, triggerDist: 50 });
    traps.push({ type: 'falling_spikes', x: 730, y: 45, w: 24, h: 30, triggerRangeX: 45, fallSpeed: 8.5 });

  } else {
    // ARQUETIPO 5: PARKOUR DE GRAVEDAD / LAVA MENGUANTE (High Intensity)
    const isUnderworld = (zoneId === 3);

    const steps = [
      { x: 230, y: 580, w: 110, type: 'solid' },
      { x: 390, y: 520, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'solid') },
      { x: 550, y: 470, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'solid') },
      { x: 710, y: 470, w: 110, type: 'fake_floor', collapseDelayMs: 300 },
      { x: 870, y: 525, w: 110, type: (zoneId >= 2 ? 'shrinking' : 'solid') },
      { x: 990, y: 580, w: 100, type: 'solid' }
    ];

    steps.forEach((s) => platforms.push({ ...s, h: 24 }));

    if (isUnderworld) {
      // Inversor de gravedad con pista en el techo
      traps.push({ type: 'gravity_inverter_zone', x: 550, y: 60, w: 120, h: 500 });
      platforms.push({ x: 480, y: 160, w: 140, h: 24, type: 'solid' });
      platforms.push({ x: 680, y: 160, w: 140, h: 24, type: 'solid' });
    } else {
      traps.push({ type: 'rising_spikes', x: 480, y: 665, w: 35, h: 25, triggerDist: 50 });
      traps.push({ type: 'falling_spikes', x: 740, y: 45, w: 24, h: 30, triggerRangeX: 45, fallSpeed: 8.5 });
    }
  }

  return { spawn, exitDoor, platforms, traps, fakeDoors, bossConfig: null };
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
