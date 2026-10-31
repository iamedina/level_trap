/**
 * Seed: 50 Niveles de LEVEL TRAP - 100% Superables Garantizados
 * 
 * Reglas de diseño y ergonomía de salto:
 * - Separación horizontal entre plataformas: 40 a 65 px (Max jugador: 208 px)
 * - Altura vertical entre plataformas consecutivas: 40 a 55 px (Max jugador: 136 px)
 * - Ancho de plataformas generoso: 110 a 140 px para aterrizajes seguros
 * - Trampas silenciosas justas: pinchos en fosos y estalactitas con tiempo de reacción
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  await knex('levels').del();

  const levels = [];

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

    const levelData = generateFlawlessLevel(lvl, zoneId, isBoss);

    levels.push({
      level_number: lvl,
      zone_id: zoneId,
      zone_name: zoneName,
      title: title,
      is_boss_level: isBoss,
      base_time_ms: isBoss ? 90000 : 30000 + (lvl * 500),
      data: JSON.stringify(levelData),
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  for (let i = 0; i < levels.length; i += 10) {
    const batch = levels.slice(i, i + 10);
    await knex('levels').insert(batch);
  }
};

function generateFlawlessLevel(lvl, zoneId, isBoss) {
  const spawn = { x: 80, y: 560 };
  const exitDoor = { x: 1160, y: 540, w: 40, h: 60 };

  const platforms = [];
  const traps = [];
  const fakeDoors = [];

  // Paredes y techo del nivel
  platforms.push({ x: 0, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 1240, y: 0, w: 40, h: 720, type: 'wall' });
  platforms.push({ x: 0, y: 0, w: 1280, h: 40, type: 'ceiling' });

  // 1. NIVELES REGULARES (1 a 14, 16 a 34, 36 a 49)
  if (!isBoss) {
    const startPlat = { x: 0, y: 640, w: 180, h: 80, type: 'solid' };
    const endPlat = { x: 1080, y: 640, w: 200, h: 80, type: 'solid' };

    platforms.push(startPlat);
    platforms.push(endPlat);

    // Foso de pinchos en el fondo (castiga caer al vacío entre plataformas)
    traps.push({ type: 'ground_pit_spikes', x: 180, y: 690, w: 900, h: 30 });

    if (lvl === 1) {
      // NIVEL 1: Introductorio con foso ciego para logro "Víctima Inocente"
      const p1 = { x: 240, y: 590, w: 130, h: 24, type: 'solid' };
      const p2 = { x: 430, y: 535, w: 130, h: 24, type: 'solid' };
      const p3 = { x: 620, y: 480, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 320 };
      const p4 = { x: 810, y: 535, w: 130, h: 24, type: 'solid' };
      const p5 = { x: 970, y: 590, w: 120, h: 24, type: 'solid' };

      platforms.push(p1, p2, p3, p4, p5);

    } else if (lvl === 2) {
      // NIVEL 2: 100% SUPERABLE Y FLUIDO
      // Escalones suaves con distancias ergonómicas (dx = 50 px, dy = 50 px)
      const p1 = { x: 230, y: 590, w: 120, h: 24, type: 'solid' };
      const p2 = { x: 400, y: 540, w: 120, h: 24, type: 'solid' };
      const p3 = { x: 570, y: 490, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 320 };
      const p4 = { x: 740, y: 490, w: 120, h: 24, type: 'solid' };
      const p5 = { x: 910, y: 550, w: 120, h: 24, type: 'solid' };

      platforms.push(p1, p2, p3, p4, p5);

      // Trampas silenciosas justas:
      // Pincho emergente en el foso (bajo el salto entre p1 y p2)
      traps.push({
        type: 'rising_spikes',
        x: 355,
        y: 665,
        w: 35,
        h: 25,
        triggerDist: 55
      });

      // Estalactita que cae al acercarse a p3 (da tiempo de cruzar si sigues avanzando)
      traps.push({
        type: 'falling_spikes',
        x: 610,
        y: 45,
        w: 24,
        h: 30,
        triggerRangeX: 50,
        fallSpeed: 8
      });

    } else {
      // NIVELES 3 A 49: Cadena procedural con garantía ergonómica
      const numSteps = 5 + (lvl % 3); // 5, 6 o 7 plataformas
      const totalSpan = 1080 - 180; // 900 px
      const stepDist = totalSpan / (numSteps + 1);

      let prevY = 640;

      for (let s = 1; s <= numSteps; s++) {
        const platW = Math.max(100, 130 - ((lvl % 4) * 6));
        const px = Math.round(180 + s * stepDist - platW / 2);

        // Oscilación suave con dy <= 50 px
        const wave = Math.sin((s * 1.3) + (lvl * 0.75));
        const rawDy = wave * 48; // Max 48 px de salto vertical
        let py = Math.round(prevY - rawDy);

        // Clampear entre 360 y 590 px para visibilidad y comodidad
        py = Math.max(360, Math.min(590, py));

        // Verificación estricta de límites ergonómicos
        if (prevY - py > 55) py = prevY - 55;
        if (py - prevY > 55) py = prevY + 55;

        const isFake = (lvl >= 3 && s % 3 === 0);
        const isShrink = (zoneId >= 2 && s % 2 === 1);

        const plat = {
          x: px,
          y: py,
          w: platW,
          h: 24,
          type: isFake ? 'fake_floor' : (isShrink ? 'shrinking' : 'solid'),
          collapseDelayMs: 300
        };

        platforms.push(plat);
        prevY = py;

        // Trampas silenciosas justas
        if (s % 2 === 0) {
          if (lvl % 3 === 0) {
            traps.push({
              type: 'falling_spikes',
              x: Math.round(px + platW / 2 - 12),
              y: 45,
              w: 24,
              h: 30,
              triggerRangeX: 50,
              fallSpeed: 8.5
            });
          } else {
            traps.push({
              type: 'rising_spikes',
              x: Math.round(px - 40),
              y: 665,
              w: 30,
              h: 25,
              triggerDist: 50
            });
          }
        }
      }

      // Puertas falsas para el logro "Impostor"
      if (lvl >= 4 && lvl % 2 === 0) {
        fakeDoors.push({
          x: Math.round(480 + ((lvl * 31) % 400)),
          y: Math.round(300 - ((lvl * 7) % 60)),
          w: 40,
          h: 60,
          trapEffect: 'instant_explosion'
        });
      }

      // Zona 3 (Inframundo): Gravedad invertida con plataformas espejo en el techo
      if (zoneId === 3 && lvl % 2 === 1) {
        traps.push({
          type: 'gravity_inverter_zone',
          x: 560,
          y: 80,
          w: 120,
          h: 480
        });

        platforms.push({ x: 480, y: 160, w: 140, h: 24, type: 'solid' });
        platforms.push({ x: 680, y: 160, w: 140, h: 24, type: 'solid' });
      }
    }

  // 2. ARENAS DE JEFES TEMÁTICOS (15, 35 y 50)
  } else {
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
  }

  return {
    spawn,
    exitDoor,
    platforms,
    traps,
    fakeDoors,
    bossConfig: isBoss ? {
      name: lvl === 15 ? 'La Puerta Vigilante' : (lvl === 35 ? 'El Titán de Lava' : 'La Puerta Maestra del Caos'),
      hp: lvl === 15 ? 3 : (lvl === 35 ? 4 : 5),
      speed: lvl === 15 ? 2.5 : (lvl === 35 ? 3.5 : 4.5),
      attackIntervalMs: lvl === 15 ? 2400 : (lvl === 35 ? 1900 : 1400)
    } : null
  };
}
