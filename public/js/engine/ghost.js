/**
 * LEVEL TRAP - Ghost Engine for Speedruns
 * Graba y reproduce vectores de silueta fantasma en tiempo real
 */
class GhostEngine {
  constructor() {
    this.recordedFrames = [];
    this.playbackFrames = [];
    this.isRecording = false;
    this.isPlaying = false;
    this.recordInterval = 60; // ms entre muestras
    this.timeSinceLastRecord = 0;
  }

  startRecording() {
    this.recordedFrames = [];
    this.isRecording = true;
    this.timeSinceLastRecord = 0;
  }

  stopRecording() {
    this.isRecording = false;
    return this.recordedFrames;
  }

  recordFrame(currentTimeMs, player) {
    if (!this.isRecording) return;
    this.recordedFrames.push({
      t: Math.round(currentTimeMs),
      x: Math.round(player.x),
      y: Math.round(player.y),
      dir: player.facingDir,
      lookY: player.lookY
    });
  }

  loadGhost(frames) {
    this.playbackFrames = Array.isArray(frames) ? frames : [];
    this.isPlaying = this.playbackFrames.length > 0;
  }

  clearGhost() {
    this.playbackFrames = [];
    this.isPlaying = false;
  }

  drawGhost(ctx, currentTimeMs) {
    if (!this.isPlaying || this.playbackFrames.length === 0) return;

    // Encontrar el fotograma correspondiente al tiempo actual mediante interpolación
    let frame = null;
    for (let i = 0; i < this.playbackFrames.length; i++) {
      if (this.playbackFrames[i].t >= currentTimeMs) {
        frame = this.playbackFrames[i];
        break;
      }
    }

    if (!frame) return;

    ctx.save();
    ctx.globalAlpha = 0.35; // Silueta fantasma traslúcida

    // Cuerpo fantasma
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frame.x, frame.y, 28, 28);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(frame.x, frame.y, 28, 28);

    // Ojos del fantasma
    const eyeY = frame.lookY === -1 ? -6 : (frame.lookY === 1 ? 2 : -2);
    const eyeX = frame.dir === 1 ? 2 : -4;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(frame.x + 14 - 6 + eyeX, frame.y + 14 + eyeY, 4, 6);
    ctx.fillRect(frame.x + 14 + 3 + eyeX, frame.y + 14 + eyeY, 4, 6);

    ctx.restore();
  }
}

window.ghostEngine = new GhostEngine();

