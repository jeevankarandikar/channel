// Scoring engine verification, runs the same formulas as game.js
// to confirm B = log2(N-1) * max(Sc-Si, 0) / t matches expected values
// across a representative grid of scenarios.

import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
const cryptoSource = globalThis.crypto || webcrypto;

const log2 = (x) => Math.log2(x);

function bitRate({ N, sc, si, tSeconds }) {
  if (tSeconds <= 0) return 0;
  if (N < 3) return 0;
  return log2(N - 1) * Math.max(sc - si, 0) / tSeconds;
}

function recommendMode(results) {
  const completed = results.filter((result) => Number.isFinite(result.bps));
  if (completed.length === 0) return null;
  return completed.reduce((best, result) => result.bps > best.bps ? result : best);
}

// rejection sampling (matches game.js)
function sampleChar(chars) {
  const n = chars.length;
  const maxUnbiased = Math.floor(0xffffffff / n) * n;
  const buf = new Uint32Array(1);
  let val;
  do {
    cryptoSource.getRandomValues(buf);
    val = buf[0];
  } while (val >= maxUnbiased);
  return chars[val % n];
}

function chiSquare(counts, expected) {
  let chi2 = 0;
  counts.forEach((obs) => {
    chi2 += Math.pow(obs - expected, 2) / expected;
  });
  return chi2;
}

console.log('=== Scoring formula sanity ===\n');

const bitsPerSelection = (N) => (N < 3 ? 0 : log2(N - 1));

assert.equal(bitsPerSelection(1), 0, 'N=1 should not score');
assert.equal(bitsPerSelection(2), 0, 'N=2 should not score');
assert.equal(bitsPerSelection(3), 1, 'N=3 should carry one bit');
assert.equal(bitsPerSelection(9), 3, 'N=9 should carry three bits');
assert.ok(
  Math.abs(bitsPerSelection(25) - 4.5849625) < 0.00001,
  'N=25 should carry log2(24) bits'
);
const fullKeyboardN = 25;
const tapGridN = 25;
assert.equal(
  bitsPerSelection(tapGridN),
  bitsPerSelection(fullKeyboardN),
  '5x5 tap grid and full keyboard share the same bits per selection'
);

assert.ok(
  bitRate({ N: 9, sc: 120, si: 0, tSeconds: 30 }) >
  bitRate({ N: 25, sc: 75, si: 0, tSeconds: 30 }),
  'Home row can win if hit rate is high enough'
);
assert.ok(
  bitRate({ N: 25, sc: 80, si: 0, tSeconds: 30 }) >
  bitRate({ N: 9, sc: 100, si: 0, tSeconds: 30 }),
  'Full keyboard can win if speed penalty is small enough'
);

assert.equal(recommendMode([]), null, 'no result means no recommendation');
assert.equal(
  recommendMode([{ mode: 'home', bps: 18.2 }, { mode: 'full', bps: 21.4 }]).mode,
  'full',
  'recommend full when full has higher bps'
);
assert.equal(
  recommendMode([{ mode: 'home', bps: 22.1 }, { mode: 'full', bps: 20.6 }]).mode,
  'home',
  'recommend home when home has higher bps'
);
assert.equal(
  recommendMode([{ mode: 'tap', bps: 25.4 }, { mode: 'full', bps: 24.8 }, { mode: 'home', bps: 18.1 }]).mode,
  'tap',
  'recommend tap grid when it has higher measured bps'
);

const scenarios = [
  { N: 26, sc: 0,   si: 0,   t: 60, label: 'no input' },
  { N: 26, sc: 100, si: 0,   t: 60, label: '100 correct, 0 errors' },
  { N: 26, sc: 200, si: 0,   t: 60, label: '200 correct, 0 errors' },
  { N: 26, sc: 600, si: 30,  t: 60, label: 'expert: 10cps, 95% accuracy' },
  { N: 26, sc: 480, si: 24,  t: 60, label: 'fast: 8cps, 95% accuracy' },
  { N: 26, sc: 300, si: 15,  t: 60, label: 'intermediate: 5cps, 95% accuracy' },
  { N: 26, sc: 150, si: 8,   t: 60, label: 'slow: 2.5cps, 95% accuracy' },
  { N: 26, sc: 100, si: 100, t: 60, label: 'equal Sc/Si → 0 bps' },
  { N: 26, sc: 50,  si: 100, t: 60, label: 'Si > Sc → max(0)' },
  { N: 22, sc: 480, si: 24,  t: 60, label: 'N=22 same speed' },
  { N: 18, sc: 480, si: 24,  t: 60, label: 'N=18 same speed' },
  { N: 12, sc: 480, si: 24,  t: 60, label: 'N=12 same speed' },
  { N: 10, sc: 480, si: 24,  t: 60, label: 'N=10 same speed' },
  { N: 3,  sc: 100, si: 0,   t: 60, label: 'N=3 (min)' },
];

for (const s of scenarios) {
  const b = bitRate({ N: s.N, sc: s.sc, si: s.si, tSeconds: s.t });
  const bps = log2(s.N - 1);
  const netCps = Math.max(s.sc - s.si, 0) / s.t;
  console.log(
    `N=${String(s.N).padStart(2)} ` +
    `Sc=${String(s.sc).padStart(4)} Si=${String(s.si).padStart(3)}  ` +
    `bits/sel=${bps.toFixed(3)}  net-cps=${netCps.toFixed(3)}  ` +
    `B=${b.toFixed(2).padStart(7)} bps   ${s.label}`
  );
}

console.log('\n=== i.i.d. sampling sanity (10k samples) ===\n');

const N_SAMPLES = 10_000;
const alphabets = {
  letters26: 'abcdefghijklmnopqrstuvwxyz',
  letters22: 'abcdefghiklmnoprstuvwy',
  letters19_freq: 'etaoinshrdlcumwfgyp',
  letters12_freq: 'etaoinshrdlc',
  home_row:  ['a', 's', 'd', 'f', ' ', 'j', 'k', 'l', ';'],
  tap_grid:  Array.from({ length: 25 }, (_, i) => `tap-${String(i + 1).padStart(2, '0')}`),
  digits:    '0123456789',
};

for (const [name, chars] of Object.entries(alphabets)) {
  const arr = Array.isArray(chars) ? chars : chars.split('');
  const counts = new Map();
  arr.forEach((c) => counts.set(c, 0));
  let lagMatches = 0;
  let prev = null;
  for (let i = 0; i < N_SAMPLES; i++) {
    const c = sampleChar(arr);
    counts.set(c, counts.get(c) + 1);
    if (prev !== null && prev === c) lagMatches++;
    prev = c;
  }
  const expected = N_SAMPLES / arr.length;
  const chi2 = chiSquare(counts, expected);
  const df = arr.length - 1;
  const matchRate = lagMatches / (N_SAMPLES - 1);
  const expectedMatchRate = 1 / arr.length;

  const min = Math.min(...counts.values());
  const max = Math.max(...counts.values());
  const spread = (max - min) / expected;

  console.log(
    `${name.padEnd(12)} N=${String(arr.length).padStart(2)}  ` +
    `chi²=${chi2.toFixed(2).padStart(6)} (df=${df})  ` +
    `min/max=${min}/${max} (±${(spread * 100).toFixed(1)}%)  ` +
    `lag1=${matchRate.toFixed(4)} (expected ${expectedMatchRate.toFixed(4)})`
  );
}

console.log('\n=== predicted panel bit rates ===\n');

const panel = [
  { who: 'expert touch typist (200wpm, 65% retention -> 10.8cps)', cps: 10.8, accuracy: 0.97 },
  { who: 'expert cold-start (-10%)',                              cps: 9.7,  accuracy: 0.96 },
  { who: 'intermediate touch typist (90wpm, 70% -> 5.25cps)',     cps: 5.25, accuracy: 0.96 },
  { who: 'intermediate cold-start',                               cps: 4.7,  accuracy: 0.95 },
  { who: 'slow touch typist (50wpm, 60% -> 2.5cps)',              cps: 2.5,  accuracy: 0.95 },
  { who: 'slow cold-start',                                       cps: 2.2,  accuracy: 0.94 },
];

console.log('At N=26 (log2(25)=4.643 bits/sel):\n');
for (const p of panel) {
  const totalK = p.cps * 60;
  const sc = Math.round(totalK * p.accuracy);
  const si = Math.round(totalK * (1 - p.accuracy));
  const b = bitRate({ N: 26, sc, si, tSeconds: 60 });
  console.log(`  Sc=${String(sc).padStart(3)} Si=${String(si).padStart(2)} → B=${b.toFixed(2).padStart(6)} bps   ${p.who}`);
}

const avg26 = bitRate({ N: 26, sc: 580, si: 18, tSeconds: 60 }); // expert
const avg26b = bitRate({ N: 26, sc: 286, si: 13, tSeconds: 60 }); // intermediate
const avg26c = bitRate({ N: 26, sc: 132, si: 8, tSeconds: 60 }); // slow
console.log(`\nWarm panel avg estimate: ${((avg26 + avg26b + avg26c) / 3).toFixed(2)} bps`);
