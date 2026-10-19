// Everything drawn on the main canvas: animated backdrop, the coach,
// the pictogram track and particle effects.
import { joints, drawFigure, renderPicto, roundRect } from './body.js';
import { MOVES } from './moves.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

// Small deterministic PRNG so backdrops look the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class Stage {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.particles = [];
    this.pictos = new Map();
    this.layout = { mode: 'title' };
    this.coachX = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth > 1600 ? 1.5 : 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.dpr = dpr;
    this.c.width = Math.round(this.W * dpr);
    this.c.height = Math.round(this.H * dpr);
    this.c.style.width = this.W + 'px';
    this.c.style.height = this.H + 'px';
    this.pictos.clear();
  }

  setSong(song) {
    if (this.song === song) return;
    this.song = song;
    this.pictos.clear();
    const r = rng(song.id.length * 7919 + song.bpm);
    this.seeds = Array.from({ length: 60 }, () => ({ x: r(), y: r(), s: r(), p: r() }));
    if (song.palette.fx === 'circuit') this.traces = this.makeTraces(r);
  }

  makeTraces(r) {
    const out = [];
    for (let i = 0; i < 26; i++) {
      const pts = [[r(), r() * 0.85]];
      for (let k = 0; k < 5; k++) {
        const [x, y] = pts[pts.length - 1];
        pts.push(k % 2 ? [x, Math.min(0.9, Math.max(0, y + (r() - 0.5) * 0.35))] : [Math.min(1, Math.max(0, x + (r() - 0.5) * 0.4)), y]);
      }
      out.push({ pts, speed: 0.15 + r() * 0.3, off: r() });
    }
    return out;
  }

  // ---------------------------------------------------------- particles --

  burst(x, y, colors, n = 18, kind = 'spark', power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(120, 420) * power;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120 * power, life: 0, max: rand(0.6, 1.2),
        color: colors[i % colors.length], size: rand(4, 9) * (kind === 'star' ? 1.6 : 1), kind,
        rot: rand(0, TAU), vr: rand(-8, 8),
      });
    }
  }

  confetti(n, colors) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: rand(0, this.W), y: rand(-80, -10), vx: rand(-40, 40), vy: rand(80, 220), life: 0, max: rand(2.5, 4.5),
        color: colors[i % colors.length], size: rand(6, 11), kind: 'confetti', rot: rand(0, TAU), vr: rand(-6, 6), g: 60,
      });
    }
  }

  stepParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life > p.max) { ps.splice(i, 1); continue; }
      p.vy += (p.g ?? 520) * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }

  drawParticles() {
    const g = this.g;
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      g.globalAlpha = Math.max(0, a);
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y); g.rotate(p.rot);
      if (p.kind === 'star') starPath(g, 0, 0, p.size, p.size * 0.45, 5), g.fill();
      else if (p.kind === 'confetti') g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else { g.beginPath(); g.arc(0, 0, p.size * a, 0, TAU); g.fill(); }
      g.restore();
    }
    g.globalAlpha = 1;
  }

  // ---------------------------------------------------------- layout --

  coachLayout(mode, floorY) {
    const { W, H } = this;
    if (mode === 'game') {
      const y = H * (W < 820 ? 0.8 : 0.84);
      return { x: W * 0.5, y, s: Math.min(H * 0.7, W * 0.9), alpha: 1 };
    }
    const y = Math.min(H * 0.92, floorY || H * 0.92);
    if (W < 820) return { x: W * 0.5, y, s: Math.min(y * 0.8, W * 0.9), alpha: 0.32 };
    return { x: W * 0.74, y, s: Math.min(y * 0.86, W * 0.5), alpha: 1 };
  }

  pictoGeom() {
    const { W, H } = this;
    const size = Math.round(Math.max(64, Math.min(150, Math.min(W, H) * 0.16)));
    const hitX = W - size * (W < 700 ? 2.4 : 3.4);
    return { size, hitX, y: H - size * 0.62 - 12, ppb: size * 0.42 };
  }

  picto(m, size) {
    const key = `${m.id}|${m.mirror}|${m.gold}|${size}`;
    let c = this.pictos.get(key);
    if (!c) {
      const pal = this.song.palette;
      c = renderPicto(MOVES[m.id], m.mirror, m.gold, Math.round(size * this.dpr), [pal.accent, pal.accent2]);
      this.pictos.set(key, c);
    }
    return c;
  }

  // ------------------------------------------------------------- render --

  render(st) {
    const { g, W, H } = this;
    const dt = Math.min(0.05, st.dt || 0.016);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    const song = this.song;
    if (!song) { g.fillStyle = '#0b0420'; g.fillRect(0, 0, W, H); return; }

    this.backdrop(st);

    const L = this.coachLayout(st.mode, st.floorY);
    // Ease the coach between menu and game positions.
    if (this.coachX == null) this.coachX = { ...L };
    const k = 1 - Math.pow(0.0015, dt);
    for (const key of ['x', 'y', 's', 'alpha']) this.coachX[key] += (L[key] - this.coachX[key]) * k;
    const CL = this.coachX;

    if (st.pose) {
      const J = joints(st.pose);
      const look = song.coach;
      const gold = st.gold || 0;
      const glowColor = gold > 0.05 ? '#ffd23f' : look.glow;
      // Floor spotlight
      const fl = g.createRadialGradient(CL.x, CL.y, 0, CL.x, CL.y, CL.s * 0.5);
      fl.addColorStop(0, hexA(gold > 0.05 ? '#ffd23f' : song.palette.accent, (0.28 + st.pulse * 0.25) * CL.alpha));
      fl.addColorStop(1, hexA(song.palette.accent, 0));
      g.fillStyle = fl;
      g.save(); g.translate(CL.x, CL.y); g.scale(1, 0.18); g.beginPath(); g.arc(0, 0, CL.s * 0.5, 0, TAU); g.restore(); g.fill();

      // Reflection
      g.save();
      g.translate(0, CL.y * 2);
      g.scale(1, -1);
      drawFigure(g, J, look, { ox: CL.x, oy: CL.y, s: CL.s, alpha: 0.13 * CL.alpha });
      g.restore();

      drawFigure(g, J, look, {
        ox: CL.x, oy: CL.y, s: CL.s, alpha: CL.alpha,
        glow: CL.s * (0.035 + st.pulse * 0.025 + gold * 0.05), glowColor,
      });
      this.lastJoints = J;
      this.lastLayout = CL;
    }

    if (st.mode === 'game' && st.moves) this.pictoTrack(st);

    this.stepParticles(dt);
    this.drawParticles();

    if (st.flash) {
      g.fillStyle = st.flashColor || '#fff';
      g.globalAlpha = st.flash;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }

  coachPoint(name) {
    const J = this.lastJoints, L = this.lastLayout;
    if (!J || !L) return { x: this.W / 2, y: this.H / 2 };
    return { x: L.x + J[name].x * L.s, y: L.y + J[name].y * L.s };
  }

  pictoTrack(st) {
    const { g, W } = this;
    const { size, hitX, y, ppb } = this.pictoGeom();
    const beat = st.beat;

    // Track rail
    g.save();
    const railH = size * 0.16;
    const grad = g.createLinearGradient(hitX, 0, W, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    roundRect(g, hitX - size * 0.1, y - railH / 2, W - hitX + size * 0.1, railH, railH / 2);
    g.fill();
    // Hit marker
    const pulse = st.pulse;
    g.strokeStyle = this.song.palette.accent;
    g.shadowColor = this.song.palette.accent;
    g.shadowBlur = 12 + pulse * 18;
    g.lineWidth = 3 + pulse * 3;
    roundRect(g, hitX - size * 0.56, y - size * 0.56, size * 1.12, size * 1.12, size * 0.2);
    g.globalAlpha = 0.45 + pulse * 0.4;
    g.stroke();
    g.restore();

    if (st.moveName) {
      g.save();
      g.font = `800 ${Math.round(size * 0.17)}px 'Baloo 2', system-ui, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.shadowColor = 'rgba(0,0,0,0.8)';
      g.shadowBlur = 6;
      g.fillText(st.moveName, hitX, y - size * 0.68);
      g.restore();
    }

    for (const m of st.moves) {
      if (m.id === 'groove') continue;
      const db = m.b - beat;
      if (db > (W - hitX + size) / ppb) continue;
      const img = this.picto(m, size);
      let x = hitX + db * ppb, scale = 1, alpha = 1;
      if (db < 0) {
        // The move has started: pop off the marker to make room for the next card.
        if (db < -1) continue;
        x = hitX;
        scale = 1 - db * 0.35;
        alpha = 1 + db;
      } else {
        alpha = Math.min(1, (W + size * 0.2 - x) / (size * 0.8));
        scale = 0.82 + 0.18 * Math.max(0, 1 - db / 4);
      }
      const sz = size * scale;
      g.globalAlpha = Math.max(0, alpha);
      g.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }

  // ----------------------------------------------------------- backdrops --

  backdrop(st) {
    const fx = this.song.palette.fx;
    const fn = {
      synthwave: this.bgSynthwave, fiesta: this.bgFiesta, bubbles: this.bgBubbles,
      circuit: this.bgCircuit, tropical: this.bgTropical, lasers: this.bgLasers,
    }[fx] || this.bgSynthwave;
    fn.call(this, st);
    if (st.dim) {
      this.g.fillStyle = `rgba(5,2,15,${st.dim})`;
      this.g.fillRect(0, 0, this.W, this.H);
    }
  }

  skyGradient(stops, y0 = 0, y1 = this.H) {
    const gr = this.g.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }

  bgSynthwave(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    const hz = H * 0.6;
    g.fillStyle = this.skyGradient([pal.bg[0], pal.bg[1], pal.bg[2]], 0, hz);
    g.fillRect(0, 0, W, hz);
    // Stars
    g.fillStyle = '#fff';
    for (const s of this.seeds) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(st.now * (0.6 + s.s) + s.p * 9));
      g.globalAlpha = tw * 0.8;
      g.fillRect(s.x * W, s.y * hz * 0.7, 1.5 + s.s * 1.5, 1.5 + s.s * 1.5);
    }
    g.globalAlpha = 1;
    // Sun
    const R = Math.min(W, H) * 0.26 * (1 + st.pulse * 0.02);
    const cx = W / 2, cy = hz - R * 0.35;
    g.save();
    g.beginPath(); g.rect(0, 0, W, hz); g.clip();
    const sun = g.createLinearGradient(0, cy - R, 0, cy + R);
    sun.addColorStop(0, '#ffe45e'); sun.addColorStop(0.55, '#ff7e5f'); sun.addColorStop(1, pal.accent2);
    g.fillStyle = sun;
    g.shadowColor = pal.accent2; g.shadowBlur = 60;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = pal.bg[1];
    for (let i = 0; i < 7; i++) {
      const yy = cy + R * (0.05 + i * 0.14);
      g.fillRect(cx - R, yy, R * 2, 2 + i * 1.6);
    }
    g.restore();
    // Floor grid
    const fg = this.skyGradient(['#1a0033', '#05000d'], hz, H);
    g.fillStyle = fg; g.fillRect(0, hz, W, H - hz);
    g.strokeStyle = pal.accent;
    g.lineWidth = 1.5;
    g.globalAlpha = 0.5 + st.pulse * 0.4;
    g.shadowColor = pal.accent; g.shadowBlur = 8;
    g.beginPath();
    for (let i = -14; i <= 14; i++) {
      g.moveTo(cx + i * W * 0.012, hz);
      g.lineTo(cx + i * W * 0.16, H);
    }
    const phase = (st.beat || st.now * 2) % 1;
    for (let i = 0; i < 12; i++) {
      const z = (i + phase) / 12;
      const yy = hz + (H - hz) * z * z;
      g.moveTo(0, yy); g.lineTo(W, yy);
    }
    g.stroke();
    g.shadowBlur = 0;
    g.globalAlpha = 1;
    // Horizon glow
    const hg = g.createLinearGradient(0, hz - 30, 0, hz + 30);
    hg.addColorStop(0, hexA(pal.accent2, 0)); hg.addColorStop(0.5, hexA(pal.accent2, 0.6 + st.pulse * 0.3)); hg.addColorStop(1, hexA(pal.accent2, 0));
    g.fillStyle = hg; g.fillRect(0, hz - 30, W, 60);
    this.beams(st, [pal.accent, pal.accent2], 0.06);
  }

  beams(st, colors, strength) {
    const { g, W, H } = this;
    const n = 4;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const base = (i + 0.5) / n * W;
      const a = Math.sin(st.now * 0.6 + i * 1.7) * 0.35 + (i - (n - 1) / 2) * 0.12;
      const len = H * 1.2;
      const w = W * 0.07;
      const ex = base + Math.sin(a) * len, ey = Math.cos(a) * len;
      const gr = g.createLinearGradient(base, 0, ex, ey);
      gr.addColorStop(0, hexA(colors[i % colors.length], strength * (1 + st.pulse) * (0.5 + (st.energy || 0.5))));
      gr.addColorStop(1, hexA(colors[i % colors.length], 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(base - 6, 0); g.lineTo(base + 6, 0);
      g.lineTo(ex + w, ey); g.lineTo(ex - w, ey);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  bgFiesta(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    const rg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.8);
    rg.addColorStop(0, pal.bg[2]); rg.addColorStop(0.45, pal.bg[1]); rg.addColorStop(1, pal.bg[0]);
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // Sunburst
    g.save();
    g.translate(W / 2, H * 0.45);
    g.rotate((st.beat || st.now) * 0.04);
    g.fillStyle = `rgba(255,240,200,${0.07 + st.pulse * 0.05})`;
    const rays = 18, R = Math.max(W, H);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU;
      g.beginPath(); g.moveTo(0, 0);
      g.arc(0, 0, R, a, a + TAU / rays / 2); g.closePath(); g.fill();
    }
    g.restore();
    // Bunting
    const colors = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#ff7b00'];
    for (let row = 0; row < 2; row++) {
      const y0 = H * (0.05 + row * 0.09);
      const sag = H * 0.06;
      const sway = Math.sin((st.beat || st.now) * Math.PI / 2 + row) * 4;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const x = u * W;
        const y = y0 + Math.sin(u * Math.PI) * sag;
        g.fillStyle = colors[(i + row) % colors.length];
        g.beginPath();
        g.moveTo(x - W / n * 0.42, y);
        g.lineTo(x + W / n * 0.42, y);
        g.lineTo(x + sway, y + H * 0.055);
        g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(u * W, y0 + Math.sin(u * Math.PI) * sag); }
      g.stroke();
    }
    // Floor
    const fy = H * 0.86;
    g.fillStyle = this.skyGradient(['rgba(60,10,20,0.0)', 'rgba(40,5,15,0.85)'], fy - 40, H);
    g.fillRect(0, fy - 40, W, H - fy + 40);
    this.beams(st, [pal.accent, pal.accent2], 0.05);
  }

  bgBubbles(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    g.fillStyle = this.skyGradient([pal.bg[0], pal.bg[1], pal.bg[2]]);
    g.fillRect(0, 0, W, H);
    const t = st.now;
    for (const s of this.seeds) {
      const r = 8 + s.s * 34;
      const speed = 30 + s.s * 50;
      const y = H + r - ((t * speed + s.p * H * 2) % (H + r * 2));
      const x = s.x * W + Math.sin(t * 0.8 + s.p * 10) * 18;
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.fillStyle = `rgba(255,255,255,${0.06 + st.pulse * 0.05})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r * (1 + st.pulse * 0.06), 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, TAU); g.fill();
    }
    // Sparkles
    g.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) {
      const s = this.seeds[i];
      const a = Math.max(0, Math.sin(t * 2 + s.p * 20));
      g.globalAlpha = a;
      starPath(g, s.y * W, s.x * H * 0.6, 4 + s.s * 6, 1.5, 4); g.fill();
    }
    g.globalAlpha = 1;
    const fy = H * 0.86;
    g.fillStyle = this.skyGradient(['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)'], fy - 30, H);
    g.fillRect(0, fy - 30, W, H - fy + 30);
  }

  bgCircuit(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    g.fillStyle = this.skyGradient([pal.bg[0], pal.bg[1], pal.bg[0]]);
    g.fillRect(0, 0, W, H);
    // Faint grid
    g.strokeStyle = 'rgba(57,255,20,0.06)';
    g.lineWidth = 1;
    g.beginPath();
    const step = 40;
    for (let x = 0; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    // Traces with travelling pulses
    for (const tr of this.traces) {
      const pts = tr.pts.map(([x, y]) => [x * W, y * H]);
      g.strokeStyle = hexA(pal.accent, 0.22);
      g.lineWidth = 2;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.fillStyle = hexA(pal.accent, 0.5);
      for (const [x, y] of [pts[0], pts[pts.length - 1]]) { g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); }
      let total = 0;
      const segs = [];
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
      let d = (((st.beat || st.now * 2) * tr.speed + tr.off) % 1) * total;
      for (let i = 0; i < segs.length; i++) {
        if (d <= segs[i]) {
          const u = d / (segs[i] || 1);
          const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
          g.fillStyle = i % 2 ? pal.accent2 : pal.accent;
          g.shadowColor = g.fillStyle; g.shadowBlur = 14;
          g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
          g.shadowBlur = 0;
          break;
        }
        d -= segs[i];
      }
    }
    // Equaliser
    const bars = 28;
    const bw = W / bars;
    const base = H * 0.86;
    for (let i = 0; i < bars; i++) {
      const s = this.seeds[i % this.seeds.length];
      const lvl = (0.25 + 0.75 * Math.abs(Math.sin((st.beat || st.now) * Math.PI * (0.5 + s.s) + s.p * 6))) * (0.4 + st.pulse * 0.6) * (0.5 + (st.energy || 0.5));
      const h = lvl * H * 0.22;
      const gr = g.createLinearGradient(0, base - h, 0, base);
      gr.addColorStop(0, hexA(pal.accent2, 0.65)); gr.addColorStop(1, hexA(pal.accent, 0.1));
      g.fillStyle = gr;
      g.fillRect(i * bw + 2, base - h, bw - 4, h);
    }
    g.fillStyle = this.skyGradient(['rgba(0,20,20,0.6)', 'rgba(0,0,0,0.95)'], base, H);
    g.fillRect(0, base, W, H - base);
  }

  bgTropical(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    const hz = H * 0.64;
    g.fillStyle = this.skyGradient([pal.bg[0], pal.bg[1], pal.bg[2]], 0, hz);
    g.fillRect(0, 0, W, hz);
    // Sun
    const R = Math.min(W, H) * 0.2;
    g.save();
    g.beginPath(); g.rect(0, 0, W, hz); g.clip();
    g.fillStyle = '#fff1b8';
    g.shadowColor = '#ffd56b'; g.shadowBlur = 50 + st.pulse * 30;
    g.beginPath(); g.arc(W / 2, hz + R * 0.2, R, 0, TAU); g.fill();
    g.restore();
    // Sea
    g.fillStyle = this.skyGradient(['#1d6fa3', '#0b2e5c'], hz, H);
    g.fillRect(0, hz, W, H - hz);
    const t = st.now;
    for (let i = 0; i < 7; i++) {
      const y = hz + (H - hz) * (i / 7) * (i / 7) + 4;
      g.strokeStyle = `rgba(255,255,255,${0.12 + 0.05 * i / 7})`;
      g.lineWidth = 1.5 + i * 0.4;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * 0.02 + t * (1 + i * 0.2) + i) * (2 + i));
      g.stroke();
    }
    // Sun glitter
    g.fillStyle = 'rgba(255,240,180,0.5)';
    for (let i = 0; i < 18; i++) {
      const s = this.seeds[i];
      const w = (10 + s.s * 40) * (1 - s.y * 0.5);
      g.fillRect(W / 2 - w / 2 + (s.x - 0.5) * R * 1.4, hz + 6 + s.y * (H - hz) * 0.5, w, 2);
    }
    // Palms
    const sway = Math.sin((st.beat || st.now) * Math.PI / 2) * 0.05;
    this.palm(W * 0.06, H, H * 0.75, 0.22 + sway);
    this.palm(W * 0.95, H, H * 0.68, -0.25 - sway);
    this.palm(W * 0.88, H, H * 0.5, -0.12 - sway * 0.7);
  }

  palm(x, y, h, lean) {
    const g = this.g;
    g.save();
    g.fillStyle = g.strokeStyle = '#13081f';
    g.lineCap = 'round';
    g.lineWidth = h * 0.045;
    const tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean) * h;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.sin(lean) * h * 0.2, y - h * 0.6, tx, ty);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + lean + (i - 3) * 0.48;
      const L = h * 0.42;
      g.lineWidth = h * 0.03;
      g.beginPath();
      g.moveTo(tx, ty);
      const mx = tx + Math.cos(a) * L * 0.6, my = ty + Math.sin(a) * L * 0.6 - h * 0.05;
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + h * 0.12;
      g.quadraticCurveTo(mx, my, ex, ey);
      g.stroke();
    }
    g.restore();
  }

  bgLasers(st) {
    const { g, W, H } = this;
    const pal = this.song.palette;
    const rg = g.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.7);
    rg.addColorStop(0, pal.bg[2]); rg.addColorStop(0.5, pal.bg[1]); rg.addColorStop(1, pal.bg[0]);
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const e = st.energy || 0.5;
    const n = Math.round(4 + e * 10);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const origins = [[W * 0.5, -10], [-10, H * 0.15], [W + 10, H * 0.15]];
    for (let i = 0; i < n; i++) {
      const [ox, oy] = origins[i % origins.length];
      const a = Math.PI / 2 + Math.sin(st.now * (0.7 + i * 0.13) + i * 2.1) * 1.1;
      const L = Math.max(W, H) * 1.3;
      g.strokeStyle = hexA(i % 2 ? pal.accent : pal.accent2, 0.35 + st.pulse * 0.4);
      g.lineWidth = 2 + st.pulse * 2;
      g.shadowColor = g.strokeStyle; g.shadowBlur = 10;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); g.stroke();
    }
    g.restore();
    // Haze specks
    g.fillStyle = 'rgba(255,200,150,0.35)';
    for (const s of this.seeds) {
      const y = H - ((st.now * (20 + s.s * 40) + s.p * H) % H);
      g.fillRect(s.x * W, y, 2, 2);
    }
    // Floor
    const fy = H * 0.86;
    g.fillStyle = this.skyGradient(['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)'], fy - 30, H);
    g.fillRect(0, fy - 30, W, H - fy + 30);
    if (st.drop && st.pulse > 0.7) {
      g.fillStyle = `rgba(255,255,255,${(st.pulse - 0.7) * 0.25})`;
      g.fillRect(0, 0, W, H);
    }
  }
}

export function starPath(g, x, y, R, r, n) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r : R;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
