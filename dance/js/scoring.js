// Scores a dancer by comparing limb directions with the coach.
//
// Both coach and player are compared in screen space. The camera image is
// mirrored, so a player copying the coach like a mirror lines up limb for
// limb: the coach's screen-left arm is matched with the player's screen-left
// arm. Each frame is compared against the coach a little in the past too,
// because people naturally react a fraction of a second late.
import { joints, limbVectors, LIMBS } from './body.js';
import { MOVES } from './moves.js';

export const RATINGS = [
  { key: 'perfect', label: 'PERFECT', min: 0.8, pts: 300, color: '#7cff6b' },
  { key: 'great', label: 'GREAT', min: 0.66, pts: 220, color: '#3ee0ff' },
  { key: 'good', label: 'GOOD', min: 0.5, pts: 140, color: '#ffd23f' },
  { key: 'ok', label: 'OK', min: 0.32, pts: 60, color: '#ff9f43' },
  { key: 'miss', label: 'MISS', min: -Infinity, pts: 0, color: '#ff4d6d' },
];
export const GOLD_BONUS = 450;
export const GOLD_MIN = 0.5;
export const MAX_SCORE = 10000;
export const STAR_STEPS = [1500, 3000, 4500, 6000, 7500];
export const TIERS = [
  { min: 9400, label: 'LEGEND' },
  { min: 8600, label: 'DIAMOND' },
];

const LAGS = [0, 0.12, 0.24, 0.36, 0.48];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// MediaPipe pose landmark indices. "L" here is the person's own left side,
// which lands on screen-left once the camera image is mirrored.
const LM = { shL: 11, elL: 13, haL: 15, hipL: 23, knL: 25, ftL: 27, shR: 12, elR: 14, haR: 16, hipR: 24, knR: 26, ftR: 28 };

export function ratingFor(sim) {
  return RATINGS.find((r) => sim >= r.min);
}

export function starsFor(score) {
  return STAR_STEPS.filter((s) => score >= s).length;
}

export function tierFor(score) {
  return TIERS.find((t) => score >= t.min)?.label || null;
}

function limbSim(a, b) {
  const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
  if (la < 1e-6 || lb < 1e-6) return null;
  const deg = Math.acos(clamp((a.x * b.x + a.y * b.y) / (la * lb), -1, 1)) * 57.2958;
  return clamp(1 - (deg - 18) / 72, 0, 1);
}

export function poseSimilarity(coach, player) {
  let sum = 0, wsum = 0, arms = 0;
  for (let i = 0; i < LIMBS.length; i++) {
    const pv = player[i];
    if (!pv) continue;
    const s = limbSim(coach[i], pv);
    if (s == null) continue;
    const w = LIMBS[i][2];
    sum += s * w; wsum += w;
    if (i < 4) arms++;
  }
  return arms >= 2 ? sum / wsum : null;
}

// Landmarks (normalised, un-mirrored) -> screen-space limb vectors.
export function playerVectors(lm, aspect) {
  const pt = (i) => ({ x: (1 - lm[i].x) * aspect, y: lm[i].y, v: lm[i].visibility ?? 1 });
  return LIMBS.map(([a, b]) => {
    const A = pt(LM[a]), B = pt(LM[b]);
    if (Math.min(A.v, B.v) < 0.5) return null;
    return { x: B.x - A.x, y: B.y - A.y };
  });
}

export function visibility(lm) {
  const vis = (i) => (lm[i].visibility ?? 1) > 0.5;
  return {
    arms: [11, 13, 15, 12, 14, 16].every(vis),
    legs: [23, 25, 27, 24, 26, 28].every(vis),
    handsUp: vis(15) && vis(16) && vis(0) && lm[15].y < lm[0].y && lm[16].y < lm[0].y,
  };
}

export class PlayerScorer {
  constructor(compiled, timeline) {
    this.spb = compiled.spb;
    this.timeline = timeline;
    this.moves = compiled.moves.filter((m) => MOVES[m.id].scored !== false);
    this.samples = this.moves.map(() => []);
    this.next = 0;
    this.points = 0;
    this.maxPoints = this.moves.reduce((s, m) => s + RATINGS[0].pts + (m.gold ? GOLD_BONUS : 0), 0);
    this.counts = Object.fromEntries(RATINGS.map((r) => [r.key, 0]));
    this.gold = { hit: 0, total: this.moves.filter((m) => m.gold).length };
    this.simSum = 0;
    this.judged = 0;
    this.cache = new Map();
  }

  get score() { return Math.round((MAX_SCORE * this.points) / this.maxPoints); }

  coachVectors(beat) {
    // Quantise so several players can share the same coach lookups.
    const key = Math.round(beat * 120);
    let v = this.cache.get(key);
    if (!v) {
      v = limbVectors(joints(this.timeline.poseAt(key / 120)));
      this.cache.set(key, v);
      if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
    }
    return v;
  }

  addSample(beat, playerVecs) {
    let best = null;
    for (const lag of LAGS) {
      const s = poseSimilarity(this.coachVectors(beat - lag / this.spb), playerVecs);
      if (s != null && (best == null || s > best)) best = s;
    }
    if (best == null) return;
    const ref = beat - 0.2 / this.spb;
    for (let i = this.next; i < this.moves.length; i++) {
      const m = this.moves[i];
      if (ref < m.b) break;
      if (ref < m.b + m.beats) { this.samples[i].push(best); break; }
    }
  }

  // Finalise every move whose window (plus reaction grace) has passed.
  update(beat) {
    const out = [];
    const grace = 0.55 / this.spb;
    while (this.next < this.moves.length) {
      const m = this.moves[this.next];
      if (beat < m.b + m.beats + grace) break;
      const s = this.samples[this.next].slice().sort((a, b) => b - a);
      const n = Math.max(1, Math.ceil(s.length * 0.7));
      const sim = s.length ? s.slice(0, n).reduce((a, b) => a + b, 0) / n : 0;
      const r = ratingFor(sim);
      let pts = r.pts;
      const goldHit = m.gold && sim >= GOLD_MIN;
      if (goldHit) { pts += GOLD_BONUS; this.gold.hit++; }
      this.points += pts;
      this.counts[r.key]++;
      this.simSum += sim;
      this.judged++;
      out.push({ move: m, sim, rating: r, gold: m.gold, goldHit, pts });
      this.samples[this.next] = null;
      this.next++;
    }
    return out;
  }

  get accuracy() { return this.judged ? this.simSum / this.judged : 0; }
}

// Synthetic dancer for autoplay mode: follows the coach with a human-ish
// delay and a skill level that drifts from move to move.
export class DemoDancer {
  constructor(timeline, spb, skill = 0.8) {
    this.timeline = timeline;
    this.spb = spb;
    this.skill = skill;
    this.moveIdx = -1;
    this.noise = [];
    this.lag = 0.2;
  }

  vectors(beat) {
    const idx = Math.floor(beat / 4);
    if (idx !== this.moveIdx) {
      this.moveIdx = idx;
      const sloppy = Math.random() > this.skill;
      const sigma = sloppy ? 25 + Math.random() * 45 : 4 + Math.random() * 12;
      this.noise = LIMBS.map(() => (Math.random() * 2 - 1) * sigma);
      this.lag = 0.12 + Math.random() * 0.25;
    }
    const J = joints(this.timeline.poseAt(beat - this.lag / this.spb));
    const t = performance.now() / 1000;
    return limbVectors(J).map((v, i) => {
      const a = (this.noise[i] + Math.sin(t * 3 + i) * 4) * (Math.PI / 180);
      const c = Math.cos(a), s = Math.sin(a);
      return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
    });
  }
}

export function estimateKcal(seconds, accuracy, effort) {
  const perMinute = 3 + effort * 1.6 + accuracy * 4;
  return Math.round((seconds / 60) * perMinute);
}
