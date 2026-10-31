/**
 * LEVEL TRAP - Web Audio API Sound Engine
 * Sintetizador Chiptune Retro 8-bit Procedural (Cero archivos externos de audio)
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isBgmPlaying = false;
    this.bgmTimer = null;
    this.tempo = 140; // BPM base
    this.currentStep = 0;
    this.isBossMusic = false;

    // Escala pentatónica menor / blues para vibra retro desafiante (A minor)
    this.melodyNotes = [
      220.00, 261.63, 293.66, 329.63, 392.00, // A3, C4, D4, E4, G4
      440.00, 523.25, 587.33, 659.25, 783.99  // A4, C5, D5, E5, G5
    ];

    this.bassNotes = [
      110.00, 130.81, 146.83, 164.81 // A2, C3, D3, E3
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Reproducir nota retro 8-bit cuadrada o triangular
  playTone(freq, type = 'square', duration = 0.1, gainNode = this.sfxGain, volume = 0.3) {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    noteGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // SFX de Salto: Chirp sutil ascendente
  playJump() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // SFX de Aterrizaje: Impacto sutil
  playLand() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // SFX de Muerte: "Pop" seco de 8-bit con caída rápida de tono
  playDeath() {
    if (this.isMuted) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // SFX de Victoria: Jingle corto triunfal arpegiado
  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // Acorde mayor brillante
    notes.forEach((freq, index) => {
      setTimeout(() => {
        if (!this.isMuted && this.ctx) {
          this.playTone(freq, 'triangle', 0.22, this.sfxGain, 0.25);
        }
      }, index * 55);
    });
  }

  // BGM Retro Chiptune en bucle sintetizado
  startBgm(isBoss = false) {
    this.isBossMusic = isBoss;
    this.tempo = isBoss ? 190 : 135; // Acelera en jefes
    if (this.isBgmPlaying) return;

    this.ensureContext();
    this.isBgmPlaying = true;
    this.scheduleBgmTick();
  }

  stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setBossMode(isBoss) {
    this.isBossMusic = isBoss;
    this.tempo = isBoss ? 195 : 135;
  }

  scheduleBgmTick() {
    if (!this.isBgmPlaying) return;

    const secondsPerBeat = 60 / this.tempo;
    const stepDuration = (secondsPerBeat / 2) * 1000; // semicorcheas

    // Patrón de melodía retro procedural
    const step = this.currentStep % 16;

    // Bajo caminante en tiempos fuertes
    if (step % 2 === 0) {
      const bassIndex = (Math.floor(this.currentStep / 4)) % this.bassNotes.length;
      this.playTone(this.bassNotes[bassIndex], 'triangle', 0.12, this.bgmGain, 0.2);
    }

    // Melodía principal
    if (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) {
      const melIndex = (step * 3 + (this.isBossMusic ? 4 : 0)) % this.melodyNotes.length;
      this.playTone(this.melodyNotes[melIndex], 'square', 0.08, this.bgmGain, 0.12);
    }

    // Hi-hat / ruido 8-bit en contratiempos si es jefe
    if (this.isBossMusic && step % 2 === 1) {
      this.playNoiseHit(0.03, 0.08);
    }

    this.currentStep++;
    this.bgmTimer = setTimeout(() => this.scheduleBgmTick(), stepDuration);
  }

  playNoiseHit(duration = 0.04, vol = 0.08) {
    if (this.isMuted || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    whiteNoise.start();
  }
}

// Exportar instancia global
window.soundEngine = new SoundEngine();

