// Skeleton model, pose interpolation and figure rendering.
//
// Poses are authored in "figure units" where the dancer is roughly 0.9 tall.
// The origin sits on the floor at the centre of the stage, y grows downwards.
//
// Arm angles are absolute and screen-space: for an arm on side s (-1 = screen
// left, +1 = screen right) a limb with angle a points along (s*sin a, cos a).
// So 0 hangs straight down, 90 points outward, 180 points up and negative
// values swing inward across the body. Mirroring a pose is then just a swap
// of the left and right limbs.

export const B = {
  head: 0.062, neck: 0.035, torso: 0.29, sh: 0.105, hip: 0.062,
  upper: 0.165, fore: 0.155, thigh: 0.225, shin: 0.225,
};

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const wrap180 = (a) => ((a + 180) % 360 + 360) % 360 - 180;

export const NEUTRAL = {
  hx: 0, hy: 0.015, lean: 0, head: 0,
  la: [8, 4], ra: [8, 4],
  lf: [-0.075, 0], rf: [0.075, 0],
};

// Fill in any missing fields from the neutral pose.
export function pose(p = {}) {
  return {
    hx: p.hx ?? NEUTRAL.hx, hy: p.hy ?? NEUTRAL.hy,
    lean: p.lean ?? 0, head: p.head ?? 0,
    la: (p.la ?? NEUTRAL.la).slice(), ra: (p.ra ?? NEUTRAL.ra).slice(),
    lf: (p.lf ?? NEUTRAL.lf).slice(), rf: (p.rf ?? NEUTRAL.rf).slice(),
  };
}

export function clonePose(p) {
  return { hx: p.hx, hy: p.hy, lean: p.lean, head: p.head, la: p.la.slice(), ra: p.ra.slice(), lf: p.lf.slice(), rf: p.rf.slice() };
}

export function mirrorPose(p) {
  return {
    hx: -p.hx, hy: p.hy, lean: -p.lean, head: -p.head,
    la: p.ra.slice(), ra: p.la.slice(),
    lf: [-p.rf[0], p.rf[1]], rf: [-p.lf[0], p.lf[1]],
  };
}

// Solve arm angles so the hand lands on a target. x is measured outward from
// the body midline (negative crosses over), y from the base of the neck
// (negative is up). The elbow always bends outward, which reads best on stage.
export function armIK(x, y) {
  let dx = x - B.sh, dy = y;
  let dist = Math.hypot(dx, dy);
  const L1 = B.upper, L2 = B.fore, max = L1 + L2 - 1e-4;
  if (dist > max) { dx *= max / dist; dy *= max / dist; dist = max; }
  dist = Math.max(dist, 0.03);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  const c1 = { x: L1 * Math.cos(base + A), y: L1 * Math.sin(base + A) };
  const c2 = { x: L1 * Math.cos(base - A), y: L1 * Math.sin(base - A) };
  const e = c1.x > c2.x ? c1 : c2;
  const up = Math.atan2(e.x, e.y) / D2R;
  let fo = Math.atan2(dx - e.x, dy - e.y) / D2R;
  fo = up + wrap180(fo - up);
  return [Math.round(up), Math.round(fo)];
}

function limb(side, from, a, len) {
  const r = a * D2R;
  return { x: from.x + side * Math.sin(r) * len, y: from.y + Math.cos(r) * len };
}

function legIK(hip, fx, fy, side) {
  let dx = fx - hip.x, dy = fy - hip.y;
  let dist = Math.hypot(dx, dy);
  const L1 = B.thigh, L2 = B.shin, max = L1 + L2 - 1e-4;
  if (dist > max) { dx *= max / dist; dy *= max / dist; dist = max; }
  dist = Math.max(dist, 0.05);
  const base = Math.atan2(dy, dx);
  const A = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  const k1 = { x: hip.x + L1 * Math.cos(base + A), y: hip.y + L1 * Math.sin(base + A) };
  const k2 = { x: hip.x + L1 * Math.cos(base - A), y: hip.y + L1 * Math.sin(base - A) };
  const knee = side * k1.x > side * k2.x ? k1 : k2;
  return { knee, foot: { x: hip.x + dx, y: hip.y + dy } };
}

// Forward kinematics: pose -> joint positions.
export function joints(p) {
  const hc = { x: p.hx, y: -(B.thigh + B.shin) + p.hy };
  const lr = p.lean * D2R;
  const ux = Math.sin(lr), uy = -Math.cos(lr);
  const px = Math.cos(lr), py = Math.sin(lr);
  const nb = { x: hc.x + ux * B.torso, y: hc.y + uy * B.torso };
  const shL = { x: nb.x - px * B.sh, y: nb.y - py * B.sh };
  const shR = { x: nb.x + px * B.sh, y: nb.y + py * B.sh };
  const hr = (p.lean + p.head) * D2R;
  const head = { x: nb.x + Math.sin(hr) * (B.neck + B.head), y: nb.y - Math.cos(hr) * (B.neck + B.head) };
  const pr = p.lean * 0.3 * D2R;
  const hipL = { x: hc.x - Math.cos(pr) * B.hip, y: hc.y - Math.sin(pr) * B.hip };
  const hipR = { x: hc.x + Math.cos(pr) * B.hip, y: hc.y + Math.sin(pr) * B.hip };
  const elL = limb(-1, shL, p.la[0], B.upper), haL = limb(-1, elL, p.la[1], B.fore);
  const elR = limb(1, shR, p.ra[0], B.upper), haR = limb(1, elR, p.ra[1], B.fore);
  const L = legIK(hipL, p.lf[0], -p.lf[1], -1);
  const R = legIK(hipR, p.rf[0], -p.rf[1], 1);
  return {
    hc, nb, head, headTilt: hr, shL, shR, elL, elR, haL, haR, hipL, hipR,
    knL: L.knee, ftL: L.foot, knR: R.knee, ftR: R.foot,
  };
}

export function lerpPose(a, b, u) {
  return {
    hx: lerp(a.hx, b.hx, u), hy: lerp(a.hy, b.hy, u),
    lean: lerp(a.lean, b.lean, u), head: lerp(a.head, b.head, u),
    la: [lerp(a.la[0], b.la[0], u), lerp(a.la[1], b.la[1], u)],
    ra: [lerp(a.ra[0], b.ra[0], u), lerp(a.ra[1], b.ra[1], u)],
    lf: [lerp(a.lf[0], b.lf[0], u), lerp(a.lf[1], b.lf[1], u)],
    rf: [lerp(a.rf[0], b.rf[0], u), lerp(a.rf[1], b.rf[1], u)],
  };
}

const EASE = {
  smooth: (u) => u * u * (3 - 2 * u),
  snap: (u) => { const v = Math.min(1, u / 0.32); return 1 - (1 - v) * (1 - v) * (1 - v); },
  linear: (u) => u,
};

// A song's choreography flattened into one list of keyframes on the beat grid.
export class Timeline {
  constructor(instances, library) {
    const kfs = [{ b: -1e6, p: pose(), ease: 'smooth' }];
    let prev = kfs[0].p;
    for (const inst of instances) {
      const mv = library[inst.id];
      if (!mv) throw new Error('Unknown move ' + inst.id);
      const list = mv.kf.map(([off, p]) => ({ b: inst.b + off, p: inst.mirror ? mirrorPose(p) : clonePose(p) }));
      // Unwrap arm angles at the move boundary so limbs take the short way
      // from the previous move, keeping each move's own arcs intact.
      for (const arm of ['la', 'ra']) {
        for (let j = 0; j < 2; j++) {
          const k = Math.round((prev[arm][j] - list[0].p[arm][j]) / 360);
          if (k) for (const kf of list) kf.p[arm][j] += k * 360;
        }
      }
      for (const kf of list) kfs.push({ b: kf.b, p: kf.p, ease: mv.ease || 'smooth' });
      prev = list[list.length - 1].p;
    }
    this.kfs = kfs;
  }

  poseAt(beat) {
    const k = this.kfs;
    let lo = 0, hi = k.length - 1;
    if (beat >= k[hi].b) return k[hi].p;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (k[mid].b <= beat) lo = mid; else hi = mid;
    }
    const a = k[lo], b = k[hi];
    const u = clamp((beat - a.b) / Math.max(1e-6, b.b - a.b), 0, 1);
    return lerpPose(a.p, b.p, EASE[b.ease](u));
  }
}

// Pose inside a single move, treating it as a loop (used for pictogram arrows).
export function movePoseAt(mv, beat, mirror) {
  const k = mv.kf, n = k.length;
  const b = ((beat % mv.beats) + mv.beats) % mv.beats;
  let a, c, u;
  if (b < k[0][0] || b >= k[n - 1][0]) {
    a = k[n - 1]; c = k[0];
    const bb = b < k[0][0] ? b + mv.beats : b;
    u = (bb - a[0]) / Math.max(1e-6, c[0] + mv.beats - a[0]);
  } else {
    let i = 0;
    while (i < n - 1 && k[i + 1][0] <= b) i++;
    a = k[i]; c = k[i + 1];
    u = (b - a[0]) / Math.max(1e-6, c[0] - a[0]);
  }
  const p = lerpPose(a[1], c[1], EASE[mv.ease || 'smooth'](clamp(u, 0, 1)));
  return mirror ? mirrorPose(p) : p;
}

// Limb vectors used for scoring (screen space, y down).
export const LIMBS = [
  ['shL', 'elL', 1.0], ['elL', 'haL', 1.3], ['shR', 'elR', 1.0], ['elR', 'haR', 1.3],
  ['hipL', 'knL', 0.45], ['knL', 'ftL', 0.35], ['hipR', 'knR', 0.45], ['knR', 'ftR', 0.35],
];

export function limbVectors(J) {
  return LIMBS.map(([a, b]) => ({ x: J[b].x - J[a].x, y: J[b].y - J[a].y }));
}

// ---------------------------------------------------------------- drawing --

const W = { upper: 0.058, fore: 0.048, thigh: 0.09, shin: 0.07, neck: 0.05 };

function seg(g, a, b, w) {
  g.lineWidth = w;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}

function torsoPath(g, J, P, s) {
  const dx = J.shR.x - J.shL.x, dy = J.shR.y - J.shL.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = dx / len, py = dy / len;
  const ext = 0.018;
  const a = P({ x: J.shL.x - px * ext, y: J.shL.y - py * ext });
  const b = P({ x: J.shR.x + px * ext, y: J.shR.y + py * ext });
  const wy = 0.58;
  const wl = { x: lerp(J.shL.x, J.hipL.x, wy) + px * 0.012, y: lerp(J.shL.y, J.hipL.y, wy) };
  const wr = { x: lerp(J.shR.x, J.hipR.x, wy) - px * 0.012, y: lerp(J.shR.y, J.hipR.y, wy) };
  const c = P({ x: J.hipR.x + 0.03, y: J.hipR.y + 0.01 });
  const d = P({ x: J.hipL.x - 0.03, y: J.hipL.y + 0.01 });
  const l = P(wl), r = P(wr);
  g.beginPath();
  g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  g.quadraticCurveTo(r[0] + 0.01 * s, r[1], c[0], c[1]);
  g.lineTo(d[0], d[1]);
  g.quadraticCurveTo(l[0] - 0.01 * s, l[1], a[0], a[1]);
  g.closePath();
}

function drawHair(g, J, look, P, s, pass, outline) {
  const h = P(J.head);
  const R = B.head * s;
  const t = J.headTilt;
  const style = look.hairStyle;
  const o = pass === 0 ? outline : 0;
  g.save();
  g.translate(h[0], h[1]);
  g.rotate(t);
  const fillOrStroke = () => { g.fill(); if (o) { g.lineWidth = o * 2; g.stroke(); } };
  switch (style) {
    case 'ponytail': {
      const sway = Math.sin(t * 3) * 0.4;
      g.lineCap = 'round';
      g.lineWidth = R * 0.75 + o * 2;
      g.beginPath();
      g.moveTo(R * 0.2, -R * 0.9);
      g.quadraticCurveTo(R * (1.9 + sway), -R * 1.2, R * (1.4 + sway), R * 0.9);
      g.stroke();
      g.beginPath(); g.arc(0, -R * 0.12, R * 1.08 + o, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); fillOrStroke();
      break;
    }
    case 'buns': {
      g.beginPath(); g.arc(0, -R * 0.12, R * 1.08 + o, Math.PI, 0); g.closePath(); fillOrStroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * R * 0.85, -R * 0.95, R * 0.5 + o, 0, Math.PI * 2); fillOrStroke(); }
      break;
    }
    case 'curly': {
      g.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.92 + i * 0.145);
        g.moveTo(Math.cos(a) * R * 1.05 + R * 0.42, Math.sin(a) * R * 1.05);
        g.arc(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05 - R * 0.05, R * 0.42 + o, 0, Math.PI * 2);
      }
      fillOrStroke();
      break;
    }
    case 'spiky': {
      g.beginPath();
      g.moveTo(-R * 1.1, -R * 0.1);
      const n = 5;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI + (i / n) * Math.PI;
        const tip = R * (1.75 + (i % 2) * 0.2);
        const mid = Math.PI + ((i + 0.5) / n) * Math.PI;
        g.lineTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05);
        if (i < n) g.lineTo(Math.cos(mid) * tip, Math.sin(mid) * tip);
      }
      g.closePath();
      fillOrStroke();
      break;
    }
    case 'hat': {
      g.beginPath(); g.arc(0, -R * 0.12, R * 1.06 + o, Math.PI, 0); g.closePath(); fillOrStroke();
      g.beginPath();
      g.moveTo(-R * 1.6, -R * 0.35); g.lineTo(R * 1.6, -R * 0.35);
      g.lineTo(R * 0.9, -R * 1.45); g.lineTo(-R * 0.9, -R * 1.45); g.closePath();
      fillOrStroke();
      break;
    }
    case 'robot': {
      g.lineCap = 'round';
      g.lineWidth = R * 0.14 + o * 2;
      g.beginPath(); g.moveTo(0, -R * 1.05); g.lineTo(R * 0.15, -R * 1.65); g.stroke();
      g.beginPath(); g.arc(R * 0.15, -R * 1.75, R * 0.24 + o, 0, Math.PI * 2); fillOrStroke();
      break;
    }
    default: {
      g.beginPath(); g.arc(0, -R * 0.1, R * 1.08 + o, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); fillOrStroke();
    }
  }
  g.restore();
}

function drawAccessory(g, J, look, P, s, pass, outline) {
  if (!look.accessory) return;
  const h = P(J.head);
  const R = B.head * s;
  g.save();
  g.translate(h[0], h[1]);
  g.rotate(J.headTilt);
  const o = pass === 0 ? outline : 0;
  g.lineCap = 'round';
  switch (look.accessory) {
    case 'visor':
    case 'glasses': {
      g.lineWidth = R * 0.42 + o * 2;
      g.beginPath(); g.moveTo(-R * 0.82, -R * 0.02); g.lineTo(R * 0.82, -R * 0.02); g.stroke();
      break;
    }
    case 'headphones': {
      g.lineWidth = R * 0.2 + o * 2;
      g.beginPath(); g.arc(0, -R * 0.05, R * 1.22, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      for (const sx of [-1, 1]) {
        g.beginPath(); g.ellipse(sx * R * 1.05, R * 0.05, R * 0.3 + o, R * 0.45 + o, 0, 0, Math.PI * 2); g.fill();
        if (o) { g.lineWidth = o * 2; g.stroke(); }
      }
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.beginPath(); g.arc(R * 0.9 + Math.cos(a) * R * 0.25, -R * 0.75 + Math.sin(a) * R * 0.25, R * 0.2 + o, 0, Math.PI * 2); g.fill();
      }
      break;
    }
  }
  g.restore();
}

// Draw a full dancer. `look` describes colours and style; `mono` replaces
// every fill with one colour (pictograms and silhouettes).
export function drawFigure(g, J, look, { ox, oy, s, mono = null, outline = 0.011, glow = 0, glowColor = null, alpha = 1 }) {
  const P = (pt) => [ox + pt.x * s, oy + pt.y * s];
  const ow = outline * s;
  const sleeves = look.sleeves || 'short';
  const legs = look.legs || 'pants';
  const col = (key) => {
    if (mono) return mono;
    switch (key) {
      case 'upper': return sleeves === 'none' ? look.skin : look.top;
      case 'fore': return sleeves === 'long' ? look.top : look.skin;
      case 'thigh': return look.bottom;
      case 'shin': return legs === 'shorts' ? look.skin : look.bottom;
      case 'hand': return look.gloves || look.skin;
      default: return look[key];
    }
  };
  const parts = [
    ['seg', 'hipL', 'knL', W.thigh, 'thigh'], ['seg', 'knL', 'ftL', W.shin, 'shin'],
    ['seg', 'hipR', 'knR', W.thigh, 'thigh'], ['seg', 'knR', 'ftR', W.shin, 'shin'],
    ['shoe', 'ftL', -1], ['shoe', 'ftR', 1],
    ['seg', 'nb', 'head', W.neck, 'skin'],
    ['torso'],
    ['head'],
    ['seg', 'shL', 'elL', W.upper, 'upper'], ['seg', 'elL', 'haL', W.fore, 'fore'], ['hand', 'haL'],
    ['seg', 'shR', 'elR', W.upper, 'upper'], ['seg', 'elR', 'haR', W.fore, 'fore'], ['hand', 'haR'],
  ];

  g.save();
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  for (let pass = 0; pass < 2; pass++) {
    const extra = pass === 0 ? ow * 2 : 0;
    if (pass === 0) {
      g.strokeStyle = g.fillStyle = look.outline || '#fff';
      if (glow) { g.shadowColor = glowColor || look.glow || look.outline; g.shadowBlur = glow; }
    } else {
      g.shadowBlur = 0;
    }
    for (const part of parts) {
      const [kind] = part;
      if (kind === 'seg') {
        if (pass) g.strokeStyle = col(part[4]);
        seg(g, P(J[part[1]]), P(J[part[2]]), part[3] * s + extra);
      } else if (kind === 'shoe') {
        const f = J[part[1]];
        const c = P({ x: f.x + part[2] * 0.022, y: f.y + 0.004 });
        if (pass) g.fillStyle = col('shoes');
        g.beginPath(); g.ellipse(c[0], c[1], 0.046 * s + extra / 2, 0.024 * s + extra / 2, 0, 0, Math.PI * 2); g.fill();
      } else if (kind === 'torso') {
        torsoPath(g, J, P, s);
        if (pass) { g.fillStyle = g.strokeStyle = col('top'); }
        g.lineWidth = 0.03 * s + extra;
        g.fill(); g.stroke();
        if (pass && !mono && look.stripe) {
          g.save();
          torsoPath(g, J, P, s);
          g.clip();
          g.strokeStyle = look.stripe;
          g.lineWidth = 0.045 * s;
          const a = P({ x: J.shL.x, y: lerp(J.shL.y, J.hipL.y, 0.62) });
          const b = P({ x: J.shR.x, y: lerp(J.shR.y, J.hipR.y, 0.3) });
          g.beginPath(); g.moveTo(a[0] - 0.05 * s, a[1]); g.lineTo(b[0] + 0.05 * s, b[1]); g.stroke();
          g.restore();
        }
      } else if (kind === 'head') {
        const h = P(J.head);
        if (look.hairStyle === 'robot' && !mono) {
          if (pass) g.fillStyle = col('top');
        } else if (pass) g.fillStyle = col('skin');
        if (look.hairStyle === 'robot') {
          g.save(); g.translate(h[0], h[1]); g.rotate(J.headTilt);
          const r = B.head * s;
          roundRect(g, -r * 1.05 - extra / 2, -r * 1.05 - extra / 2, r * 2.1 + extra, r * 2.1 + extra, r * 0.45);
          g.fill(); g.restore();
        } else {
          g.beginPath(); g.arc(h[0], h[1], B.head * s + extra / 2, 0, Math.PI * 2); g.fill();
        }
        if (pass) g.fillStyle = g.strokeStyle = mono || look.hair;
        drawHair(g, J, look, P, s, pass, ow);
        if (pass) g.fillStyle = g.strokeStyle = mono || look.accent || look.hair;
        drawAccessory(g, J, look, P, s, pass, ow);
        if (pass === 0) g.strokeStyle = g.fillStyle = look.outline || '#fff';
      } else if (kind === 'hand') {
        const h = P(J[part[1]]);
        if (pass) g.fillStyle = col('hand');
        g.beginPath(); g.arc(h[0], h[1], 0.031 * s + extra / 2, 0, Math.PI * 2); g.fill();
      }
    }
  }
  g.restore();
}

export function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Pictogram: the move's key pose plus arrows tracing the motion into it.
export function renderPicto(mv, mirror, gold, size, colors) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const pad = size * 0.06;
  const r = size * 0.16;
  const bg = g.createLinearGradient(0, 0, size, size);
  if (gold) { bg.addColorStop(0, '#5a3b00'); bg.addColorStop(1, '#2a1800'); }
  else { bg.addColorStop(0, 'rgba(14,10,40,0.88)'); bg.addColorStop(1, 'rgba(30,10,60,0.88)'); }
  roundRect(g, pad, pad, size - pad * 2, size - pad * 2, r);
  g.fillStyle = bg; g.fill();
  g.lineWidth = size * 0.025;
  g.strokeStyle = gold ? '#ffd23f' : colors[0];
  g.stroke();

  const pk = mv.picto ?? 0;
  const keyPose = mirror ? mirrorPose(mv.kf[pk][1]) : mv.kf[pk][1];
  const J = joints(keyPose);
  const s = size * 0.78;
  const ox = size / 2 - J.hc.x * s * 0.85;
  const oy = size * 0.9 + (keyPose.hy < 0 ? keyPose.hy * s * 0.5 : 0);
  const fig = gold ? '#ffd23f' : colors[1];
  const look = { outline: '#ffffff', hairStyle: 'plain', sleeves: 'long', legs: 'pants' };
  drawFigure(g, J, look, { ox, oy, s, mono: fig, outline: 0.012, glow: size * 0.05, glowColor: gold ? '#ffb000' : colors[0] });

  // Motion arrows: trace hands and feet from the previous keyframe into the key pose.
  if (mv.arrow !== false) {
    const k = mv.kf;
    const [from, to] = mv.arrow ?? (pk > 0 ? [k[pk - 1][0], k[pk][0]] : [k[k.length - 1][0], mv.beats + k[0][0]]);
    for (const key of ['haL', 'haR', 'ftL', 'ftR']) {
      const pts = [];
      const n = 16;
      for (let i = 0; i <= n; i++) pts.push(joints(movePoseAt(mv, from + (to - from) * (i / n), mirror))[key]);
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (len < (key[0] === 'h' ? 0.12 : 0.08)) continue;
      // Trim the end so the arrowhead does not sit on the hand.
      let acc = 0, cut = pts.length - 1;
      for (let i = pts.length - 1; i > 0; i--) {
        acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (acc > 0.045) { cut = i; break; }
      }
      const path = pts.slice(0, cut + 1).map((p) => [ox + p.x * s, oy + p.y * s]);
      if (path.length < 2) continue;
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [w, color, head] of [[size * 0.06, 'rgba(0,0,0,0.55)', size * 0.095], [size * 0.032, '#ffffff', size * 0.075]]) {
        g.strokeStyle = g.fillStyle = color;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) g.lineTo(path[i][0], path[i][1]);
        g.stroke();
        const a = path[path.length - 1], b = path[Math.max(0, path.length - 3)];
        const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
        g.beginPath();
        g.moveTo(a[0] + Math.cos(ang) * head * 0.6, a[1] + Math.sin(ang) * head * 0.6);
        g.lineTo(a[0] + Math.cos(ang + 2.4) * head, a[1] + Math.sin(ang + 2.4) * head);
        g.lineTo(a[0] + Math.cos(ang - 2.4) * head, a[1] + Math.sin(ang - 2.4) * head);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  }
  return c;
}
