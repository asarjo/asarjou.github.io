// Web Audio synthesiser and look-ahead sequencer. Every sound is generated
// on the fly: drums from noise and pitch sweeps, the rest from oscillators.
import { mtof } from './music.js';

const FORMANTS = {
  a: [[800, 1], [1150, 0.5], [2900, 0.25]],
  e: [[400, 1], [1700, 0.45], [2600, 0.25]],
  i: [[300, 1], [2200, 0.35], [3000, 0.2]],
  o: [[450, 1], [800, 0.6], [2830, 0.15]],
  u: [[325, 1], [700, 0.5], [2530, 0.12]],
};

// Per-timbre level trims so every lead sits at a similar loudness.
const LEAD_GAIN = { vox: 1.5, robo: 1.15, chip: 3.4, whistle: 1, supersaw: 1.8, square: 1 };

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.playing = null;
    this.kicks = [];
    this.volume = 0.85;
  }

  // Pass an OfflineAudioContext to render without the real-time scheduler.
  ensure(offline = null) {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = offline || new AC({ latencyHint: 'interactive' }));
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 3;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.08;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    this.master.connect(comp).connect(limiter).connect(out).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.2, 3.2);
    const revOut = ctx.createGain(); revOut.gain.value = 0.55;
    this.reverb.connect(revOut).connect(this.master);

    this.delay = ctx.createDelay(2);
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2800;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.6;
    dlp.connect(dOut).connect(this.master);

    this.noise = this.noiseBuffer(2);
    this.pulse = ctx.createPeriodicWave(...this.pulseCoeffs(0.25));
    if (!offline) this.timer = setInterval(() => this.tick(), 25);
    return ctx;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  noiseBuffer(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  pulseCoeffs(duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return [re, im];
  }

  // ------------------------------------------------------------ transport --

  start(compiled, song, { fromBeat = 0, loop = null, gain = 1, fadeIn = 0, lead = 0.15 } = {}) {
    const ctx = this.ensure();
    this.stop(0.08);
    const bus = ctx.createGain();
    const now = ctx.currentTime;
    if (fadeIn) { bus.gain.setValueAtTime(0.0001, now); bus.gain.exponentialRampToValueAtTime(gain, now + fadeIn); }
    else bus.gain.value = gain;
    bus.connect(this.master);
    const rev = ctx.createGain(); rev.gain.value = 1; rev.connect(this.reverb);
    const dly = ctx.createGain(); dly.gain.value = 1; dly.connect(this.delay);
    this.delay.delayTime.setValueAtTime(Math.min(1.9, (60 / song.bpm) * 0.75), now);
    const spb = 60 / song.bpm;
    const p = {
      compiled, song, bus, rev, dly, spb, loop,
      t0: now + lead - fromBeat * spb,
      origin: now + lead - fromBeat * spb,
      idx: this.indexAt(compiled.ev, loop ? Math.max(fromBeat, loop[0]) : fromBeat),
      done: false,
    };
    this.playing = p;
    this.kicks = [];
    this.tick();
    return p;
  }

  stop(fade = 0.12) {
    const p = this.playing;
    if (!p) return;
    this.playing = null;
    const t = this.ctx.currentTime;
    for (const node of [p.bus, p.rev, p.dly]) {
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(0, t + fade);
    }
    setTimeout(() => { p.bus.disconnect(); p.rev.disconnect(); p.dly.disconnect(); }, fade * 1000 + 400);
  }

  indexAt(ev, beat) {
    let lo = 0, hi = ev.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].b < beat) lo = m + 1; else hi = m; }
    return lo;
  }

  get latency() {
    const c = this.ctx;
    return c ? (c.outputLatency || 0) + (c.baseLatency || 0) : 0;
  }

  // Current musical position in beats, compensated for output latency.
  beat() {
    const p = this.playing;
    if (!p) return 0;
    // Measured from the original start so look-ahead loop wraps don't jump early.
    const raw = (this.ctx.currentTime - p.origin - this.latency) / p.spb;
    if (!p.loop || raw < p.loop[1]) return raw;
    const len = p.loop[1] - p.loop[0];
    return p.loop[0] + ((raw - p.loop[0]) % len);
  }

  pause() { if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') return this.ctx.resume(); }

  // Kick-drum envelope for visuals: 1 on the hit, decaying after.
  pulseLevel() {
    if (!this.ctx) return 0;
    const t = this.ctx.currentTime - this.latency;
    let level = 0;
    for (const k of this.kicks) {
      if (k <= t) level = Math.max(level, Math.exp(-(t - k) * 7));
    }
    return level;
  }

  tick() {
    const p = this.playing;
    if (!p || !this.ctx || this.ctx.state !== 'running') return;
    const ev = p.compiled.ev;
    const now = this.ctx.currentTime;
    const horizon = now + 0.2;
    for (let guard = 0; guard < 4000; guard++) {
      const atEnd = p.idx >= ev.length;
      if (p.loop && (atEnd || ev[p.idx].b >= p.loop[1])) {
        p.t0 += (p.loop[1] - p.loop[0]) * p.spb;
        p.idx = this.indexAt(ev, p.loop[0]);
        continue;
      }
      if (atEnd) { p.done = true; break; }
      const e = ev[p.idx];
      const t = p.t0 + e.b * p.spb;
      if (t > horizon) break;
      if (t >= now - 0.03) this.play(e, Math.max(t, now), p);
      p.idx++;
    }
    if (this.kicks.length > 16) this.kicks.splice(0, this.kicks.length - 16);
  }

  play(e, t, p) {
    const inst = p.song.inst;
    const dur = (e.d || 0.25) * p.spb;
    switch (e.i) {
      case 'kick': this.kicks.push(t); return this.kick(t, e.v, p);
      case 'snare': return this.snare(t, e.v, p);
      case 'clap': return this.clap(t, e.v, p);
      case 'hat': return this.hat(t, e.v, p, 0.045);
      case 'ohat': return this.hat(t, e.v, p, 0.28);
      case 'shaker': return this.shaker(t, e.v, p);
      case 'conga': return this.conga(t, e.v, p);
      case 'cowbell': return this.cowbell(t, e.v, p);
      case 'crash': return this.crash(t, e.v, p);
      case 'riser': return this.riser(t, e.v, dur, p);
      case 'bass': return this.bass(t, e.n, dur, e.v, inst.bass, p);
      case 'comp': return this.comp(t, e.n, dur, e.v, e.inst, p);
      case 'arp': return this.voice(t, e.n, dur, e.v * 0.8, inst.arp || 'pluck', p, 0.25);
      case 'lead': return this.lead(t, e.n, dur, e.v, inst.lead, e.vowel, p);
    }
  }

  // ---------------------------------------------------------------- voices --

  out(node, p, rev = 0, dly = 0) {
    node.connect(p.bus);
    if (rev) { const g = this.ctx.createGain(); g.gain.value = rev; node.connect(g).connect(p.rev); }
    if (dly) { const g = this.ctx.createGain(); g.gain.value = dly; node.connect(g).connect(p.dly); }
  }

  noiseSrc(t, dur) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur);
    return s;
  }

  filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }

  envGain(t, peak, attack, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  osc(type, freq, t, stop) {
    const o = this.ctx.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.start(t);
    o.stop(stop);
    return o;
  }

  kick(t, v, p) {
    const o = this.osc('sine', 155, t, t + 0.5);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    const g = this.envGain(t, v * 1.1, 0.003, 0.42);
    o.connect(g); this.out(g, p);
    const n = this.noiseSrc(t, 0.03);
    const hp = this.filter('highpass', 2500);
    const ng = this.envGain(t, v * 0.18, 0.001, 0.02);
    n.connect(hp).connect(ng); this.out(ng, p);
  }

  snare(t, v, p) {
    const n = this.noiseSrc(t, 0.25);
    const hp = this.filter('highpass', 1400);
    const g = this.envGain(t, v * 0.42, 0.002, 0.18);
    n.connect(hp).connect(g); this.out(g, p, 0.18);
    const o = this.osc('triangle', 200, t, t + 0.15);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const og = this.envGain(t, v * 0.32, 0.002, 0.09);
    o.connect(og); this.out(og, p);
  }

  clap(t, v, p) {
    const n = this.noiseSrc(t, 0.3);
    const bp = this.filter('bandpass', 1150, 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.011;
      g.gain.setValueAtTime(v * 0.7, s);
      g.gain.exponentialRampToValueAtTime(v * 0.12, s + 0.01);
    }
    g.gain.setValueAtTime(v * 0.6, t + 0.033);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    n.connect(bp).connect(g); this.out(g, p, 0.3);
  }

  hat(t, v, p, decay) {
    const n = this.noiseSrc(t, decay + 0.05);
    const hp = this.filter('highpass', 7800);
    const g = this.envGain(t, v * 0.2, 0.001, decay);
    n.connect(hp).connect(g); this.out(g, p);
  }

  shaker(t, v, p) {
    const n = this.noiseSrc(t, 0.1);
    const bp = this.filter('bandpass', 5800, 1.2);
    const g = this.envGain(t, v * 0.22, 0.012, 0.055);
    n.connect(bp).connect(g); this.out(g, p);
  }

  conga(t, v, p) {
    const f = 240 + Math.random() * 60;
    const o = this.osc('sine', f, t, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.12);
    const g = this.envGain(t, v * 0.45, 0.002, 0.22);
    o.connect(g); this.out(g, p, 0.15);
  }

  cowbell(t, v, p) {
    const bp = this.filter('bandpass', 820, 3);
    const g = this.envGain(t, v * 0.22, 0.002, 0.28);
    for (const f of [545, 815]) this.osc('square', f, t, t + 0.32).connect(bp);
    bp.connect(g); this.out(g, p, 0.1);
  }

  crash(t, v, p) {
    const n = this.noiseSrc(t, 2);
    const hp = this.filter('highpass', 4200);
    const g = this.envGain(t, v * 0.26, 0.004, 1.7);
    n.connect(hp).connect(g); this.out(g, p, 0.35);
  }

  riser(t, v, dur, p) {
    const n = this.noiseSrc(t, dur + 0.05);
    const bp = this.filter('bandpass', 300, 2.2);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(7500, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
    n.connect(bp).connect(g); this.out(g, p, 0.3);
  }

  bass(t, m, dur, v, type, p) {
    const f = mtof(m);
    const end = t + dur;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    switch (type) {
      case '808': {
        const o = this.osc('sine', f * 1.6, t, end + 0.3);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
        const ws = this.ctx.createWaveShaper();
        ws.curve = this.softClip();
        g.gain.exponentialRampToValueAtTime(v * 0.2, t + 0.005);
        g.gain.setValueAtTime(v * 0.2, end);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
        o.connect(ws).connect(g);
        break;
      }
      case 'sub': {
        const o = this.osc('sine', f, t, end + 0.2);
        const o2 = this.osc('triangle', f * 2, t, end + 0.2);
        const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
        o2.connect(g2).connect(g);
        o.connect(g);
        g.gain.exponentialRampToValueAtTime(v * 0.23, t + 0.01);
        g.gain.setValueAtTime(v * 0.23, end);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
        break;
      }
      case 'funk': {
        const o = this.osc('square', f, t, end + 0.15);
        const lp = this.filter('lowpass', 3000, 7);
        lp.frequency.setValueAtTime(3000, t);
        lp.frequency.exponentialRampToValueAtTime(420, t + 0.12);
        o.connect(lp).connect(g);
        g.gain.exponentialRampToValueAtTime(v * 0.22, t + 0.004);
        g.gain.setValueAtTime(v * 0.2, end);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
        break;
      }
      default: {
        const o = this.osc('sawtooth', f, t, end + 0.15);
        const o2 = this.osc('square', f / 2, t, end + 0.15);
        const sub = this.ctx.createGain(); sub.gain.value = 0.35;
        const lp = this.filter('lowpass', 1900, 5);
        lp.frequency.setValueAtTime(1900, t);
        lp.frequency.exponentialRampToValueAtTime(280, t + 0.2);
        o.connect(lp); o2.connect(sub).connect(lp);
        lp.connect(g);
        g.gain.exponentialRampToValueAtTime(v * 0.36, t + 0.005);
        g.gain.setValueAtTime(v * 0.32, end);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.07);
      }
    }
    this.out(g, p);
  }

  softClip() {
    if (this._clip) return this._clip;
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * 2.2); }
    return (this._clip = c);
  }

  comp(t, notes, dur, v, type, p) {
    const per = 1 / Math.sqrt(notes.length);
    for (const m of notes) this.voice(t, m, dur, v * per, type, p, 0.12);
  }

  // Generic pitched voice used for chords and arpeggios.
  voice(t, m, dur, v, type, p, rev = 0.15) {
    const f = mtof(m);
    const end = t + dur;
    const ctx = this.ctx;
    switch (type) {
      case 'pad': {
        const lp = this.filter('lowpass', 1500, 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v * 0.1, t + 0.08);
        g.gain.setValueAtTime(v * 0.1, end);
        g.gain.linearRampToValueAtTime(0.0001, end + 0.3);
        for (const det of [-9, 9]) { const o = this.osc('sawtooth', f, t, end + 0.35); o.detune.value = det; o.connect(lp); }
        lp.connect(g); this.out(g, p, 0.3);
        break;
      }
      case 'stab': {
        const lp = this.filter('lowpass', 2600, 1);
        lp.frequency.setValueAtTime(3200, t);
        lp.frequency.exponentialRampToValueAtTime(900, t + 0.15);
        const g = this.envGain(t, v * 0.13, 0.004, Math.min(0.22, dur + 0.05));
        for (const det of [-12, 0, 12]) { const o = this.osc('sawtooth', f, t, end + 0.3); o.detune.value = det; o.connect(lp); }
        lp.connect(g); this.out(g, p, 0.25, 0.1);
        break;
      }
      case 'pluck': {
        const lp = this.filter('lowpass', 3500, 2);
        lp.frequency.setValueAtTime(4200, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.22);
        const g = this.envGain(t, v * 0.2, 0.003, 0.32);
        this.osc('sawtooth', f, t, t + 0.4).connect(lp);
        lp.connect(g); this.out(g, p, rev, 0.12);
        break;
      }
      case 'brass': {
        const lp = this.filter('lowpass', 500, 1.5);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
        lp.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v * 0.16, t + 0.03);
        g.gain.setValueAtTime(v * 0.14, Math.max(t + 0.04, end));
        g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + 0.04, end) + 0.1);
        for (const det of [-6, 6]) { const o = this.osc('sawtooth', f, t, end + 0.2); o.detune.value = det; o.connect(lp); }
        lp.connect(g); this.out(g, p, 0.2);
        break;
      }
      case 'marimba': {
        const g = this.envGain(t, v * 0.32, 0.002, 0.45);
        this.osc('sine', f, t, t + 0.5).connect(g);
        const g2 = this.envGain(t, v * 0.12, 0.001, 0.06);
        this.osc('sine', f * 4, t, t + 0.1).connect(g2);
        g2.connect(g);
        this.out(g, p, 0.2);
        break;
      }
      case 'bell': {
        const mod = this.osc('sine', f * 3.5, t, t + 1.2);
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6);
        const car = this.osc('sine', f, t, t + 1.2);
        mod.connect(mg).connect(car.frequency);
        const g = this.envGain(t, v * 0.2, 0.002, 0.9);
        car.connect(g); this.out(g, p, 0.3, 0.15);
        break;
      }
      default: {
        const g = this.envGain(t, v * 0.15, 0.005, dur);
        this.osc('triangle', f, t, end + 0.1).connect(g);
        this.out(g, p, rev);
      }
    }
  }

  lead(t, m, dur, v, type, vowel, p) {
    const ctx = this.ctx;
    const f = mtof(m);
    const end = t + Math.max(0.08, dur * 0.95);
    const g = ctx.createGain();
    const lvl = v * 0.22 * (LEAD_GAIN[type] ?? 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + 0.025);
    g.gain.setValueAtTime(lvl * 0.85, end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    const stop = end + 0.15;

    // Delayed vibrato on longer notes.
    const vib = this.osc('sine', 5.6, t, stop);
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(dur > 0.3 ? f * 0.012 : 0, t + Math.min(0.3, dur));
    vib.connect(vg);

    const srcs = [];
    if (type === 'vox' || type === 'robo') {
      const o = this.osc(type === 'robo' ? 'square' : 'sawtooth', f, t, stop);
      vg.connect(o.frequency);
      const sum = ctx.createGain(); sum.gain.value = type === 'robo' ? 1.6 : 2.4;
      for (const [ff, gain] of FORMANTS[vowel] || FORMANTS.a) {
        const bp = this.filter('bandpass', ff, ff < 1000 ? 6 : 10);
        const fg = ctx.createGain(); fg.gain.value = gain;
        o.connect(bp).connect(fg).connect(sum);
      }
      const body = this.filter('lowpass', 900, 0.7);
      const bg = ctx.createGain(); bg.gain.value = 0.25;
      o.connect(body).connect(bg).connect(sum);
      sum.connect(g);
      srcs.push(o);
    } else if (type === 'chip') {
      const o = this.osc('pulse', f, t, stop);
      vg.connect(o.frequency);
      const lp = this.filter('lowpass', 5000);
      const lg = ctx.createGain(); lg.gain.value = 0.55;
      o.connect(lp).connect(lg).connect(g);
    } else if (type === 'whistle') {
      const o = this.osc('sine', f * 2, t, stop);
      vg.connect(o.frequency);
      const o2 = this.osc('triangle', f, t, stop);
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o2.connect(g2).connect(g);
      const g1 = ctx.createGain(); g1.gain.value = 0.9;
      o.connect(g1).connect(g);
    } else if (type === 'supersaw') {
      const lp = this.filter('lowpass', 5200, 0.6);
      for (const det of [-18, -7, 0, 7, 18]) {
        const o = this.osc('sawtooth', f, t, stop);
        o.detune.value = det;
        vg.connect(o.frequency);
        o.connect(lp);
      }
      const lg = ctx.createGain(); lg.gain.value = 0.35;
      lp.connect(lg).connect(g);
    } else {
      const o = this.osc('square', f, t, stop);
      vg.connect(o.frequency);
      const lp = this.filter('lowpass', 3200);
      const lg = ctx.createGain(); lg.gain.value = 0.5;
      o.connect(lp).connect(lg).connect(g);
    }
    this.out(g, p, 0.22, 0.2);
  }

  // Short UI blips for menus.
  blip(kind = 'move') {
    const ctx = this.ensure();
    const t = ctx.currentTime + 0.005;
    const f = kind === 'select' ? 880 : kind === 'back' ? 330 : 620;
    const o = this.osc('triangle', f, t, t + 0.15);
    if (kind === 'select') o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08);
    const g = this.envGain(t, 0.12, 0.004, 0.11);
    o.connect(g).connect(this.master);
  }

  // Rating stingers during gameplay.
  sting(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const notes = kind === 'gold' ? [72, 76, 79, 84] : kind === 'perfect' ? [79, 84] : [76];
    notes.forEach((m, i) => {
      const s = t + i * 0.05;
      const o = this.osc('triangle', mtof(m), s, s + 0.3);
      const g = this.envGain(s, kind === 'gold' ? 0.09 : 0.05, 0.004, 0.25);
      o.connect(g).connect(this.master);
    });
  }
}
