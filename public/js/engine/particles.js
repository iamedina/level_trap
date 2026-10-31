/**
 * LEVEL TRAP - Juice Visual & Particles Engine
 * Screen shake, death burst, victory sparkles, landing dust, ambient embers
 */
class JuiceEngine {
  constructor() {
    this.particles = [];
    this.ambientParticles = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  // Activar sacudida discreta de pantalla
  screenShake(intensity = 6, durationMs = 180) {
    this.shakeIntensity = intensity;
    this.shakeDuration = durationMs;
  }

  // Explosión limpia de 8 a 12 píxeles negros al morir
  createDeathBurst(x, y) {
    this.screenShake(8, 220);
    const count = Math.floor(Math.random() * 5) + 8; // 8 a 12 partículas
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const speed = Math.random() * 5 + 3;
      this.particles.push({
        x: x + 14,
        y: y + 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() > 0.5 ? 5 : 4,
        color: '#000000',
        borderColor: '#ffffff',
        alpha: 1,
        gravity: 0.35,
        drag: 0.98,
        life: 1.0,
        decay: 0.035
      });
    }
  }

  // Destello de Victoria: Ráfaga discreta de destellos dorados
  createVictorySparkles(x, y, w, h) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 4 + 3,
        color: Math.random() > 0.3 ? '#ffcc00' : '#ffffff',
        borderColor: null,
        alpha: 1,
        gravity: 0.15,
        drag: 0.96,
        life: 1.0,
        decay: 0.025
      });
    }
  }

  // Polvo de aterrizaje: Partículas sutiles en caídas altas
  createLandingDust(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const dir = (i % 2 === 0 ? 1 : -1) * (Math.random() * 2.5 + 1);
      this.particles.push({
        x: x + 14 + (Math.random() * 10 - 5),
        y: y + 28,
        vx: dir,
        vy: -(Math.random() * 1.5 + 0.5),
        size: Math.random() * 3 + 2,
        color: 'rgba(150, 150, 150, 0.7)',
        borderColor: null,
        alpha: 0.8,
        gravity: 0.1,
        drag: 0.92,
        life: 1.0,
        decay: 0.05
      });
    }
  }

  // Inicializar o reponer partículas de ceniza/carbón flotante para Zona 2
  initZone2Embers(canvasWidth, canvasHeight, count = 25) {
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        vx: Math.random() * 0.8 - 0.4,
        vy: -(Math.random() * 0.8 + 0.4),
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.4 ? 'rgba(234, 88, 12, 0.4)' : 'rgba(70, 60, 60, 0.6)',
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  clearAmbient() {
    this.ambientParticles = [];
  }

  update(deltaTimeMs, canvasWidth = 1280, canvasHeight = 720) {
    // 1. Actualizar Screen Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaTimeMs;
      const factor = Math.max(0, this.shakeDuration / 200);
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity * factor;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity * factor;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 2. Actualizar Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 3. Actualizar Partículas Ambientales (Zona 2)
    for (const p of this.ambientParticles) {
      p.wobble += 0.04;
      p.x += p.vx + Math.sin(p.wobble) * 0.4;
      p.y += p.vy;

      if (p.y < 0) {
        p.y = canvasHeight + 10;
        p.x = Math.random() * canvasWidth;
      }
      if (p.x < 0) p.x = canvasWidth;
      if (p.x > canvasWidth) p.x = 0;
    }
  }

  drawAmbient(ctx) {
    for (const p of this.ambientParticles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      if (p.borderColor) {
        ctx.strokeStyle = p.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    }
  }
}

window.juiceEngine = new JuiceEngine();

