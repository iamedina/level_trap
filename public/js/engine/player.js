/**
 * LEVEL TRAP - Player Entity (Avatar 28x28 px con ojos dinámicos)
 */
class Player {
  constructor(spawnX = 80, spawnY = 560) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;
    this.x = spawnX;
    this.y = spawnY;
    this.w = 28;
    this.h = 28;

    this.vx = 0;
    this.vy = 0;

    // Constantes físicas ajustadas al píxel
    this.moveSpeed = 5.2;
    this.acceleration = 1.2;
    this.friction = 0.82;
    this.airFriction = 0.94;
    this.gravity = 0.68;
    this.jumpForce = -13.6;
    this.maxFallSpeed = 15;

    this.isGrounded = false;
    this.wasGrounded = false;
    this.gravityDirection = 1; // 1 = Normal (hacia abajo), -1 = Invertida (hacia arriba)

    // Mecánicas de plataforma responsivas
    this.coyoteTimer = 0;
    this.coyoteMax = 5; // frames de gracia
    this.jumpBuffer = 0;
    this.jumpBufferMax = 6;

    // Mirada dinámica de los ojos
    this.facingDir = 1; // 1 = Derecha, -1 = Izquierda
    this.lookY = 0; // -1 = Arriba, 1 = Abajo, 0 = Frente

    // Squash & Stretch
    this.scaleX = 1;
    this.scaleY = 1;

    // Auditoría para logro "Paranoia Total" (10 saltos en el mismo bloque)
    this.lastGroundedPlatformIndex = -1;
    this.sameBlockJumpCount = 0;
    this.consecutiveNoDeathLevels = 0;
    this.invertedGravityTimer = 0; // ms sobrevividos en gravedad invertida
  }

  reset(spawnX = this.spawnX, spawnY = this.spawnY) {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.gravityDirection = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.invertedGravityTimer = 0;
  }

  update(inputs, platforms, deltaTimeMs) {
    this.wasGrounded = this.isGrounded;

    // 1. Manejo de Coyote Time y Jump Buffer
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteMax;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    if (inputs.jumpPressed) {
      this.jumpBuffer = this.jumpBufferMax;
    } else if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
    }

    // 2. Movimiento horizontal
    let targetVx = 0;
    if (inputs.left) {
      targetVx -= this.moveSpeed;
      this.facingDir = -1;
    }
    if (inputs.right) {
      targetVx += this.moveSpeed;
      this.facingDir = 1;
    }

    // Aceleración y fricción
    if (targetVx !== 0) {
      this.vx += (targetVx - this.vx) * 0.35;
    } else {
      this.vx *= this.isGrounded ? this.friction : this.airFriction;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // 3. Salto con Jump Buffering y Coyote Time
    if (this.jumpBuffer > 0 && this.coyoteTimer > 0) {
      this.vy = this.jumpForce * this.gravityDirection;
      this.jumpBuffer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;

      // Juice: Sonido de salto y Squash vertical
      if (window.soundEngine) window.soundEngine.playJump();
      this.scaleX = 0.75;
      this.scaleY = 1.25;

      // Auditoría logro "Paranoia Total"
      if (this.currentPlatformIndex !== undefined && this.currentPlatformIndex !== -1) {
        if (this.currentPlatformIndex === this.lastGroundedPlatformIndex) {
          this.sameBlockJumpCount++;
        } else {
          this.lastGroundedPlatformIndex = this.currentPlatformIndex;
          this.sameBlockJumpCount = 1;
        }
      }
    }

    // Salto variable: Si el jugador suelta el botón de salto en ascenso, se reduce el impulso
    const isMovingUpwards = this.gravityDirection === 1 ? this.vy < 0 : this.vy > 0;
    if (!inputs.jump && isMovingUpwards) {
      this.vy *= 0.75;
    }

    // 4. Aplicar Gravedad
    this.vy += this.gravity * this.gravityDirection;
    if (this.gravityDirection === 1) {
      if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
    } else {
      if (this.vy < -this.maxFallSpeed) this.vy = -this.maxFallSpeed;
      this.invertedGravityTimer += deltaTimeMs;
    }

    // 5. Mirada dinámica de los ojos
    if (inputs.up) {
      this.lookY = -1;
    } else if (inputs.down) {
      this.lookY = 1;
    } else if (Math.abs(this.vy) > 2) {
      this.lookY = this.vy * this.gravityDirection > 0 ? 1 : -1;
    } else {
      this.lookY = 0;
    }

    // 6. Colisiones AABB y movimiento en X
    this.x += this.vx;
    this.checkHorizontalCollisions(platforms);

    // 7. Colisiones AABB y movimiento en Y
    this.isGrounded = false;
    this.y += this.vy;
    this.checkVerticalCollisions(platforms);

    // Detección de impacto/aterrizaje para efectos de Juice
    if (!this.wasGrounded && this.isGrounded) {
      this.scaleX = 1.25;
      this.scaleY = 0.8;
      if (window.soundEngine) window.soundEngine.playLand();
      if (window.juiceEngine && Math.abs(this.vy) > 8) {
        window.juiceEngine.createLandingDust(this.x, this.y);
      }
    }

    // Retorno suave de Squash & Stretch a la normalidad
    this.scaleX += (1 - this.scaleX) * 0.18;
    this.scaleY += (1 - this.scaleY) * 0.18;
  }

  checkHorizontalCollisions(platforms) {
    for (const plat of platforms) {
      if (plat.isCollapsed) continue;
      if (this.isCollidingWith(plat)) {
        if (this.vx > 0) {
          this.x = plat.x - this.w;
        } else if (this.vx < 0) {
          this.x = plat.x + plat.w;
        }
        this.vx = 0;
      }
    }
  }

  checkVerticalCollisions(platforms) {
    this.currentPlatformIndex = -1;
    for (let i = 0; i < platforms.length; i++) {
      const plat = platforms[i];
      if (plat.isCollapsed) continue;

      if (this.isCollidingWith(plat)) {
        if (this.gravityDirection === 1) {
          // Gravedad normal: cae hacia abajo
          if (this.vy > 0) {
            this.y = plat.y - this.h;
            this.vy = 0;
            this.isGrounded = true;
            this.currentPlatformIndex = i;

            // Trigger silencioso de suelo falso o plataforma encogible
            if (plat.type === 'fake_floor' && !plat.isTriggered) {
              plat.isTriggered = true;
              plat.collapseTimer = plat.collapseDelayMs || 140;
            }
            if (plat.type === 'shrinking') {
              plat.isShrinking = true;
            }
          } else if (this.vy < 0) {
            this.y = plat.y + plat.h;
            this.vy = 0;
          }
        } else {
          // Gravedad invertida: "cae" hacia arriba (al techo)
          if (this.vy < 0) {
            this.y = plat.y + plat.h;
            this.vy = 0;
            this.isGrounded = true;
            this.currentPlatformIndex = i;
          } else if (this.vy > 0) {
            this.y = plat.y - this.h;
            this.vy = 0;
          }
        }
      }
    }
  }

  isCollidingWith(rect) {
    return (
      this.x < rect.x + rect.w &&
      this.x + this.w > rect.x &&
      this.y < rect.y + rect.h &&
      this.y + this.h > rect.y
    );
  }

  draw(ctx) {
    ctx.save();

    // Punto de pivote central para Squash & Stretch
    const centerX = this.x + this.w / 2;
    const centerY = this.y + this.h / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(this.scaleX, this.scaleY);

    // 1. Cuerpo del Avatar: Bloque negro compacto 28x28
    ctx.fillStyle = '#000000';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Borde fino blanco para destacar en fondos oscuros
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // 2. Ojos claros estilizados con seguimiento de dirección
    const eyeWidth = 5;
    const eyeHeight = 8;
    const eyeYOffset = this.lookY === -1 ? -6 : (this.lookY === 1 ? 2 : -2);
    const eyeXOffset = this.facingDir === 1 ? 2 : -4;

    ctx.fillStyle = '#ffffff';

    // Ojo Izquierdo
    ctx.fillRect(-6 + eyeXOffset, eyeYOffset, eyeWidth, eyeHeight);
    // Ojo Derecho
    ctx.fillRect(3 + eyeXOffset, eyeYOffset, eyeWidth, eyeHeight);

    // Pupilas sutiles que refuerzan la dirección
    ctx.fillStyle = '#000000';
    const pupilXOffset = this.facingDir === 1 ? 2 : 0;
    const pupilYOffset = this.lookY === -1 ? 0 : (this.lookY === 1 ? 4 : 2);
    ctx.fillRect(-6 + eyeXOffset + pupilXOffset, eyeYOffset + pupilYOffset, 2, 4);
    ctx.fillRect(3 + eyeXOffset + pupilXOffset, eyeYOffset + pupilYOffset, 2, 4);

    ctx.restore();
  }
}

window.Player = Player;

