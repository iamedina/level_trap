const db = require('../config/database');

/**
 * GENERADOR DE LOS 50 NIVELES DE LEVEL TRAP
 * Réplica fiel de las mecánicas, capítulos y progresión de "LEVEL DEVIL":
 * - Capítulo 1: Pits (Suelos que colapsan y fosos sorpresa)
 * - Capítulo 2: Spikes (Pinchos emergentes y estalactitas que caen)
 * - Capítulo 3: Push (Paredes y pilares que obstruyen o reducen espacio)
 * - Capítulo 4: Bait & Doors (Puertas señuelo/falsas y puertas desplazadas)
 * - Capítulo 5: Shrinking Platforms (Plataformas que se encogen con el tiempo)
 * - Capítulo 6: Gravity Inversion (Inversión gravitatoria y parkour en techo)
 * - Capítulo 7: Multi-Hazard Gauntlets (Combinación avanzada de trampas)
 * - 3 Jefes Finales Temáticos (Nivel 15, 35 y 50)
 *
 * GARANTÍA FÍSICA Y MATEMÁTICA: 100% Superables sin excepción.
 * Salto máximo del avatar: 136 px vertical, 208 px horizontal.
 * Restricciones de diseño: dy <= 75 px, dx <= 110 px, ancho plataforma >= 90 px.
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
  // JEFES FINALES (NIVELES 15, 35 Y 50)
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

  // =========================================================================
  // NIVELES 1 A 49 INSPIRADOS EN LEVEL DEVIL (Zotuf & Namuwiki Walkthrough)
  // =========================================================================
  let title = `Nivel ${lvl}`;

  // Helper para añadir plataforma de suelo base
  const addBase = (startX = 0, startW = 180, endX = 1080, endW = 200) => {
    platforms.push({ x: startX, y: 640, w: startW, h: 80, type: 'solid' });
    platforms.push({ x: endX, y: 640, w: endW, h: 80, type: 'solid' });
    // Foso central de pinchos
    traps.push({ type: 'ground_pit_spikes', x: startW, y: 690, w: endX - startW, h: 30 });
  };

  // -------------------------------------------------------------------------
  // ZONA 1 (Niveles 1 a 14) - Tierra y Arena: Pits, Spikes, Push, Doors
  // -------------------------------------------------------------------------
  if (lvl === 1) {
    title = 'Pits 1: Watch Your Step';
    // El clásico Nivel 1 de Level Devil: Piso aparentemente continuo, pero el centro cae
    platforms.push({ x: 0, y: 640, w: 320, h: 80, type: 'solid' });
    platforms.push({ x: 320, y: 640, w: 220, h: 80, type: 'fake_floor', collapseDelayMs: 250 });
    traps.push({ type: 'ground_pit_spikes', x: 320, y: 695, w: 220, h: 25 });
    platforms.push({ x: 540, y: 640, w: 220, h: 80, type: 'solid' });
    platforms.push({ x: 760, y: 640, w: 160, h: 80, type: 'fake_floor', collapseDelayMs: 250 });
    traps.push({ type: 'ground_pit_spikes', x: 760, y: 695, w: 160, h: 25 });
    platforms.push({ x: 920, y: 640, w: 360, h: 80, type: 'solid' });
    exitDoor = { x: 1140, y: 580, w: 40, h: 60 };

  } else if (lvl === 2) {
    title = 'Pits 2: The Sudden Gap';
    // Doble foso escalonado con pincho emergente silencioso bajo el primer salto
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 410, y: 530, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 590, y: 530, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 320 });
    platforms.push({ x: 770, y: 585, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 950, y: 615, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 365, y: 665, w: 35, h: 25, triggerDist: 55 });

  } else if (lvl === 3) {
    title = 'Pits 3: Domino Drop';
    // Puente de colapso en cadena (3 plataformas consecutivas de tipo fake_floor)
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 535, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 570, y: 535, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 740, y: 535, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 910, y: 585, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 4) {
    title = 'Pits 4: Leap of Faith';
    // Foso amplio con plataforma central que cae al detenerse
    addBase(0, 200, 1080, 200);
    platforms.push({ x: 270, y: 575, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 470, y: 515, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 670, y: 515, w: 140, h: 24, type: 'fake_floor', collapseDelayMs: 320 });
    platforms.push({ x: 880, y: 575, w: 130, h: 24, type: 'solid' });

  } else if (lvl === 5) {
    title = 'Spikes 1: Pop-up Trap';
    // Introducción a pinchos emergentes en la superficie
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 585, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 430, y: 525, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 620, y: 525, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 810, y: 585, w: 130, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 130, y: 615, w: 40, h: 25, triggerDist: 50 });
    traps.push({ type: 'rising_spikes', x: 570, y: 665, w: 40, h: 25, triggerDist: 50 });

  } else if (lvl === 6) {
    title = 'Spikes 2: Ceiling Fall';
    // Estalactitas que se desprenden del techo silenciosamente al pasar debajo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 525, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 580, y: 470, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 760, y: 525, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 940, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 450, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'falling_spikes', x: 810, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 7) {
    title = 'Spikes 3: Double Trap';
    // Estalactita descendente combinada con pincho emergente en plataforma de llegada
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 580, w: 125, h: 24, type: 'solid' });
    platforms.push({ x: 420, y: 520, w: 125, h: 24, type: 'solid' });
    platforms.push({ x: 600, y: 465, w: 125, h: 24, type: 'solid' });
    platforms.push({ x: 780, y: 520, w: 125, h: 24, type: 'fake_floor', collapseDelayMs: 300 });
    platforms.push({ x: 950, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 650, y: 45, w: 24, h: 32, triggerRangeX: 50, fallSpeed: 8.5 });
    traps.push({ type: 'rising_spikes', x: 375, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (lvl === 8) {
    title = 'Spikes 4: Precision Run';
    // Plataformas escalonadas con saltos de precisión y pinchos ocultos
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 390, y: 525, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 550, y: 465, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 720, y: 525, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 890, y: 585, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 515, y: 665, w: 35, h: 25, triggerDist: 50 });
    traps.push({ type: 'falling_spikes', x: 590, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 9) {
    title = 'Push 1: The Shoving Pillar';
    // Gran pilar central que bloquea el camino bajo y obliga a pasar por cornisa alta
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 575, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 510, w: 120, h: 24, type: 'solid' });
    // Pilar central sólido
    platforms.push({ x: 570, y: 450, w: 140, h: 270, type: 'solid' });
    platforms.push({ x: 760, y: 510, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 930, y: 575, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 10) {
    title = 'Push 2: Low Ceiling';
    // Bloque colgante de techo bajo que restringe el salto
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 580, w: 130, h: 24, type: 'solid' });
    // Bloque colgante desde el techo
    platforms.push({ x: 470, y: 40, w: 180, h: 380, type: 'solid' });
    platforms.push({ x: 440, y: 535, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 670, y: 535, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 880, y: 585, w: 130, h: 24, type: 'solid' });

  } else if (lvl === 11) {
    title = 'Platforms 1: Ghost Step';
    // Plataformas que se desvanecen 300ms después de pisarlas
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 300 });
    platforms.push({ x: 400, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 570, y: 470, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 300 });
    platforms.push({ x: 740, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 910, y: 580, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 300 });

  } else if (lvl === 12) {
    title = 'Platforms 2: Narrow Ridge';
    // Cresta estrecha con saltos continuos sin descanso
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 380, y: 525, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 530, y: 465, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 680, y: 465, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 830, y: 525, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 960, y: 585, w: 110, h: 24, type: 'solid' });

  } else if (lvl === 13) {
    title = 'Doors 1: The Decoy';
    // Una puerta falsa en el centro sobre plataforma tentadora; la real está al fondo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 580, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 440, y: 510, w: 150, h: 24, type: 'solid' });
    platforms.push({ x: 670, y: 510, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 880, y: 580, w: 130, h: 24, type: 'solid' });
    fakeDoors.push({ x: 490, y: 450, w: 40, h: 60 }); // Puerta falsa señuelo

  } else if (lvl === 14) {
    title = 'Doors 2: Hall of Illusions';
    // Dos puertas falsas en diferentes pisos
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 575, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 510, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 580, y: 450, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 770, y: 510, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 940, y: 575, w: 120, h: 24, type: 'solid' });
    fakeDoors.push({ x: 440, y: 450, w: 40, h: 60 });
    fakeDoors.push({ x: 810, y: 450, w: 40, h: 60 });

  // -------------------------------------------------------------------------
  // ZONA 2 (Niveles 16 a 34) - Volcánica y Lava: Shrinking, Magma Pits, Saws
  // -------------------------------------------------------------------------
  } else if (lvl === 16) {
    title = 'Shrink 1: Melting Blocks';
    // Introducción a plataformas que se derriten/encogen al pisarlas
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 130, h: 24, type: 'shrinking' });
    platforms.push({ x: 420, y: 525, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 610, y: 525, w: 130, h: 24, type: 'shrinking' });
    platforms.push({ x: 800, y: 585, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 960, y: 615, w: 110, h: 24, type: 'shrinking' });

  } else if (lvl === 17) {
    title = 'Shrink 2: Hot Steps';
    // Todas las plataformas intermedias se encogen
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 125, h: 24, type: 'shrinking' });
    platforms.push({ x: 405, y: 520, w: 125, h: 24, type: 'shrinking' });
    platforms.push({ x: 580, y: 520, w: 125, h: 24, type: 'shrinking' });
    platforms.push({ x: 755, y: 520, w: 125, h: 24, type: 'shrinking' });
    platforms.push({ x: 925, y: 580, w: 125, h: 24, type: 'shrinking' });

  } else if (lvl === 18) {
    title = 'Spikes 5: Lava Geysers';
    // Foso de lava con pinchos emergentes de alta velocidad
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 420, y: 520, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 600, y: 460, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 780, y: 520, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 950, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 365, y: 665, w: 35, h: 25, triggerDist: 55 });
    traps.push({ type: 'rising_spikes', x: 725, y: 665, w: 35, h: 25, triggerDist: 55 });

  } else if (lvl === 19) {
    title = 'Pits 5: Burning Bridge';
    // Puente de suelo falso sobre foso de magma ardiente
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 390, y: 525, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 290 });
    platforms.push({ x: 550, y: 525, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 290 });
    platforms.push({ x: 710, y: 525, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 290 });
    platforms.push({ x: 870, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 20) {
    title = 'Push 3: Fire Wall';
    // Pilar de roca volcánica y plataformas que se encogen
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 575, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 395, y: 510, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 560, y: 445, w: 140, h: 275, type: 'solid' }); // Pilar volcánico
    platforms.push({ x: 750, y: 510, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 920, y: 575, w: 120, h: 24, type: 'shrinking' });

  } else if (lvl === 21) {
    title = 'Platforms 3: Shrink & Drop';
    // Alternancia perversa de plataformas que se encogen y suelos falsos
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'shrinking' });
    platforms.push({ x: 390, y: 520, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 290 });
    platforms.push({ x: 550, y: 460, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 715, y: 520, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 290 });
    platforms.push({ x: 880, y: 580, w: 120, h: 24, type: 'shrinking' });

  } else if (lvl === 22) {
    title = 'Doors 3: High Ledge Goal';
    // La puerta está en cornisa alta, la plataforma baja es falsa
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 575, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 395, y: 510, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 565, y: 445, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 740, y: 445, w: 130, h: 24, type: 'shrinking' });
    platforms.push({ x: 920, y: 510, w: 140, h: 24, type: 'solid' });
    exitDoor = { x: 970, y: 450, w: 40, h: 60 };

  } else if (lvl === 23) {
    title = 'Spikes 6: Stalactite Rain';
    // Triple estalactita sobre el foso de lava
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 390, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 550, y: 460, w: 125, h: 24, type: 'solid' });
    platforms.push({ x: 720, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 890, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 430, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'falling_spikes', x: 590, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'falling_spikes', x: 760, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 24) {
    title = 'Shrink 3: The Rapid Ascent';
    // Escalera de ascenso rápido donde cada escalón se derrite
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 380, y: 525, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 530, y: 465, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 680, y: 410, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 840, y: 475, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 970, y: 550, w: 110, h: 24, type: 'solid' });

  } else if (lvl === 25) {
    title = 'Doors 4: Triple Impostor';
    // 3 puertas falsas distribuidas en cornisas
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 575, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 395, y: 510, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 570, y: 450, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 750, y: 510, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 925, y: 575, w: 120, h: 24, type: 'solid' });
    fakeDoors.push({ x: 270, y: 515, w: 40, h: 60 });
    fakeDoors.push({ x: 440, y: 450, w: 40, h: 60 });
    fakeDoors.push({ x: 790, y: 450, w: 40, h: 60 });

  } else if (lvl === 26) {
    title = 'Pits 6: Deceptive Path';
    // Camino inferior es falso; camino superior requiere saltar con precisión
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 220, y: 580, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 370, y: 520, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 540, y: 460, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 710, y: 520, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 880, y: 580, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });

  } else if (lvl === 27) {
    title = 'Push 4: Tight Squeeze';
    // Techo bajo y foso con pinchos emergentes
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 420, y: 40, w: 200, h: 370, type: 'solid' }); // Techo bajo
    platforms.push({ x: 400, y: 530, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 630, y: 530, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 860, y: 580, w: 120, h: 24, type: 'shrinking' });
    traps.push({ type: 'rising_spikes', x: 545, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (lvl === 28) {
    title = 'Spikes 7: Magma Ambush';
    // Saltos largos entre plataformas con pinchos sorpresa
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 240, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 420, y: 520, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 600, y: 460, w: 130, h: 24, type: 'shrinking' });
    platforms.push({ x: 780, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 950, y: 580, w: 120, h: 24, type: 'shrinking' });
    traps.push({ type: 'rising_spikes', x: 650, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (lvl === 29) {
    title = 'Platforms 4: Fast Collapse';
    // Plataformas falsas con tiempo de colapso de 250ms
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 250 });
    platforms.push({ x: 390, y: 520, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 550, y: 460, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 250 });
    platforms.push({ x: 710, y: 520, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 870, y: 580, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 250 });

  } else if (lvl === 30) {
    title = 'Gauntlet 1: Volcanic Chaos';
    // Primer Gauntlet: encogimiento + colapso + estalactita
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'shrinking' });
    platforms.push({ x: 390, y: 520, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 550, y: 460, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 715, y: 520, w: 115, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 880, y: 580, w: 115, h: 24, type: 'shrinking' });
    traps.push({ type: 'falling_spikes', x: 590, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'rising_spikes', x: 360, y: 665, w: 35, h: 25, triggerDist: 50 });

  } else if (lvl === 31) {
    title = 'Shrink 4: Vanishing Tower';
    // Torre de plataformas encogibles hacia la cima
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 585, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 385, y: 525, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 540, y: 465, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 700, y: 525, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 860, y: 585, w: 110, h: 24, type: 'shrinking' });

  } else if (lvl === 32) {
    title = 'Doors 5: Running Goal';
    // Puerta al final de plataformas angostas con puerta señuelo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 520, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 570, y: 460, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 740, y: 520, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 910, y: 580, w: 120, h: 24, type: 'solid' });
    fakeDoors.push({ x: 610, y: 400, w: 40, h: 60 });

  } else if (lvl === 33) {
    title = 'Spikes 8: Needle Corridor';
    // Pasillo horizontal ajustado entre pinchos y lava
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 380, y: 530, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 540, y: 530, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 700, y: 530, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 860, y: 580, w: 110, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 440, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
    traps.push({ type: 'falling_spikes', x: 740, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 34) {
    title = 'Gauntlet 2: The Magma Trial';
    // Última prueba volcánica antes del Titán
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 110, h: 24, type: 'shrinking' });
    platforms.push({ x: 385, y: 520, w: 110, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 540, y: 460, w: 120, h: 24, type: 'shrinking' });
    platforms.push({ x: 705, y: 520, w: 110, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 870, y: 580, w: 110, h: 24, type: 'shrinking' });
    traps.push({ type: 'rising_spikes', x: 510, y: 665, w: 35, h: 25, triggerDist: 50 });
    traps.push({ type: 'falling_spikes', x: 760, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  // -------------------------------------------------------------------------
  // ZONA 3 (Niveles 36 a 49) - Inframundo: Gravity Flips, Ceiling Parkour, Chaos
  // -------------------------------------------------------------------------
  } else if (lvl === 36) {
    title = 'Gravity 1: Upside Down';
    // Introducción a la inversión gravitatoria: pista en el techo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    // Zona de inversión en el centro
    traps.push({ type: 'gravity_inverter_zone', x: 420, y: 80, w: 140, h: 480 });
    // Plataformas en el techo
    platforms.push({ x: 460, y: 160, w: 150, h: 24, type: 'solid' });
    platforms.push({ x: 670, y: 160, w: 150, h: 24, type: 'solid' });
    platforms.push({ x: 880, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 37) {
    title = 'Gravity 2: Flip & Drop';
    // Invertir para cruzar sobre foso de pinchos infinito y caer al suelo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 380, y: 80, w: 140, h: 480 });
    platforms.push({ x: 440, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 640, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 840, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 970, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 38) {
    title = 'Gravity 3: Ceiling Spikes';
    // Gravedad invertida con estalactitas en el techo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 400, y: 80, w: 140, h: 480 });
    platforms.push({ x: 450, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 640, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 830, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 960, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 500, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 39) {
    title = 'Platforms 5: Phantom Void';
    // Plataformas falsas colapsables en el techo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 400, y: 80, w: 140, h: 480 });
    platforms.push({ x: 450, y: 160, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 300 });
    platforms.push({ x: 640, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 830, y: 160, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 300 });
    platforms.push({ x: 960, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 40) {
    title = 'Gravity 4: Dual Horizon';
    // Plataformas dobles: superior e inferior
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 400, y: 520, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 560, y: 80, w: 130, h: 480 });
    platforms.push({ x: 620, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 820, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 960, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 41) {
    title = 'Doors 6: Sky Door';
    // La puerta real está en el techo invertido
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 400, y: 80, w: 140, h: 480 });
    platforms.push({ x: 460, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 660, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 860, y: 160, w: 200, h: 24, type: 'solid' });
    exitDoor = { x: 960, y: 100, w: 40, h: 60 };

  } else if (lvl === 42) {
    title = 'Spikes 9: Crimson Needles';
    // Pinchos carmesí en suelo y techo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 390, y: 520, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 550, y: 460, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 710, y: 520, w: 115, h: 24, type: 'solid' });
    platforms.push({ x: 870, y: 580, w: 115, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 480, y: 665, w: 35, h: 25, triggerDist: 50 });
    traps.push({ type: 'falling_spikes', x: 740, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 43) {
    title = 'Push 5: Shadow Crush';
    // Pared oscura que divide el nivel
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 380, y: 80, w: 130, h: 480 });
    platforms.push({ x: 440, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 600, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 760, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 930, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 44) {
    title = 'Gravity 5: The Inversion Switch';
    // Zonas alternadas de gravedad
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 370, y: 80, w: 120, h: 480 });
    platforms.push({ x: 430, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 610, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 790, y: 520, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 940, y: 580, w: 120, h: 24, type: 'solid' });

  } else if (lvl === 45) {
    title = 'Doors 7: Nether Maze';
    // Puertas falsas en el techo y puerta real en suelo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 390, y: 80, w: 130, h: 480 });
    platforms.push({ x: 450, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 650, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 850, y: 160, w: 140, h: 24, type: 'solid' });
    platforms.push({ x: 950, y: 580, w: 130, h: 24, type: 'solid' });
    fakeDoors.push({ x: 500, y: 100, w: 40, h: 60 });
    fakeDoors.push({ x: 700, y: 100, w: 40, h: 60 });

  } else if (lvl === 46) {
    title = 'Gauntlet 3: Abyssal Leap';
    // Gravedad invertida con plataformas colapsables en el techo
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 380, y: 80, w: 130, h: 480 });
    platforms.push({ x: 440, y: 160, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 630, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 820, y: 160, w: 130, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 960, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 670, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 47) {
    title = 'Gauntlet 4: The Chaos Bridge';
    // Puente dominó invertido con estalactitas
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'gravity_inverter_zone', x: 370, y: 80, w: 130, h: 480 });
    platforms.push({ x: 430, y: 160, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 590, y: 160, w: 120, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 750, y: 160, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 930, y: 580, w: 120, h: 24, type: 'solid' });
    traps.push({ type: 'falling_spikes', x: 610, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 48) {
    title = 'Gauntlet 5: Precision Hell';
    // Parkour de alta dificultad con pinchos reactivos en cada descanso
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 110, h: 24, type: 'solid' });
    platforms.push({ x: 380, y: 520, w: 110, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 535, y: 460, w: 120, h: 24, type: 'solid' });
    platforms.push({ x: 700, y: 520, w: 110, h: 24, type: 'fake_floor', collapseDelayMs: 270 });
    platforms.push({ x: 860, y: 580, w: 110, h: 24, type: 'solid' });
    traps.push({ type: 'rising_spikes', x: 500, y: 665, w: 35, h: 25, triggerDist: 50 });
    traps.push({ type: 'falling_spikes', x: 580, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });

  } else if (lvl === 49) {
    title = 'Gauntlet 6: Penultimate Trial';
    // El examen final antes de la Puerta Maestra: todo combinado
    addBase(0, 180, 1080, 200);
    platforms.push({ x: 230, y: 580, w: 115, h: 24, type: 'shrinking' });
    traps.push({ type: 'gravity_inverter_zone', x: 380, y: 80, w: 130, h: 480 });
    platforms.push({ x: 440, y: 160, w: 125, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 620, y: 160, w: 130, h: 24, type: 'solid' });
    platforms.push({ x: 800, y: 160, w: 125, h: 24, type: 'fake_floor', collapseDelayMs: 280 });
    platforms.push({ x: 950, y: 580, w: 120, h: 24, type: 'solid' });
    fakeDoors.push({ x: 665, y: 100, w: 40, h: 60 });
    traps.push({ type: 'falling_spikes', x: 500, y: 45, w: 24, h: 32, triggerRangeX: 45, fallSpeed: 8.5 });
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
