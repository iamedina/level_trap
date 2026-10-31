/**
 * LEVEL TRAP - 3 Boss Battles Engine (Niveles 15, 35 y 50)
 * Mecánicas interactivas de combate, puntos débiles, barras de salud retro y desbloqueo de salida.
 */
class BossManager {
  constructor() {
    this.boss = null;
    this.projectiles = [];
    this.interactiveSwitches = [];
    this.chaosOrbs = [];
    this.lavaHeight = 0;
    this.lavaRiseSpeed = 0.45;
    this.chaosControlInverted = false;
    this.bossDefeated = false;
  }

  initBoss(levelNumber, config) {
    this.projectiles = [];
    this.interactiveSwitches = [];
    this.chaosOrbs = [];
    this.lavaHeight = 0;
    this.chaosControlInverted = false;
    this.bossDefeated = false;

    if (levelNumber === 15) {
      // JEFE 1: La Puerta Vigilante (HP: 3)
      this.boss = {
        level: 15,
        name: 'LA PUERTA VIGILANTE',
        x: 1040,
        y: 420,
        w: 100,
        h: 160,
        hp: 3,
        maxHp: 3,
        invulnerableTimer: 0,
        attackTimer: 0,
        attackInterval: 2400,
        color: '#facc15',
        isDead: false
      };

      // Interruptor de sobrecarga sobre plataforma elevada
      this.interactiveSwitches = [
        { x: 320, y: 541, w: 32, h: 24, active: true, label: 'PWR 1' },
        { x: 600, y: 471, w: 32, h: 24, active: true, label: 'PWR 2' },
        { x: 880, y: 541, w: 32, h: 24, active: true, label: 'PWR 3' }
      ];

    } else if (levelNumber === 35) {
      // JEFE 2: El Titán de Lava (HP: 4)
      this.boss = {
        level: 35,
        name: 'EL TITÁN DE LAVA',
        x: 580,
        y: 60,
        w: 160,
        h: 90,
        hp: 4,
        maxHp: 4,
        speed: 2.2,
        invulnerableTimer: 0,
        attackTimer: 0,
        attackInterval: 1900,
        color: '#ea580c',
        isDead: false
      };

      // 4 Surtidores de Enfriamiento en plataformas elevadas
      this.interactiveSwitches = [
        { x: 290, y: 546, w: 32, h: 24, active: true, label: 'ICE 1' },
        { x: 490, y: 476, w: 32, h: 24, active: true, label: 'ICE 2' },
        { x: 690, y: 406, w: 32, h: 24, active: true, label: 'ICE 3' },
        { x: 890, y: 336, w: 32, h: 24, active: true, label: 'ICE 4' }
      ];

    } else if (levelNumber === 50) {
      // JEFE 3: La Puerta Maestra del Caos (HP: 5)
      this.boss = {
        level: 50,
        name: 'LA PUERTA MAESTRA DEL CAOS',
        x: 595,
        y: 250,
        w: 90,
        h: 150,
        hp: 5,
        maxHp: 5,
        invulnerableTimer: 0,
        gravityTimer: 0,
        gravityInterval: 3600,
        controlTimer: 0,
        controlInterval: 4200,
        attackTimer: 0,
        attackInterval: 1400,
        color: '#a855f7',
        isDead: false
      };

      // 5 Orbes del Núcleo de Caos distribuidos entre suelo y techo
      this.chaosOrbs = [
        { x: 200, y: 160, size: 28, active: true, color: '#ec4899' },
        { x: 1080, y: 160, size: 28, active: true, color: '#8b5cf6' },
        { x: 260, y: 520, size: 28, active: true, color: '#3b82f6' },
        { x: 1020, y: 520, size: 28, active: true, color: '#10b981' },
        { x: 640, y: 80, size: 32, active: true, color: '#e11d48' }
      ];

    } else {
      this.boss = null;
    }
  }

  damageBoss(amount = 1) {
    if (!this.boss || this.boss.isDead || this.boss.invulnerableTimer > 0) return;

    this.boss.hp -= amount;
    this.boss.invulnerableTimer = 1200; // ms de invulnerabilidad tras golpe

    // Juice: Screen Shake potente y sonido de impacto
    if (window.juiceEngine) window.juiceEngine.screenShake(10, 260);
    if (window.soundEngine) window.soundEngine.playTone(180, 'sawtooth', 0.25, window.soundEngine.sfxGain, 0.4);

    if (this.boss.hp <= 0) {
      this.boss.hp = 0;
      this.boss.isDead = true;
      this.bossDefeated = true;

      // Destrucción masiva con partículas doradas
      if (window.juiceEngine) {
        window.juiceEngine.createVictorySparkles(this.boss.x, this.boss.y, this.boss.w, this.boss.h);
        window.juiceEngine.screenShake(14, 450);
      }
      if (window.soundEngine) window.soundEngine.playVictory();

      // Restaurar controles y gravedad en caso del jefe 50
      this.chaosControlInverted = false;
    }
  }

  update(player, platforms, deltaTimeMs) {
    if (!this.boss) return null;

    // Si el jefe ya fue derrotado, no genera daño
    if (this.boss.isDead) {
      if (this.lavaHeight > 0) {
        this.lavaHeight = Math.max(0, this.lavaHeight - 4); // La lava se retira
      }
      return null;
    }

    if (this.boss.invulnerableTimer > 0) {
      this.boss.invulnerableTimer -= deltaTimeMs;
    }

    let fatalHit = null;

    // =========================================================================
    // 1. LÓGICA DE JEFE 1: LA PUERTA VIGILANTE (Nivel 15)
    // =========================================================================
    if (this.boss.level === 15) {
      this.boss.attackTimer += deltaTimeMs;

      // Ráfagas horizontales periódicas de pinchos a dos alturas
      if (this.boss.attackTimer >= this.boss.attackInterval) {
        this.boss.attackTimer = 0;
        this.fireHorizontalSpike(this.boss.x, this.boss.y + 40, -8.0);
        this.fireHorizontalSpike(this.boss.x, this.boss.y + 110, -9.5);
        if (window.juiceEngine) window.juiceEngine.screenShake(4, 120);
      }

      // Colapso del suelo al aproximarse a menos de 380px
      const dist = Math.abs(player.x - this.boss.x);
      if (dist < 380) {
        for (const p of platforms) {
          if (p.y >= 640 && p.x > 450 && p.x < 1000 && !p.isTriggered) {
            p.type = 'fake_floor';
            p.isTriggered = true;
            p.collapseTimer = 160;
          }
        }
      }

      // Colisión con interruptores de sobrecarga para infligir daño
      for (const sw of this.interactiveSwitches) {
        if (sw.active && player.isCollidingWith(sw)) {
          sw.active = false;
          this.damageBoss(1);
          break;
        }
      }

      // Saltar sobre la cabeza de la puerta cuando desciende
      if (player.vy > 0 && player.isCollidingWith({ x: this.boss.x, y: this.boss.y, w: this.boss.w, h: 20 })) {
        player.vy = -10; // Rebote
        this.damageBoss(1);
      }
    }

    // =========================================================================
    // 2. LÓGICA DE JEFE 2: EL TITÁN DE LAVA (Nivel 35)
    // =========================================================================
    else if (this.boss.level === 35) {
      // Persecución horizontal continua desde el techo
      const targetX = player.x - this.boss.w / 2 + player.w / 2;
      this.boss.x += (targetX - this.boss.x) * 0.045;

      // La lava sube progresivamente desde el fondo
      this.lavaHeight += this.lavaRiseSpeed;
      if (player.y + player.h >= 720 - this.lavaHeight) {
        return { type: 'lava', trapType: 'rising_lava' };
      }

      // Bombardeo periódico de fuego volcánico
      this.boss.attackTimer += deltaTimeMs;
      if (this.boss.attackTimer >= this.boss.attackInterval) {
        this.boss.attackTimer = 0;
        this.projectiles.push({
          x: this.boss.x + this.boss.w / 2,
          y: this.boss.y + this.boss.h,
          vx: (Math.random() * 2 - 1) * 3.5,
          vy: 6.8,
          size: 16,
          color: '#f97316'
        });
      }

      // Activar surtidores de hielo para congelar y dañar al Titán
      for (const sw of this.interactiveSwitches) {
        if (sw.active && player.isCollidingWith(sw)) {
          sw.active = false;
          this.damageBoss(1);
          this.lavaHeight = Math.max(0, this.lavaHeight - 60); // Retrocede la lava como recompensa
          break;
        }
      }

      // Colisión mortal con el Titán
      if (player.isCollidingWith(this.boss)) {
        return { type: 'boss_impact', trapType: 'lava_titan_crush' };
      }
    }

    // =========================================================================
    // 3. LÓGICA DE JEFE 3: LA PUERTA MAESTRA DEL CAOS (Nivel 50)
    // =========================================================================
    else if (this.boss.level === 50) {
      this.boss.attackTimer += deltaTimeMs;
      this.boss.gravityTimer += deltaTimeMs;
      this.boss.controlTimer += deltaTimeMs;

      // Inversión en tiempo real de la gravedad del jugador
      if (this.boss.gravityTimer >= this.boss.gravityInterval) {
        this.boss.gravityTimer = 0;
        player.gravityDirection *= -1;
        if (window.juiceEngine) window.juiceEngine.screenShake(6, 180);
      }

      // Inversión dinámica de controles (Izquierda es Derecha y viceversa)
      if (this.boss.controlTimer >= this.boss.controlInterval) {
        this.boss.controlTimer = 0;
        this.chaosControlInverted = !this.chaosControlInverted;
      }

      // Trampas triples periódicas
      if (this.boss.attackTimer >= this.boss.attackInterval) {
        this.boss.attackTimer = 0;
        const baseAngle = (Date.now() / 400) % (Math.PI * 2);
        for (let i = 0; i < 3; i++) {
          const angle = baseAngle + (i * (Math.PI * 2 / 3));
          this.projectiles.push({
            x: this.boss.x + this.boss.w / 2,
            y: this.boss.y + this.boss.h / 2,
            vx: Math.cos(angle) * 5.8,
            vy: Math.sin(angle) * 5.8,
            size: 14,
            color: '#e11d48'
          });
        }
      }

      // Colisión con Orbes del Caos para dañarlo
      for (const orb of this.chaosOrbs) {
        if (orb.active) {
          const orbBox = { x: orb.x - orb.size / 2, y: orb.y - orb.size / 2, w: orb.size, h: orb.size };
          if (player.isCollidingWith(orbBox)) {
            orb.active = false;
            this.damageBoss(1);
            if (window.juiceEngine) window.juiceEngine.createVictorySparkles(orb.x - 20, orb.y - 20, 40, 40);
            break;
          }
        }
      }
    }

    // =========================================================================
    // 4. ACTUALIZACIÓN DE PROYECTILES
    // =========================================================================
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      const projBox = {
        x: proj.x - proj.size / 2,
        y: proj.y - proj.size / 2,
        w: proj.size,
        h: proj.size
      };

      if (player.isCollidingWith(projBox)) {
        fatalHit = { type: 'boss_projectile', trapType: `${this.boss.name}_attack` };
        break;
      }

      if (proj.x < -40 || proj.x > 1320 || proj.y < -40 || proj.y > 760) {
        this.projectiles.splice(i, 1);
      }
    }

    return fatalHit;
  }

  fireHorizontalSpike(x, y, vx) {
    this.projectiles.push({
      x,
      y,
      vx,
      vy: 0,
      size: 18,
      color: '#ef4444'
    });
  }

  draw(ctx) {
    if (!this.boss) return;

    ctx.save();

    // 1. Dibujar Proyectiles
    for (const proj of this.projectiles) {
      ctx.fillStyle = proj.color;
      ctx.fillRect(proj.x - proj.size / 2, proj.y - proj.size / 2, proj.size, proj.size);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(proj.x - proj.size / 2, proj.y - proj.size / 2, proj.size, proj.size);
    }

    // 2. Dibujar Lava Ascendente (Jefe 35)
    if (this.boss.level === 35 && this.lavaHeight > 0) {
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 720 - this.lavaHeight, 1280, this.lavaHeight);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(0, 720 - this.lavaHeight, 1280, 6);
    }

    // 3. Dibujar Interruptores Interactivos (Niveles 15 y 35)
    for (const sw of this.interactiveSwitches) {
      if (sw.active) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);

        // Luz pulsante
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sw.x + 8, sw.y + 6, 16, 12);
      } else {
        ctx.fillStyle = '#475569';
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
      }
    }

    // 4. Dibujar Orbes de Caos (Nivel 50)
    for (const orb of this.chaosOrbs) {
      if (orb.active) {
        ctx.save();
        ctx.fillStyle = orb.color;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Dibujar Cuerpo del Jefe (con parpadeo al ser dañado)
    if (!this.boss.isDead) {
      const isInvulnerable = this.boss.invulnerableTimer > 0;
      const shouldFlash = isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0;

      ctx.fillStyle = shouldFlash ? '#ffffff' : this.boss.color;
      ctx.fillRect(this.boss.x, this.boss.y, this.boss.w, this.boss.h);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.boss.x, this.boss.y, this.boss.w, this.boss.h);

      // Ojos y detalles distintivos
      if (this.boss.level === 15) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.boss.x + 30, this.boss.y + 40, 40, 24);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(this.boss.x + 44, this.boss.y + 46, 12, 12);
      } else if (this.boss.level === 35) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.boss.x + 28, this.boss.y + 24, 28, 16);
        ctx.fillRect(this.boss.x + 104, this.boss.y + 24, 28, 16);
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.boss.x + 36, this.boss.y + 28, 12, 10);
        ctx.fillRect(this.boss.x + 112, this.boss.y + 28, 12, 10);
      } else if (this.boss.level === 50) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.boss.x + 25, this.boss.y + 35, 40, 40);
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.boss.x + 35, this.boss.y + 45, 20, 20);
      }

      // 6. Barra de Salud Retro del Jefe en la parte superior
      this.drawBossHealthBar(ctx);
    }

    ctx.restore();
  }

  drawBossHealthBar(ctx) {
    const barW = 380;
    const barH = 18;
    const barX = (1280 - barW) / 2;
    const barY = 24;

    // Fondo del marco
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(barX - 6, barY - 6, barW + 12, barH + 28);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 6, barY - 6, barW + 12, barH + 28);

    // Título del Jefe
    ctx.fillStyle = '#ffcc00';
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.boss.name} [HP: ${this.boss.hp}/${this.boss.maxHp}]`, 640, barY + 9);

    // Segmentos de vida
    const segmentW = (barW - (this.boss.maxHp - 1) * 4) / this.boss.maxHp;
    for (let i = 0; i < this.boss.maxHp; i++) {
      const segX = barX + i * (segmentW + 4);
      if (i < this.boss.hp) {
        ctx.fillStyle = '#ef4444';
      } else {
        ctx.fillStyle = '#334155';
      }
      ctx.fillRect(segX, barY + 16, segmentW, 10);
    }
  }
}

window.bossManager = new BossManager();
