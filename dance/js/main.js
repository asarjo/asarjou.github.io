import { AudioEngine } from './audio.js';
import { compileSong } from './music.js';
import { SONGS } from './songs.js';
import { MOVES } from './moves.js';
import { Timeline, joints, drawFigure } from './body.js';
import { Stage } from './stage.js';
import { Tracker } from './tracker.js';
import {
  PlayerScorer, DemoDancer, playerVectors, visibility, starsFor, tierFor,
  STAR_STEPS, MAX_SCORE, RATINGS, estimateKcal,
} from './scoring.js';

const $ = (s) => document.querySelector(s);
const PLAYER_COLORS = ['#00e5ff', '#ff5fd2'];

// ------------------------------------------------------------ persistence --

const STORE_KEY = 'grooveparty.v1';
const store = (() => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
})();
store.best ||= {};
const settings = Object.assign(
  { volume: 85, lyrics: true, cam: true, names: true, players: 1, mode: 'camera', name1: 'Dancer 1', name2: 'Dancer 2' },
  store.settings,
);
function persist() {
  store.settings = settings;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch { /* private mode */ }
}

// ----------------------------------------------------------------- setup --

const engine = new AudioEngine();
engine.volume = settings.volume / 100;
const stage = new Stage($('#stage'));
const tracker = new Tracker();

const prepared = new Map();
function prep(song) {
  let p = prepared.get(song.id);
  if (!p) {
    const compiled = compileSong(song);
    const loopSec = compiled.sections.find((s) => s.energy >= 1) || compiled.sections[0];
    p = { compiled, timeline: new Timeline(compiled.moves, MOVES), loop: [loopSec.b0, loopSec.b1] };
    prepared.set(song.id, p);
  }
  return p;
}

const app = {
  screen: 'title',
  modal: null,
  songIdx: Math.min(store.lastSong ?? 0, SONGS.length - 1),
  game: null,
  previewing: null,
  cam: null,
};

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function show(id) {
  document.querySelectorAll('.screen:not(.modal)').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
  app.screen = id;
}

function openModal(id) {
  if (app.modal) $('#screen-' + app.modal).classList.remove('active');
  app.modal = id;
  $('#screen-' + id).classList.add('active');
  const first = $('#screen-' + id).querySelector('.btn.big:not(:disabled), button');
  first?.focus({ preventScroll: true });
}

function closeModal() {
  if (!app.modal) return;
  $('#screen-' + app.modal).classList.remove('active');
  app.modal = null;
}

let toastTimer;
function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------------------------------------------------------------- covers --

function renderCover(song, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const pal = song.palette;
  const gr = g.createLinearGradient(0, 0, size * 0.3, size);
  gr.addColorStop(0, pal.bg[0]); gr.addColorStop(0.6, pal.bg[1]); gr.addColorStop(1, pal.bg[2]);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  g.save();
  g.translate(size / 2, size * 0.5);
  g.fillStyle = 'rgba(255,255,255,0.09)';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, size, a, a + Math.PI / 12); g.closePath(); g.fill();
  }
  g.restore();
  const rg = g.createRadialGradient(size / 2, size * 0.5, 0, size / 2, size * 0.5, size * 0.45);
  rg.addColorStop(0, pal.accent + '88'); rg.addColorStop(1, pal.accent + '00');
  g.fillStyle = rg;
  g.fillRect(0, 0, size, size);
  const mv = MOVES[song.cover];
  const J = joints(mv.kf[mv.picto ?? 0][1]);
  const s = size * 0.86;
  drawFigure(g, J, song.coach, { ox: size / 2 - J.hc.x * s, oy: size * 0.97, s, glow: size * 0.06 });
  return c;
}

// ----------------------------------------------------------- song select --

const carousel = $('#carousel');
const cards = SONGS.map((song, i) => {
  const b = document.createElement('button');
  b.className = 'card';
  b.setAttribute('role', 'option');
  b.dataset.i = i;
  const cover = renderCover(song, 256);
  b.append(cover);
  const cap = document.createElement('div');
  cap.className = 'cap';
  cap.innerHTML = `<b>${esc(song.title)}</b><span>${esc(song.artist)}</span>`;
  b.append(cap);
  const badge = document.createElement('span');
  badge.className = 'badge';
  b.append(badge);
  b.addEventListener('click', () => {
    if (app.songIdx === i && app.screen === 'songs') openSetup();
    else selectSong(i);
  });
  carousel.append(b);
  return b;
});

function bestFor(song) { return store.best[song.id]; }

function refreshBadges() {
  SONGS.forEach((s, i) => {
    const best = bestFor(s);
    cards[i].querySelector('.badge').textContent = best ? '★'.repeat(starsFor(best.score)) || '·' : '';
  });
}

function dots(n, max = 3) {
  return `<span class="dots">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}

function renderDetail() {
  const song = SONGS[app.songIdx];
  const { compiled } = prep(song);
  const best = bestFor(song);
  const diff = ['', 'Easy', 'Medium', 'Hard'][song.difficulty];
  $('#song-detail').innerHTML = `
    <span class="genre">${esc(song.genre)}</span>
    <h3>${esc(song.title)}</h3>
    <div class="artist">${esc(song.artist)}</div>
    <div class="meta">
      <div><small>Difficulty</small><b>${dots(song.difficulty)} ${diff}</b></div>
      <div><small>Effort</small><b>${dots(song.effort)}</b></div>
      <div><small>Length</small><b>${fmtTime(compiled.duration)}</b></div>
      <div><small>Tempo</small><b>${song.bpm} BPM</b></div>
      <div><small>Coach</small><b>${esc(song.coach.name)}</b></div>
    </div>
    <div class="best">${best
      ? `Best: <b>${best.score.toLocaleString()}</b> <span class="stars">${'★'.repeat(starsFor(best.score))}</span>${tierFor(best.score) ? ` <b>${tierFor(best.score)}</b>` : ''}`
      : 'Not danced yet'}</div>
    <button class="btn big" id="btn-dance">Dance!</button>`;
  $('#btn-dance').addEventListener('click', openSetup);
}

let previewTimer;
function selectSong(i, { instant = false } = {}) {
  app.songIdx = (i + SONGS.length) % SONGS.length;
  store.lastSong = app.songIdx;
  persist();
  cards.forEach((c, k) => c.setAttribute('aria-selected', String(k === app.songIdx)));
  cards[app.songIdx].scrollIntoView({ behavior: instant ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  renderDetail();
  stage.setSong(SONGS[app.songIdx]);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => startPreview(SONGS[app.songIdx]), instant ? 0 : 280);
}

function startPreview(song) {
  if (!engine.ctx || app.screen === 'game') return;
  const { compiled, loop } = prep(song);
  engine.start(compiled, song, { fromBeat: loop[0], loop, gain: 0.7, fadeIn: 0.8 });
  app.previewing = song;
}

function stopPreview() {
  clearTimeout(previewTimer);
  if (app.previewing) engine.stop(0.25);
  app.previewing = null;
}

function goSongs() {
  closeModal();
  show('songs');
  refreshBadges();
  selectSong(app.songIdx, { instant: true });
}

// --------------------------------------------------------------- game setup --

function openSetup() {
  engine.blip('select');
  const song = SONGS[app.songIdx];
  $('#setup-song').textContent = `${song.title} — ${song.artist}`;
  syncSetup();
  openModal('setup');
}

function syncSetup() {
  document.querySelectorAll('#seg-players button').forEach((b) => b.classList.toggle('on', +b.dataset.v === settings.players));
  document.querySelectorAll('#modes .mode').forEach((b) => b.classList.toggle('on', b.dataset.mode === settings.mode));
  $('#name1').value = settings.name1;
  $('#name2').value = settings.name2;
  $('#name2').style.display = settings.players > 1 ? '' : 'none';
  $('#names').style.display = settings.mode === 'free' ? 'none' : '';
}

document.querySelectorAll('#seg-players button').forEach((b) => b.addEventListener('click', () => {
  settings.players = +b.dataset.v; engine.blip(); syncSetup();
}));
document.querySelectorAll('#modes .mode').forEach((b) => b.addEventListener('click', () => {
  settings.mode = b.dataset.mode; engine.blip(); syncSetup();
}));

$('#setup-cancel').addEventListener('click', () => { engine.blip('back'); closeModal(); });
$('#setup-go').addEventListener('click', () => {
  settings.name1 = $('#name1').value.trim() || 'Dancer 1';
  settings.name2 = $('#name2').value.trim() || 'Dancer 2';
  persist();
  engine.blip('select');
  if (settings.mode === 'camera') openCameraCheck();
  else startGame();
});

// ----------------------------------------------------------- camera check --

async function openCameraCheck() {
  openModal('camera');
  const status = $('#cam-status');
  const go = $('#cam-go');
  go.disabled = true;
  app.cam = { handsUp: 0, ready: false };
  ['#chk-body', '#chk-arms', '#chk-legs'].forEach((s) => $(s).classList.remove('ok'));
  try {
    status.textContent = 'Allow camera access to start…';
    await tracker.startCamera();
    status.textContent = 'Loading the dance tracker…';
    await tracker.setNumPoses(settings.players);
    await tracker.loadModel();
    if (app.modal !== 'camera') return;
    app.cam.ready = true;
    go.disabled = false;
    status.textContent = 'Step into view';
  } catch (err) {
    console.error(err);
    const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    status.textContent = denied
      ? 'Camera access was blocked. Allow it in your browser, or go back and pick Free dance.'
      : `Couldn't start tracking: ${String(err?.message || err).replace(/\.$/, '')}. Try Free dance instead.`;
  }
}

function camFrame(dt) {
  const C = app.cam;
  if (!C) return;
  const poses = tracker.detect();
  tracker.drawPreview($('#cam-big'), PLAYER_COLORS);
  if (!C.ready) return;
  const need = settings.players;
  const vis = poses.slice(0, need).map((p) => visibility(p.lm));
  const body = poses.length >= need;
  const arms = body && vis.every((v) => v.arms);
  const legs = body && vis.every((v) => v.legs);
  $('#chk-body').classList.toggle('ok', body);
  $('#chk-arms').classList.toggle('ok', arms);
  $('#chk-legs').classList.toggle('ok', legs);
  $('#cam-status').textContent = !poses.length
    ? 'Step into view'
    : poses.length < need ? `${poses.length} of ${need} dancers found`
      : !arms ? 'Step back a little so your arms fit'
        : 'Looking good! Raise both hands to start';
  const up = body && vis.every((v) => v.handsUp);
  C.handsUp = up ? C.handsUp + dt : Math.max(0, C.handsUp - dt * 2);
  $('#hands-meter').classList.toggle('on', C.handsUp > 0);
  $('#hands-meter i').style.width = `${Math.min(1, C.handsUp / 1.2) * 100}%`;
  if (C.handsUp >= 1.2) startGame();
}

$('#cam-go').addEventListener('click', () => startGame());
$('#cam-cancel').addEventListener('click', () => {
  engine.blip('back');
  app.cam = null;
  tracker.stop();
  closeModal();
});

// ------------------------------------------------------------------- game --

function buildHud(G) {
  const wrap = $('#hud-players');
  wrap.innerHTML = '';
  if (G.mode === 'free') return;
  G.players.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'pcard';
    el.style.setProperty('--pc', p.color);
    const marks = STAR_STEPS.map((s, k) => `<span style="left:${(s / MAX_SCORE) * 100 - 2}%" data-k="${k}">★</span>`).join('');
    el.innerHTML = `
      <div class="avatar">${esc(p.name.slice(0, 1).toUpperCase())}</div>
      <div class="pinfo">
        <div class="pname">${esc(p.name)}${G.mode === 'demo' ? ' · auto' : ''}</div>
        <div class="pscore">0</div>
        <div class="starbar"><div class="fill"></div><div class="marks">${marks}</div></div>
      </div>
      <div class="tierbadge"></div>
      <div class="rating"></div>`;
    wrap.append(el);
    p.el = el;
    p.elScore = el.querySelector('.pscore');
    p.elFill = el.querySelector('.fill');
    p.elRating = el.querySelector('.rating');
    p.elTier = el.querySelector('.tierbadge');
    p.elMarks = [...el.querySelectorAll('.marks span')];
  });
}

function startGame(fromBeat = -4) {
  const song = SONGS[app.songIdx];
  const { compiled, timeline } = prep(song);
  app.cam = null;
  closeModal();
  stopPreview();
  show('game');
  stage.setSong(song);
  const mode = settings.mode;
  const n = mode === 'free' ? 1 : settings.players;
  const players = Array.from({ length: n }, (_, i) => ({
    name: settings['name' + (i + 1)] || `Dancer ${i + 1}`,
    color: PLAYER_COLORS[i],
    scorer: mode === 'free' ? null : new PlayerScorer(compiled, timeline),
    demo: mode === 'demo' ? new DemoDancer(timeline, compiled.spb, i ? 0.62 : 0.86) : null,
    shown: 0, stars: 0, tier: null, cx: (i + 0.5) / n,
  }));
  const G = (app.game = {
    song, compiled, timeline, players, mode,
    lyricIdx: -2, lastCount: null, finished: false, paused: false, lastSection: -1,
  });
  buildHud(G);
  $('#hud-title').textContent = `${song.title} · ${song.artist}`;
  $('#cam-mini').classList.toggle('on', mode === 'camera' && settings.cam);
  $('#lyrics').classList.toggle('off', !settings.lyrics);
  $('#lyrics .cur').innerHTML = '';
  $('#lyrics .nxt').textContent = '';
  if (mode === 'camera') tracker.setNumPoses(n);
  engine.ensure();
  engine.resume();
  engine.start(compiled, song, { fromBeat, lead: 0.3 });
}

function assignPoses(G, poses) {
  const n = G.players.length;
  let list = poses;
  if (list.length > n) {
    // Keep the largest (closest) dancers, then order them left to right.
    const size = (p) => Math.abs(p.lm[11].x - p.lm[12].x);
    list = list.slice().sort((a, b) => size(b) - size(a)).slice(0, n).sort((a, b) => a.cx - b.cx);
  }
  const out = new Array(n).fill(null);
  if (list.length === n) list.forEach((p, i) => { out[i] = p; });
  else {
    for (const p of list) {
      let bi = -1, bd = Infinity;
      G.players.forEach((pl, i) => { const d = Math.abs(pl.cx - p.cx); if (!out[i] && d < bd) { bd = d; bi = i; } });
      if (bi >= 0) out[bi] = p;
    }
  }
  out.forEach((p, i) => { if (p) G.players[i].cx = p.cx; });
  return out;
}

function popRating(p, text, color) {
  const el = p.elRating;
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function callout(text) {
  const el = $('#callout');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function onRating(G, p, r) {
  const label = r.goldHit ? 'YEAH!' : r.rating.label;
  popRating(p, label, r.goldHit ? '#ffd23f' : r.rating.color);
  const box = p.el.getBoundingClientRect();
  const x = box.right + 40, y = box.top + box.height / 2;
  if (r.rating.key === 'perfect' || r.goldHit) stage.burst(x, y, [r.rating.color, '#ffffff', p.color], 16, 'spark', 0.8);
  else if (r.rating.key !== 'miss') stage.burst(x, y, [r.rating.color], 8, 'spark', 0.5);
  if (r.goldHit && !G.goldShown?.has(r.move.b)) {
    (G.goldShown ||= new Set()).add(r.move.b);
    callout('YEAH!');
    const c = stage.coachPoint('nb');
    stage.burst(c.x, c.y, ['#ffd23f', '#fff1a8', '#ffb000'], 40, 'star', 1.3);
    G.flash = 0.35;
    engine.sting('gold');
  } else if (r.rating.key === 'perfect' && p === G.players[0]) engine.sting('perfect');
}

function updateLyrics(G, beat) {
  const L = G.compiled.lyrics;
  let idx = -1;
  for (let i = 0; i < L.length; i++) {
    if (beat >= L[i].b0 - 2 && beat < L[i].b1 + 1) { idx = i; break; }
    if (L[i].b0 - 2 > beat) break;
  }
  if (idx !== G.lyricIdx) {
    G.lyricIdx = idx;
    const cur = $('#lyrics .cur');
    cur.innerHTML = '';
    G.lyricEls = [];
    if (idx >= 0) {
      for (const s of L[idx].syl) {
        const el = document.createElement('s');
        el.textContent = s.t + (s.end ? ' ' : '');
        cur.append(el);
        G.lyricEls.push([el, s.b]);
      }
    }
    const next = L[idx >= 0 ? idx + 1 : L.findIndex((l) => l.b0 > beat)];
    $('#lyrics .nxt').textContent = next && next.b0 - beat < 12 ? next.syl.map((s) => s.t + (s.end ? ' ' : '')).join('') : '';
  }
  for (const [el, b] of G.lyricEls || []) el.classList.toggle('on', beat >= b - 0.05);
}

function gameFrame(st, dt) {
  const G = app.game;
  const beat = engine.beat();
  const { compiled } = G;
  st.mode = 'game';
  st.beat = beat;
  st.pose = G.timeline.poseAt(beat);
  st.moves = compiled.moves;

  // Count-in
  if (beat < 0.6) {
    const n = Math.floor(beat);
    if (n !== G.lastCount && n >= -4) {
      G.lastCount = n;
      const el = $('#countdown');
      el.textContent = n < -1 ? String(-n - 1) : n === -1 ? 'DANCE!' : '';
      el.classList.remove('show'); void el.offsetWidth;
      if (n < 0) { el.classList.add('show'); engine.blip(n === -1 ? 'select' : 'move'); }
    }
  }

  const mi = Math.floor(beat / 4);
  const move = compiled.moves[mi];
  st.gold = move && move.gold ? 1 : 0;
  if (settings.names && move && move.id !== 'groove') st.moveName = MOVES[move.id].name;

  const secIdx = compiled.sections.findIndex((s) => beat >= s.b0 && beat < s.b1);
  const sec = compiled.sections[secIdx];
  st.energy = sec ? sec.energy : 0.4;
  st.drop = !!sec?.drop;
  if (secIdx !== G.lastSection) {
    G.lastSection = secIdx;
    if (sec && sec.energy >= 1 && G.mode !== 'free') stage.confetti(30, [G.song.palette.accent, G.song.palette.accent2, '#ffffff']);
  }

  // Input
  if (!G.paused && beat >= 0 && beat < compiled.totalBeats + 1) {
    if (G.mode === 'camera') {
      const poses = assignPoses(G, tracker.detect());
      poses.forEach((p, i) => { if (p) G.players[i].scorer.addSample(beat, playerVectors(p.lm, tracker.aspect)); });
    } else if (G.mode === 'demo') {
      for (const p of G.players) p.scorer.addSample(beat, p.demo.vectors(beat));
    }
  }
  if (G.mode === 'camera' && settings.cam) tracker.drawPreview($('#cam-mini'), PLAYER_COLORS);

  // Judging and HUD
  for (const p of G.players) {
    if (!p.scorer) continue;
    for (const r of p.scorer.update(beat)) onRating(G, p, r);
    const target = p.scorer.score;
    p.shown += (target - p.shown) * Math.min(1, dt * 7);
    if (Math.abs(target - p.shown) < 1) p.shown = target;
    p.elScore.textContent = Math.round(p.shown).toLocaleString();
    p.elFill.style.width = `${Math.min(100, (target / MAX_SCORE) * 100)}%`;
    const stars = starsFor(target);
    p.elMarks.forEach((m, k) => m.classList.toggle('on', k < stars));
    if (stars > p.stars) { p.stars = stars; engine.sting('perfect'); }
    const tier = tierFor(target);
    if (tier !== p.tier) { p.tier = tier; p.elTier.textContent = tier || ''; p.elTier.classList.toggle('on', !!tier); }
  }

  if (settings.lyrics) updateLyrics(G, beat);
  $('#hud-prog').style.width = `${Math.max(0, Math.min(100, (beat / compiled.totalBeats) * 100))}%`;

  if (G.flash) { st.flash = G.flash; st.flashColor = '#ffe9a0'; G.flash = Math.max(0, G.flash - dt * 1.2); }

  if (!G.finished && beat >= compiled.totalBeats + 1.5) finishGame();
}

function pauseGame() {
  const G = app.game;
  if (!G || G.paused || G.finished) return;
  G.paused = true;
  engine.pause();
  openModal('pause');
}

function resumeGame() {
  const G = app.game;
  if (!G) return;
  closeModal();
  G.paused = false;
  engine.resume();
}

function quitToSongs() {
  engine.stop(0.2);
  app.game = null;
  tracker.stop();
  engine.resume();
  goSongs();
}

function finishGame() {
  const G = app.game;
  G.finished = true;
  engine.stop(2.5);
  tracker.stop();
  const song = G.song;
  const dur = G.compiled.duration;
  const cards = $('#res-cards');
  cards.innerHTML = '';
  if (G.mode === 'free') {
    $('#res-title').textContent = 'Great workout!';
    $('#res-sub').textContent = `${song.title} · Free dance`;
    const el = document.createElement('div');
    el.className = 'rcard';
    el.style.setProperty('--pc', song.palette.accent);
    el.innerHTML = `<div class="who"><b>You danced ${fmtTime(dur)}</b></div>
      <div class="extra"><span>About <b>${estimateKcal(dur, 0.6, song.effort)} kcal</b> burned</span><span>Try <b>Camera</b> mode to get scored</span></div>`;
    cards.append(el);
  } else {
    const ranked = G.players.slice().sort((a, b) => b.scorer.score - a.scorer.score);
    const winner = G.players.length > 1 ? ranked[0] : null;
    const top = ranked[0].scorer.score;
    $('#res-title').textContent = winner && ranked[0].scorer.score !== ranked[1].scorer.score
      ? `${winner.name} wins!`
      : top >= 7500 ? 'Superb!' : top >= 4500 ? 'Nice moves!' : 'Keep grooving!';
    $('#res-sub').textContent = `${song.title} · ${song.artist}${G.mode === 'demo' ? ' · Autoplay demo' : ''}`;
    G.players.forEach((p, i) => {
      const sc = p.scorer;
      const score = sc.score;
      const stars = starsFor(score);
      const tier = tierFor(score);
      let isBest = false;
      if (G.mode === 'camera') {
        const prev = store.best[song.id];
        if (!prev || score > prev.score) {
          store.best[song.id] = { score, name: p.name, date: Date.now() };
          isBest = true;
          persist();
        }
      }
      const total = Math.max(1, sc.judged);
      const rows = RATINGS.map((r) => `
        <span style="color:${r.color}">${r.label}</span>
        <span class="bar"><i style="width:${(sc.counts[r.key] / total) * 100}%;background:${r.color}"></i></span>
        <span>${sc.counts[r.key]}</span>`).join('');
      const el = document.createElement('div');
      el.className = 'rcard';
      el.style.setProperty('--pc', p.color);
      el.style.animationDelay = `${i * 0.15}s`;
      el.innerHTML = `
        ${isBest ? '<div class="newbest">NEW BEST!</div>' : ''}
        <div class="who"><div class="avatar" style="--pc:${p.color}">${esc(p.name.slice(0, 1).toUpperCase())}</div><b>${esc(p.name)}</b></div>
        <div class="score" data-score="${score}">0</div>
        <div class="stars">${Array.from({ length: 5 }, (_, k) => `<span class="${k < stars ? 'on' : ''}" style="animation-delay:${0.6 + k * 0.18}s">★</span>`).join('')}${tier ? `<span class="tier">${tier}</span>` : ''}</div>
        <div class="breakdown">${rows}</div>
        <div class="extra">
          <span>Gold moves <b>${sc.gold.hit}/${sc.gold.total}</b></span>
          <span>Accuracy <b>${Math.round(sc.accuracy * 100)}%</b></span>
          <span>≈ <b>${estimateKcal(dur, sc.accuracy, song.effort)} kcal</b></span>
        </div>`;
      cards.append(el);
    });
    countUp();
  }
  setTimeout(() => {
    if (!app.game || app.game !== G) return;
    show('results');
    refreshBadges();
    stage.confetti(90, [song.palette.accent, song.palette.accent2, '#ffd23f', '#ffffff']);
    $('#res-again').focus({ preventScroll: true });
  }, 1200);
}

function countUp() {
  const els = [...document.querySelectorAll('#res-cards .score')];
  const t0 = performance.now() + 1300;
  const step = (now) => {
    const u = Math.max(0, Math.min(1, (now - t0) / 1400));
    const e = 1 - Math.pow(1 - u, 3);
    els.forEach((el) => { el.textContent = Math.round(+el.dataset.score * e).toLocaleString(); });
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ------------------------------------------------------------------ loop --

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const st = { now: now / 1000, dt, pulse: engine.pulseLevel(), energy: 0.6, mode: 'menu', dim: 0 };
  if (app.screen === 'game' && app.game) {
    gameFrame(st, dt);
  } else {
    const song = SONGS[app.songIdx];
    const { timeline, loop, compiled } = prep(song);
    let beat;
    if (engine.playing && app.previewing === song) beat = engine.beat();
    else beat = loop[0] + ((now / 1000) * (song.bpm / 60)) % (loop[1] - loop[0]);
    st.beat = beat;
    st.pose = timeline.poseAt(beat);
    st.energy = app.previewing ? 0.9 : 0.5;
    if (app.screen === 'songs') st.floorY = $('.carousel-wrap').getBoundingClientRect().top + 6;
    st.dim = app.screen === 'results' ? 0.35 : app.modal ? 0.15 : 0;
    if (!app.previewing && app.screen !== 'results') st.pulse = Math.max(0, Math.cos(((beat % 1) * Math.PI) / 2)) ** 6 * 0.6;
    void compiled;
  }
  if (app.modal === 'camera') camFrame(dt);
  stage.render(st);
}

// --------------------------------------------------------------- wiring --

$('#btn-play').addEventListener('click', () => {
  engine.ensure();
  engine.resume();
  engine.blip('select');
  goSongs();
});
$('#btn-how').addEventListener('click', () => { engine.ensure(); engine.blip(); openModal('how'); });
$('#how-close').addEventListener('click', () => { engine.blip('back'); closeModal(); });
$('#songs-back').addEventListener('click', () => { engine.blip('back'); stopPreview(); show('title'); });
$('#car-prev').addEventListener('click', () => { engine.blip(); selectSong(app.songIdx - 1); });
$('#car-next').addEventListener('click', () => { engine.blip(); selectSong(app.songIdx + 1); });
$('#btn-pause').addEventListener('click', pauseGame);
$('#pause-resume').addEventListener('click', resumeGame);
$('#pause-restart').addEventListener('click', () => { closeModal(); engine.resume(); startGame(); });
$('#pause-quit').addEventListener('click', () => { closeModal(); quitToSongs(); });
$('#res-again').addEventListener('click', () => {
  engine.blip('select');
  if (settings.mode === 'camera') { show('songs'); openCameraCheck(); } else startGame();
});
$('#res-songs').addEventListener('click', () => { engine.blip('back'); app.game = null; goSongs(); });

// Settings
$('#btn-settings').addEventListener('click', () => {
  $('#set-volume').value = settings.volume;
  $('#set-lyrics').checked = settings.lyrics;
  $('#set-cam').checked = settings.cam;
  $('#set-names').checked = settings.names;
  openModal('settings');
});
$('#set-volume').addEventListener('input', (e) => { settings.volume = +e.target.value; engine.setVolume(settings.volume / 100); persist(); });
$('#set-lyrics').addEventListener('change', (e) => { settings.lyrics = e.target.checked; persist(); });
$('#set-cam').addEventListener('change', (e) => { settings.cam = e.target.checked; persist(); });
$('#set-names').addEventListener('change', (e) => { settings.names = e.target.checked; persist(); });
$('#settings-close').addEventListener('click', () => { engine.blip('back'); closeModal(); });

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.key !== 'Enter' && e.key !== 'Escape') return;
  const k = e.key;
  if (app.modal) {
    if (k === 'Escape') {
      e.preventDefault();
      if (app.modal === 'pause') resumeGame();
      else if (app.modal === 'camera') $('#cam-cancel').click();
      else closeModal();
    } else if (k === 'Enter' && app.modal === 'setup') { e.preventDefault(); $('#setup-go').click(); }
    return;
  }
  switch (app.screen) {
    case 'title':
      if (k === 'Enter' || k === ' ') { e.preventDefault(); $('#btn-play').click(); }
      break;
    case 'songs':
      if (k === 'ArrowRight') { e.preventDefault(); engine.blip(); selectSong(app.songIdx + 1); }
      else if (k === 'ArrowLeft') { e.preventDefault(); engine.blip(); selectSong(app.songIdx - 1); }
      else if (k === 'Enter') { e.preventDefault(); openSetup(); }
      else if (k === 'Escape') $('#songs-back').click();
      break;
    case 'game':
      if (k === 'Escape' || k === 'p' || k === 'P') { e.preventDefault(); pauseGame(); }
      break;
    case 'results':
      if (k === 'Enter') { e.preventDefault(); $('#res-again').click(); }
      else if (k === 'Escape') $('#res-songs').click();
      break;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.screen === 'game') pauseGame();
});

// Swipe through songs on touch screens.
let touchX = null;
$('#screen-songs').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$('#screen-songs').addEventListener('touchend', (e) => {
  if (touchX == null || e.target.closest('.carousel')) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 60) selectSong(app.songIdx + (dx < 0 ? 1 : -1));
  touchX = null;
});

// Keep the lyrics clear of the pictogram track.
function layoutHud() {
  const { size, hitX } = stage.pictoGeom();
  document.documentElement.style.setProperty('--picto-w', `${Math.round(stage.W - hitX + size * 0.65)}px`);
}
window.addEventListener('resize', layoutHud);
layoutHud();

stage.setSong(SONGS[app.songIdx]);
requestAnimationFrame(frame);

// Debug/automation hook: ?autostart=<song-id>&mode=demo jumps straight in.
const qs = new URLSearchParams(location.search);
if (qs.get('autostart')) {
  const i = SONGS.findIndex((s) => s.id === qs.get('autostart'));
  if (i >= 0) app.songIdx = i;
  settings.mode = qs.get('mode') || 'demo';
  settings.players = +(qs.get('players') || 1);
  engine.ensure();
  startGame(+(qs.get('from') || -4));
}
