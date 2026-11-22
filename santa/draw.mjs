#!/usr/bin/env node
// Secret Santa draw: assigns everyone a recipient, encrypts each result with a
// personal code, and writes data.json for the page in this folder.
//
//   node santa/draw.mjs --names names.txt [--title "Office Santa"] [--budget "£20"]
//        [--date 2026-12-19] [--exclude "Alex|Priya"] [--base https://example.com/santa/]
//        [--out santa/data.json] [--links links.csv] [--show-matches]
//
// names.txt: one name per line. Lines starting with # are ignored.
// It prints one personal link per person. It does NOT print who got whom
// unless you pass --show-matches.

import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.names) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 12).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(args.help ? 0 : 1);
}

const base = (args.base || 'https://asarjo.github.io/asarjou.github.io/santa/').replace(/#.*$/, '');
const out = args.out || new URL('./data.json', import.meta.url).pathname;
const names = parseNames(readFileSync(args.names, 'utf8'));
const exclusions = [].concat(args.exclude || []).map(s => s.split('|').map(x => x.trim())).filter(p => p.length === 2);

if (names.length < 3) fail('Add at least three people.');
const lower = new Map(names.map(n => [n.toLowerCase(), n]));
for (const p of exclusions) for (const n of p) if (!lower.has(n.toLowerCase())) fail(`Keep-apart name not in the list: ${n}`);
const normalizedEx = exclusions.map(p => p.map(n => lower.get(n.toLowerCase())));

const map = draw(names, normalizedEx);
if (!map) fail('These keep-apart rules make a draw impossible.');

const enc = new TextEncoder();
const entries = [];
const links = [];
for (const giver of names) {
  const token = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const id = hex(await sha256('santa-id|' + token));
  const keyBytes = await sha256('santa-key|' + token);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = enc.encode(JSON.stringify({ g: giver, r: map[giver] }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
  entries.push({ id, iv: b64u(iv), ct: b64u(ct) });
  links.push({ name: giver, link: base + '#' + token });
}
shuffle(entries); // so the file order says nothing about the circle

const data = {
  phase: 'drawn',
  title: args.title || 'Secret Santa',
  budget: args.budget || '',
  date: args.date || '',
  people: names.length,
  drawnAt: new Date().toISOString(),
  entries,
};
writeFileSync(out, JSON.stringify(data, null, 2) + '\n');

const width = Math.max(...links.map(l => l.name.length));
console.log(`Sealed ${names.length} envelopes into ${out}\n`);
console.log('Send each person their own link:\n');
for (const l of links) console.log(`  ${l.name.padEnd(width)}  ${l.link}`);
if (args.links) {
  writeFileSync(args.links, 'name,link\n' + links.map(l => `${csv(l.name)},${csv(l.link)}`).join('\n') + '\n');
  console.log(`\nLinks also written to ${args.links} (keep that file private).`);
}
if (args['show-matches']) {
  console.log('\nMatches (you asked to see them):');
  for (const g of names) console.log(`  ${g.padEnd(width)}  →  ${map[g]}`);
}
console.log('\nCommit and publish data.json. The links only work once it is live.');

// ---------- helpers ----------
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (k === 'help' || k === 'show-matches') { o[k] = true; continue; }
    const v = argv[++i];
    if (k === 'exclude') (o.exclude ||= []).push(v); else o[k] = v;
  }
  return o;
}
function parseNames(text) {
  const seen = new Set(), names = [];
  for (const raw of text.split(/\r?\n/)) {
    const n = raw.trim().replace(/\s+/g, ' ');
    if (!n || n.startsWith('#')) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) fail(`Duplicate name: ${n}. Add a surname initial so each person is distinct.`);
    seen.add(k); names.push(n);
  }
  return names;
}
function rand(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = rand(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function draw(names, exclusions) {
  const banned = new Set();
  for (const [a, b] of exclusions) { banned.add(a + '\0' + b); banned.add(b + '\0' + a); }
  const n = names.length;
  // First choice: one circle, so nobody gets themselves and no two people swap.
  for (let t = 0; t < 4000; t++) {
    const order = shuffle(names.slice());
    if (order.every((g, i) => !banned.has(g + '\0' + order[(i + 1) % n]))) {
      return Object.fromEntries(order.map((g, i) => [g, order[(i + 1) % n]]));
    }
  }
  // Fallback when the rules make a single circle impossible.
  for (let t = 0; t < 4000; t++) {
    const rec = shuffle(names.slice());
    if (names.every((g, i) => rec[i] !== g && !banned.has(g + '\0' + rec[i]))) {
      return Object.fromEntries(names.map((g, i) => [g, rec[i]]));
    }
  }
  return null;
}
async function sha256(str) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str))); }
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }
function b64u(bytes) { return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function csv(s) { return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function fail(msg) { console.error('Error: ' + msg); process.exit(1); }
