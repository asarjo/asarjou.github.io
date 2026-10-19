// Turns the compact song descriptions in songs.js into a flat, beat-timed
// list of note events plus the lyric and choreography timelines.
//
// Patterns are written on a 16-step (sixteenth note) grid per 4/4 bar.
//   drums:   'x' hit, 'X' accent, 'g' ghost, '.' rest
//   bass:    'x' root, 'o' octave, '5' fifth, '3' third, '7' seventh,
//            'b' semitone below root, '-' hold, '.' rest
//   comp:    'x' chord hit, '-' hold, '.' rest
//   melody:  space separated tokens: note name (C5, F#4, Bb4), '-' hold, '.' rest

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14], 6: [0, 4, 7, 9],
};

export function noteToMidi(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error('Bad note: ' + s);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
}

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function parseChord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  if (!m || !(m[3] in QUALITY)) throw new Error('Bad chord: ' + name);
  const pc = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  return { pc, ivs: QUALITY[m[3]] };
}

const fold = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;

function voicing(ch) {
  const notes = ch.ivs.map((iv) => fold((ch.pc + iv) % 12, 55));
  notes.push(fold(ch.pc, 55) + 12);
  return [...new Set(notes)].sort((a, b) => a - b);
}

function holdRuns(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '.' || c === '-') continue;
    let len = 1;
    while (i + len < str.length && str[i + len] === '-') len++;
    out.push({ step: i, len, ch: c });
  }
  return out;
}

function melodyBar(str) {
  const toks = str.trim().split(/\s+/);
  if (toks.length !== 16) throw new Error(`Melody bar needs 16 steps, got ${toks.length}: ${str}`);
  const out = [];
  for (let i = 0; i < 16; i++) {
    const t = toks[i];
    if (t === '.' || t === '-') continue;
    let len = 1;
    while (i + len < 16 && toks[i + len] === '-') len++;
    out.push({ step: i, len, midi: noteToMidi(t) });
  }
  return out;
}

function vowelOf(syl) {
  const m = /[aeiouy]/i.exec(syl);
  if (!m) return 'a';
  const v = m[0].toLowerCase();
  return v === 'y' ? 'i' : v;
}

function parseLyricLine(line) {
  const syl = [];
  for (const word of line.trim().split(/\s+/)) {
    const parts = word.split('-');
    parts.forEach((p, i) => syl.push({ t: p, end: i === parts.length - 1 }));
  }
  return syl;
}

const DRUM_VEL = { x: 0.8, X: 1, g: 0.35 };

export function compileSong(song) {
  const ev = [];
  const lyrics = [];
  const moves = [];
  const sections = [];
  let bar = 0;

  for (const sec of song.structure) {
    const prog = song.progs[sec.prog || 'A'];
    const b0 = bar * 4;
    sections.push({ name: sec.name, b0, b1: (bar + sec.bars) * 4, energy: sec.energy ?? 0.7, drop: !!sec.drop });
    const melNotes = [];

    if (sec.crash) ev.push({ b: b0, i: 'crash', v: 0.9 });
    if (sec.riser) ev.push({ b: b0 + (sec.bars - sec.riser) * 4, i: 'riser', d: sec.riser * 4, v: 0.8 });

    for (let i = 0; i < sec.bars; i++) {
      const B = (bar + i) * 4;
      const ch = parseChord(prog[i % prog.length]);
      const last = i === sec.bars - 1;

      for (const kitName of [].concat(sec.drums || [])) {
        const kit = song.drums[kitName];
        for (const [inst, pat] of Object.entries(kit)) {
          for (let s = 0; s < 16; s++) {
            const c = pat[s];
            if (!DRUM_VEL[c]) continue;
            if (last && sec.fill && s >= 8 && inst !== 'kick') continue;
            ev.push({ b: B + s / 4, i: inst, v: DRUM_VEL[c] });
          }
        }
      }
      if (last && sec.fill) {
        for (let s = 8; s < 16; s++) ev.push({ b: B + s / 4, i: 'snare', v: 0.35 + (s - 8) * 0.08 });
      }

      if (sec.bass) {
        const root = fold(ch.pc, 33);
        for (const r of holdRuns(song.bass[sec.bass])) {
          const n = { x: root, o: root + 12, 5: root + 7, 3: root + ch.ivs[1], 7: root + (ch.ivs[3] ?? 10), b: root - 1 }[r.ch];
          if (n == null) continue;
          ev.push({ b: B + r.step / 4, i: 'bass', n, d: r.len / 4, v: 0.85 });
        }
      }

      for (const compName of [].concat(sec.comp || [])) {
        const comp = song.comp[compName];
        const notes = voicing(ch);
        for (const r of holdRuns(comp.pat)) {
          ev.push({ b: B + r.step / 4, i: 'comp', inst: comp.inst, n: notes, d: r.len / 4, v: comp.vel ?? 0.7 });
        }
      }

      if (sec.arp) {
        const arp = song.arp;
        const tones = voicing(ch).map((n) => n + 12);
        const seq = arp.order.split('').map(Number);
        const step = arp.rate === 8 ? 2 : 1;
        for (let s = 0, k = 0; s < 16; s += step, k++) {
          ev.push({ b: B + s / 4, i: 'arp', n: tones[seq[k % seq.length] % tones.length], d: step / 4 * 0.9, v: 0.5 });
        }
      }

      const mel = sec.mel && song.melodies[sec.mel];
      if (mel) {
        const barStr = mel[i % mel.length];
        for (const n of melodyBar(barStr)) {
          const e = { b: B + n.step / 4, i: 'lead', n: n.midi, d: n.len / 4, v: 0.8, bar: i % mel.length, vowel: 'a' };
          ev.push(e);
          melNotes.push(e);
        }
      }

      const mvList = sec.moves || ['groove'];
      const tok = mvList[i % mvList.length];
      const m = /^(\w+)([~!]*)$/.exec(tok);
      moves.push({ id: m[1], b: B, beats: 4, mirror: m[2].includes('~'), gold: m[2].includes('!') });
    }

    // Lyrics: line k of a section is sung over melody bars 2k and 2k+1.
    const lines = sec.mel && song.lyrics?.[sec.mel];
    if (lines) {
      const byLine = new Map();
      for (const e of melNotes) {
        const sectionBar = Math.floor((e.b - b0) / 4);
        const k = Math.floor(sectionBar / 2);
        if (!byLine.has(k)) byLine.set(k, []);
        byLine.get(k).push(e);
      }
      for (const [k, notes] of byLine) {
        const text = lines[k % lines.length];
        if (!text) continue;
        const syl = parseLyricLine(text);
        const out = syl.map((s, j) => {
          const n = notes[j];
          if (n) n.vowel = vowelOf(s.t);
          return { t: s.t, end: s.end, b: n ? n.b : notes[notes.length - 1].b, d: n ? n.d : 0.25 };
        });
        const lastN = notes[notes.length - 1];
        lyrics.push({ b0: notes[0].b, b1: lastN.b + lastN.d, syl: out });
      }
    }

    bar += sec.bars;
  }

  ev.sort((a, b) => a.b - b.b);
  lyrics.sort((a, b) => a.b0 - b.b0);
  const totalBeats = bar * 4;
  return { ev, lyrics, moves, sections, totalBeats, bpm: song.bpm, spb: 60 / song.bpm, duration: totalBeats * 60 / song.bpm };
}

// Checks used by the build script: lyric syllables should line up with notes.
export function lintSong(song) {
  const problems = [];
  for (const [name, lines] of Object.entries(song.lyrics || {})) {
    const mel = song.melodies[name];
    if (!mel) { problems.push(`${song.id}: lyrics "${name}" without melody`); continue; }
    lines.forEach((line, k) => {
      const notes = [mel[2 * k], mel[2 * k + 1]].filter(Boolean).flatMap(melodyBar).length;
      const syl = parseLyricLine(line).length;
      if (notes !== syl) problems.push(`${song.id}/${name} line ${k + 1}: ${syl} syllables vs ${notes} notes — "${line}"`);
    });
  }
  return problems;
}
