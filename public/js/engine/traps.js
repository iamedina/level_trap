/**
 * LEVEL TRAP - Silent Traps & Hazards Engine
 * Regla: CERO AVISOS. Todas las trampas se ejecutan en completo silencio.
 */
class TrapsEngine {
  constructor() {
    this.fakeDoorsTouched = new Set();
  }

  reset() {
    this.fakeDoorsTouched.clear();
  }

  update(traps, platforms, player, deltaTimeMs) {
    let triggeredTrap = null;

    // 1. Actualizar Suelos Falsos y Plataformas Encogibles
    for (const plat of platforms) {
      if (plat.type === 'fake_floor' && plat.isTriggered && !plat.isCollapsed) {
        plat.collapseTimer -= deltaTimeMs;
        if (plat.collapseTimer <= 0) {
          plat.isCollapsed = true;
          // Pequeño shake visual silencioso
          if (window.juiceEngine) window.juiceEngine.screenShake(3, 100);
        }
      }

      if (plat.type === 'shrinking' && plat.isShrinking) {
        plat.w = Math.max(10, plat.w - 0.4);
      }
    }

    // 2. Actualizar y Verificar Colisión con Trampas
    for (const trap of traps) {
      if (trap.type === 'falling_spikes') {
        // Detectar si el jugador está debajo para iniciar la caída silenciosa
        if (!trap.isFalling) {
          const distX = Math.abs((player.x + player.w / 2) - (trap.x + trap.w / 2));
          if (distX < (trap.triggerRangeX || 60) && player.y > trap.y) {
            trap.isFalling = true;
          }
        } else {
          trap.y += trap.fallSpeed || 9;
        }

        // Colisión con jugador
        if (this.checkSpikeCollision(player, trap)) {
          triggeredTrap = { type: 'falling_spikes', x: trap.x, y: trap.y };
          break;
        }
      } else if (trap.type === 'rising_spikes') {
        // Pinchos ocultos que suben cuando el jugador se acerca
        const dist = Math.hypot(
          (player.x + player.w / 2) - (trap.x + trap.w / 2),
          (player.y + player.h / 2) - (trap.y + trap.h / 2)
        );

        if (dist < (trap.triggerDist || 60)) {
          trap.isRaised = true;
        }

        if (trap.isRaised && this.checkSpikeCollision(player, trap)) {
          triggeredTrap = { type: 'rising_spikes', x: trap.x, y: trap.y };
          break;
        }
      } else if (trap.type === 'ground_pit_spikes' || trap.type === 'spikes') {
        if (this.checkSpikeCollision(player, trap)) {
          triggeredTrap = { type: 'spikes', x: trap.x, y: trap.y };
          break;
        }
      } else if (trap.type === 'gravity_inverter_zone') {
        // Zona invisible de inversión de gravedad
        if (player.isCollidingWith(trap)) {
          player.gravityDirection = -1;
        } else if (player.gravityDirection === -1 && player.y > 600) {
          player.gravityDirection = 1;
        }
      }
    }

    return triggeredTrap;
  }

  // Colisión geométrica precisa AABB para pinchos triangulares
  checkSpikeCollision(player, spike) {
    // Caja de colisión ligeramente reducida para tolerancia justa
    const hitBox = {
      x: spike.x + 4,
      y: spike.y + 4,
      w: (spike.w || 24) - 8,
      h: (spike.h || 24) - 4
    };
    return player.isCollidingWith(hitBox);
  }

  // Dibujar Plataformas (incluyendo suelos falsos sin diferencias visuales para preservar el factor sorpresa)
  drawPlatforms(ctx, platforms, theme) {
    for (const plat of platforms) {
      if (plat.isCollapsed) continue;

      ctx.fillStyle = theme.platformFill;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

      ctx.strokeStyle = theme.platformStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      // Detalle estético sutil en el borde superior de la plataforma
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(plat.x, plat.y, plat.w, 3);
    }
  }

  // Dibujar Pinchos según la paleta de la zona
  drawTraps(ctx, traps, theme) {
    ctx.fillStyle = theme.spikeFill;

    for (const trap of traps) {
      if (trap.type === 'ground_pit_spikes' || trap.type === 'spikes') {
        this.drawSpikeRow(ctx, trap.x, trap.y, trap.w, trap.h, false);
      } else if (trap.type === 'falling_spikes') {
        // Pinchos estalactita orientados hacia abajo
        this.drawSpikeRow(ctx, trap.x, trap.y, trap.w, trap.h, true);
      } else if (trap.type === 'rising_spikes' && trap.isRaised) {
        this.drawSpikeRow(ctx, trap.x, trap.y, trap.w, trap.h, false);
      }
    }
  }

  drawSpikeRow(ctx, x, y, width, height, inverted = false) {
    const spikeWidth = 20;
    const count = Math.max(1, Math.floor(width / spikeWidth));
    const actualWidth = width / count;

    for (let i = 0; i < count; i++) {
      const sx = x + i * actualWidth;
      ctx.beginPath();
      if (!inverted) {
        // Triángulo apuntando hacia arriba
        ctx.moveTo(sx, y + height);
        ctx.lineTo(sx + actualWidth / 2, y);
        ctx.lineTo(sx + actualWidth, y + height);
      } else {
        // Triángulo apuntando hacia abajo
        ctx.moveTo(sx, y);
        ctx.lineTo(sx + actualWidth / 2, y + height);
        ctx.lineTo(sx + actualWidth, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Dibujar Puerta Dorada de Salida
  drawExitDoor(ctx, door, theme) {
    // Marco exterior
    ctx.fillStyle = theme.doorFrame;
    ctx.fillRect(door.x - 4, door.y - 4, door.w + 8, door.h + 4);

    // Puerta dorada plana
    ctx.fillStyle = theme.doorGold;
    ctx.fillRect(door.x, door.y, door.w, door.h);

    // Pomo de puerta plano
    ctx.fillStyle = '#000000';
    ctx.fillRect(door.x + 6, door.y + door.h / 2 - 2, 4, 6);
  }

  // Dibujar Puertas Falsas (idénticas a la puerta real para el engaño silencioso)
  drawFakeDoors(ctx, fakeDoors, theme) {
    for (const door of fakeDoors) {
      this.drawExitDoor(ctx, door, theme);
    }
  }
}

window.trapsEngine = new TrapsEngine();

