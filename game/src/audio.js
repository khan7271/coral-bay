// audio.js — all sound is synthesized with WebAudio. No audio files, no network.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Must be called from a user gesture (click / key) the first time.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    // Engine: a sawtooth through a lowpass, pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filt);
    filt.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: two-tone oscillator, silent until a chase starts.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.startMusic();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  setEngine(speed01, on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.1);
  }

  setSiren(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
  }

  sirenTick(dt) {
    if (!this.ctx || this.sirenGain.gain.value < 0.01) return;
    this.sirenTimer += dt;
    const f = Math.sin(this.sirenTimer * 4.4) > 0 ? 720 : 960;
    this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  }

  // Short noise burst + click = gunshot.
  shot() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.12;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t);
    this.blip(180, 0.06, 'square', 0.25);
  }

  // A thud for crashes and body hits.
  thud() {
    this.blip(70, 0.18, 'sine', 0.5);
  }

  // Two-note chime for pickups.
  pickup() {
    this.blip(660, 0.09, 'sine', 0.3);
    setTimeout(() => this.blip(990, 0.12, 'sine', 0.3), 90);
  }

  // Little arpeggio for mission complete.
  jingle() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.35), i * 110);
    });
  }

  // Low buzz for mission failed / busted.
  buzz() {
    this.blip(140, 0.5, 'sawtooth', 0.3);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Ambient music: a slow, moody loop — Am–F–C–G pads + a walking bass.
  // Chords as (freq, dur) note lists, scheduled one bar at a time.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const chords = [
      [110, 130.8, 164.8], // Am
      [87.3, 110, 130.8], // F
      [130.8, 164.8, 196], // C
      [98, 123.5, 146.8], // G
    ];
    const bass = [55, 43.65, 65.4, 49];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const chord = chords[this.musicStep % 4];
      const b = bass[this.musicStep % 4];
      this.musicStep += 1;
      const t = this.ctx.currentTime;
      for (const f of chord) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.4);
        g.gain.setValueAtTime(0.035, t + 1.6);
        g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + 2.2);
      }
      const bo = this.ctx.createOscillator();
      bo.type = 'sine';
      bo.frequency.value = b;
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.linearRampToValueAtTime(0.07, t + 0.1);
      bg.gain.linearRampToValueAtTime(0.0001, t + 2.0);
      bo.connect(bg);
      bg.connect(this.master);
      bo.start(t);
      bo.stop(t + 2.1);
    }, 2100);
  }
}
