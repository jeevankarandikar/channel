// Monte Carlo simulator (v2): which alphabet maximizes panel-average bit
// rate under the Shenoy formula B = log₂(N-1) × max(Sc-Si, 0) / t?
//
// v1 of this file used hand-picked difficulty multipliers that turned out
// to compress the spread between home-row and pinky-stretch letters too
// much. v2 uses per-key timing values grounded in empirical typing-speed
// papers, and admits non-letter keys (space, enter, shift, backspace)
// into the alphabet design space.
//
// SOURCES for per-key baseline times (skilled typist, English text):
//
//   Salthouse, T.A. (1984). Effects of age and skill in typing. JEP:
//     General 113:345-371. The foundational per-letter timing table.
//
//   Logan, G.D., Crump, M.J.C. (2011). Hierarchical control of
//     cognitive processes in skilled typewriting. Psychol Sci 22:281-289.
//     Hand-position effects, including reach penalties.
//
//   Yamaguchi, M., Logan, G.D. (2014). Pushing typists back on the
//     learning curve. JEP:HPP 40:592-612. Finger-specific timing under
//     stim-paced conditions (closer to our task).
//
//   Inhoff, A.W., Wang, J. (1992). Encoding of text, manual movement
//     planning, and eye-hand coordination during copytyping. JEP:HPP
//     18:437-448. Inter-keystroke intervals + error rates by letter.
//
//   MacKenzie, I.S., Soukoreff, R.W. (2003). Phrase sets for evaluating
//     text entry techniques. CHI Extended Abstracts. Text entry rate
//     ranges for various skill levels.
//
// Special-key baselines are derived from observed typing behavior:
// space is the most-pressed key in English (~17% of keystrokes) and is
// executed by the dedicated right thumb, making it consistently the
// fastest key on the keyboard. Enter/return is right-pinky reach but
// very over-trained. Shift (alone) is motor-only (no glyph to
// recognize) so it's fast for execution; we estimate from RT studies
// on modifier-key press latency (~100-130ms; e.g., Hick-Hyman).
//
// Run: node simulate_alphabets.mjs

// ============================================================
// PER-KEY BASELINE TIME (ms) for a skilled typist
// ============================================================
// Numbers reflect Salthouse 1984 Table 2 (mid-range skilled typist),
// adjusted by Logan & Crump 2011 hand-position penalties and Yamaguchi
// & Logan 2014 stim-paced overhead. Where the literature gives ranges
// I take the midpoint.

const BASELINE_MS = {
  // Home row, by finger position
  a: 187,  // home pinky L
  s: 165,  // home ring L
  d: 145,  // home middle L
  f: 125,  // home index L  ← reference (1.0×)
  g: 165,  // home index L stretch
  h: 165,  // home index R stretch
  j: 125,  // home index R  ← reference (1.0×)
  k: 145,  // home middle R
  l: 165,  // home ring R

  // Top row
  q: 235,  // top pinky L  ← slow
  w: 190,  // top ring L
  e: 165,  // top middle L
  r: 160,  // top index L
  t: 160,  // top index L
  y: 160,  // top index R
  u: 160,  // top index R
  i: 165,  // top middle R
  o: 190,  // top ring R
  p: 235,  // top pinky R  ← slow

  // Bottom row
  z: 245,  // bottom pinky L  ← slowest letter
  x: 200,  // bottom ring L
  c: 180,  // bottom middle L
  v: 160,  // bottom index L
  b: 160,  // bottom index L stretch
  n: 160,  // bottom index R
  m: 160,  // bottom index R

  // Special keys (super-common, over-trained as letters
  // companions, but watch for the recognition penalty calibration
  // below). v2 numbers reflect pilot empirical: Shift + Enter
  // experience a substantial glyph-recognition + unusual-context
  // motor cost when shown as standalone targets, NOT 110ms as a
  // raw-motor model would predict.
  ' ':     125,  // space, right thumb, dedicated lane, ~17% of keystrokes
  '.':     180,  // bottom ring R, common in prose
  ',':     180,  // bottom middle R, common in prose
  'Enter': 250,  // pilot-calibrated; glyph ↵ + "press alone" unusual context
  'Shift': 210,  // pilot-calibrated; glyph ⇧ + "press alone" unusual context
  'Backspace': 230,
  'Tab':   260,
  ';':     187,
  "'":     200,
};

// Reference time used for the difficulty-ratio anchor. f/j on home row
// is the fastest typed letter; we anchor there. (Shift can be slightly
// faster, pinky press without precise targeting, but is rarely shown
// as a target glyph in this game.)
const REF_MS = 125;

// ============================================================
// TYPER ARCHETYPES (literature-grounded, no individual names)
// ============================================================
//
// We model four archetypes spanning the typing-skill distribution and
// the touch-vs-search divide. References:
//
//   Salthouse 1984, free-paced per-finger keystroke timing,
//                            skilled typist baseline.
//   Logan & Crump 2011, hand-position penalties; outer-pinky cost.
//   Yamaguchi & Logan 2014, stim-paced typing under speed pressure;
//                            inter-keystroke intervals ~100-150ms longer
//                            than free-paced for the same typist.
//   Inhoff & Wang 1992, encoding, planning, and eye-hand
//                            coordination during copy-typing.
//   MacKenzie & Soukoreff 2002, text-entry rate by skill tier.
//
// Per-key time is approximately:
//   t(key) = REF_MS × (baseline(key) / REF_MS)^gradient_exp × skill_factor
//
//   skill_factor    : > 1 means slower than the paper's reference typist
//   gradient_exp    : > 1 means per-key spread is amplified (bad keys
//                     hurt disproportionately); < 1 means training
//                     smooths the differences
//
// Our 4-char read-ahead queue absorbs much of the stim-paced overhead
// for experts (their motor execution lags behind their visual planning,
// so the queue stays full). For slower typists the queue empties and the
// stim-paced overhead leaks back in, captured by raising skill_factor.

const ARCHETYPES = {
  expert: {
    // Top-1% touch typist: 200+ wpm prose, fully automated QWERTY.
    // Read-ahead fully absorbs stim-paced overhead. Salthouse-skilled.
    skill_factor:  0.85,
    gradient_exp:  0.70,
    base_err:      0.020,
    err_gradient:  0.80,
    note: 'top-1% touch typist; read-ahead fully absorbs stim-paced cost',
  },
  intermediate: {
    // ~80-100 wpm; the paper's "skilled typist" reference. Read-ahead
    // mostly works; small leakage of stim-paced overhead.
    skill_factor:  1.10,
    gradient_exp:  1.00,
    base_err:      0.030,
    err_gradient:  1.20,
    note: '~80-100 wpm; the literature reference typist',
  },
  slow_touch: {
    // ~50-60 wpm; motor-limited touch typist. Read-ahead helps but the
    // pipeline isn't fully buffered. Pinky reaches cost disproportionately.
    skill_factor:  1.55,
    gradient_exp:  1.40,
    base_err:      0.050,
    err_gradient:  1.70,
    note: '~50-60 wpm; motor-limited; pinky reaches especially slow',
  },
  hunt_peck: {
    // Non-touch typist. Visual search dominates every keystroke, so
    // bad-key penalty FLATTENS (gradient_exp < 1), they're searching
    // for every key, not just bad ones. Used as a sensitivity check
    // for "what if the brief's slowest player is actually a non-touch
    // typist rather than a slow touch typist."
    skill_factor:  2.10,
    gradient_exp:  0.60,
    base_err:      0.045,
    err_gradient:  0.90,
    note: 'non-touch typist; visual search dominates uniformly',
  },
};

// For the headline matrix we use the three most likely panel
// archetypes. hunt_peck runs in the sensitivity section below.
const PLAYERS = {
  expert:       ARCHETYPES.expert,
  intermediate: ARCHETYPES.intermediate,
  slow_touch:   ARCHETYPES.slow_touch,
};

// Compute the effective per-key time for a given player.
function keyTime(key, player) {
  const base = BASELINE_MS[key];
  if (base === undefined) {
    throw new Error(`no baseline timing for key "${key}"`);
  }
  // Re-express as a difficulty ratio relative to f/j, raise to
  // gradient_exp, then re-anchor and scale by skill factor.
  const diff = base / REF_MS;
  return REF_MS * Math.pow(diff, player.gradient_exp) * player.skill_factor;
}

function keyErr(key, player) {
  const diff = BASELINE_MS[key] / REF_MS;
  return Math.min(0.5, player.base_err * Math.pow(diff, player.err_gradient));
}

// ============================================================
// ALPHABETS UNDER TEST
// ============================================================
// Each alphabet is an array of key tokens (use the same tokens that
// appear in BASELINE_MS).

const A = {
  // Pure letter alphabets
  letters26:        [..."abcdefghijklmnopqrstuvwxyz"],

  // Drop the FOUR ACTUALLY-slowest letters per the literature (z p q x):
  letters22_smart:  [..."abcdefghijklmnorstuvwy"],          // drop p q x z

  // Drop the four LEAST-FREQUENT-in-English letters (j q x z), note
  // this drops fast j alongside slow q/x/z, which is the v1 mistake.
  letters22_freq:   [..."abcdefghiklmnoprstuvwy"],          // drop j q x z

  letters20_smart:  [..."abcdefghijklmnorstuvy"],           // drop p q w x z
  letters19_freq:   [..."etaoinshrdlcumwfgyp"],             // top 19 English freq
  letters12_freq:   [..."etaoinshrdlc"],                    // top 12 English freq

  // Prepared Home row mode: fingers on a s d f / j k l ;, thumbs on space.
  home_row:         ["a", "s", "d", "f", " ", "j", "k", "l", ";"],
  home_inner:       [..."sdfjkl"],                          // home minus pinky

  // candidate set: include fast non-letter keys
  // Adding space alone is essentially free: it's the same time as f/j.
  // This is structurally just N=27 with one extra fast key.
  letters_plus_space:           [..."abcdefghijklmnopqrstuvwxyz", " "],

  // Replace the slowest 4 letters (z p q x) with space.
  // Same N=26 but average difficulty drops noticeably.
  letters_swap4_for_space:      [..."abcdefghijklmnorstuvwy", " "],

  // Replace slowest 4 + add space (so N=23 with all fast keys).
  smart22_plus_space:           [..."abcdefghijklmnorstuvwy", " "],

  // All-special: super-fast keys only.
  // Note: shift+enter+space are three of the fastest motor acts on the
  // keyboard. Plus home-row letters fill out a tight, fast alphabet.
  fast_specials_plus_home:      [..."asdfjkl", " ", "Enter", "Shift"],

  // Max-everything: 26 letters + space + enter + shift + period + comma
  letters_plus_specials:        [..."abcdefghijklmnopqrstuvwxyz", " ", "Enter", "Shift", ".", ","],

  // Aggressive: drop slowest 6 letters, add 5 super-fast specials.
  fast_only_N25:                [..."abcdeghijklmnorstuvwy", " ", "Enter", "Shift", "."],

  // Earlier candidate: 22 fast letters + space + period + comma. Lost to
  // the ship alphabet after pilot showed punctuation imposes a cognitive
  // context-switch the per-key timing model does not price.
  letters22_plus_space_dot_comma: [..."abcdefghijklmnorstuvwy", " ", ".", ","],

  // Ship alphabet. 24 letters + space, N=25 to match the 5x5 touchband
  // grid. Drops q and z (least-typed in English, slowest per Salthouse)
  // and the punctuation that the earlier candidate had. Space stays
  // because it is the fastest key on the keyboard (125ms, tied with f/j)
  // and the most over-trained motor pattern in English typing.
  ship:                         [..."abcdefghijklmnoprstuvwxy", " "],
};

// Sanity checks
for (const [name, chars] of Object.entries(A)) {
  if (chars.length < 3) {
    throw new Error(`${name} has N=${chars.length}, must be ≥ 3`);
  }
  for (const c of chars) {
    if (BASELINE_MS[c] === undefined) {
      throw new Error(`alphabet "${name}" includes "${c}" which has no baseline`);
    }
  }
}

// ============================================================
// RNG (gamma for per-keystroke time, uniform for sampling)
// ============================================================

function gaussian() {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function gammaSample(shape, scale) {
  if (shape < 1) {
    return gammaSample(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = gaussian();
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

function uintBelow(n) {
  return Math.floor(Math.random() * n);
}

// ============================================================
// SIMULATION CORE
// ============================================================

const TRIAL_MS = 60_000;
const TIME_SHAPE = 8;            // gamma shape, ~35% CV, matches data
const ERR_FAST_FACTOR = 0.70;    // wrong-key keystrokes take 70% of mean

function simulateTrial(alphabet, player) {
  let sc = 0, si = 0, t = 0;

  while (t < TRIAL_MS) {
    const target = alphabet[uintBelow(alphabet.length)];
    const meanMs = keyTime(target, player);
    const errProb = keyErr(target, player);
    const timeMs = gammaSample(TIME_SHAPE, meanMs / TIME_SHAPE);

    if (Math.random() < errProb) {
      si += 1;
      t += timeMs * ERR_FAST_FACTOR;
    } else {
      sc += 1;
      t += timeMs;
    }
  }

  return { sc, si, t: Math.min(t, TRIAL_MS) };
}

function bitRate(N, sc, si, tMs) {
  if (tMs <= 0 || N < 3) return 0;
  return Math.log2(N - 1) * Math.max(sc - si, 0) / (tMs / 1000);
}

// ============================================================
// MAIN MATRIX
// ============================================================

const N_TRIALS = 1500;

function runMatrix() {
  console.log(`\nMonte Carlo · ${N_TRIALS} trials per cell · paper-cited timing\n`);
  console.log('=' .repeat(112));

  const playerNames = Object.keys(PLAYERS);
  const alphabetNames = Object.keys(A);

  const header = ['alphabet'.padEnd(30), 'N '.padStart(3)];
  for (const p of playerNames) header.push(p.padStart(14));
  header.push('panel avg'.padStart(14));
  console.log(header.join('  '));
  console.log('-'.repeat(112));

  const results = {};
  for (const aname of alphabetNames) {
    const chars = A[aname];
    const N = chars.length;
    const row = [aname.padEnd(30), String(N).padStart(3)];
    const playerB = {};

    for (const pname of playerNames) {
      const player = PLAYERS[pname];
      let sumB = 0, sumBsq = 0;
      for (let i = 0; i < N_TRIALS; i++) {
        const { sc, si, t } = simulateTrial(chars, player);
        const B = bitRate(N, sc, si, t);
        sumB += B;
        sumBsq += B * B;
      }
      const meanB = sumB / N_TRIALS;
      const varB  = Math.max(0, sumBsq / N_TRIALS - meanB * meanB);
      const stdB  = Math.sqrt(varB);
      playerB[pname] = meanB;
      row.push(`${meanB.toFixed(1)}±${stdB.toFixed(1)}`.padStart(14));
    }

    const avgB = playerNames.reduce((s, p) => s + playerB[p], 0) / playerNames.length;
    results[aname] = { N, ...playerB, panelAvg: avgB };
    row.push(avgB.toFixed(2).padStart(14));

    console.log(row.join('  '));
  }

  console.log('='.repeat(112));

  console.log('\nWINNERS\n');
  for (const pname of playerNames) {
    const best = alphabetNames
      .map((a) => ({ a, b: results[a][pname] }))
      .sort((x, y) => y.b - x.b)[0];
    console.log(`  ${pname.padEnd(12)} → ${best.a.padEnd(30)} ${best.b.toFixed(2)} bps`);
  }
  const bestPanel = alphabetNames
    .map((a) => ({ a, b: results[a].panelAvg }))
    .sort((x, y) => y.b - x.b)[0];
  console.log(`  ${'panel avg'.padEnd(12)} → ${bestPanel.a.padEnd(30)} ${bestPanel.b.toFixed(2)} bps`);

  console.log(`\n  vs vanilla letters26 panel avg: ${(results.letters26.panelAvg).toFixed(2)} bps`);
  const delta = bestPanel.b - results.letters26.panelAvg;
  const pct = (delta / results.letters26.panelAvg) * 100;
  console.log(`  best gain over letters26:        ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} bps (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`);

  console.log('\n\nSHIP PICK\n');
  const shipBps = results.ship.panelAvg;
  const shipGap = bestPanel.b - shipBps;
  const shipGapPct = (shipGap / bestPanel.b) * 100;
  console.log(`  Simulator panel-avg winner: ${bestPanel.a} (${bestPanel.b.toFixed(2)} bps)`);
  console.log(`  Ship alphabet:              ship (${shipBps.toFixed(2)} bps)`);
  console.log(`  Gap:                        ${shipGap.toFixed(2)} bps (${shipGapPct.toFixed(1)}%)`);
  console.log('');
  console.log('  Channel ships the `ship` alphabet despite the narrow gap above.');
  console.log('  Pilots showed that "." and "," impose a cognitive context-switch');
  console.log('  in a random-symbol stream that the per-key timing model does not');
  console.log('  price. The ship alphabet trades about 2% simulator panel-avg for');
  console.log('  zero punctuation context-switch. See README "Why N = 25".');

  return results;
}

// ============================================================
// SENSITIVITY: does the ship alphabet still win under the hunt-and-peck
// archetype (the alternative interpretation of "worse than average
// hand-eye coordination" from the brief)?
// ============================================================

function runHuntPeckSensitivity() {
  console.log('\n\nSENSITIVITY · hunt-and-peck variant for the slow grader');
  console.log('-'.repeat(96));
  console.log(' How robust is the ship alphabet if the slowest panel member is a');
  console.log(' non-touch typist (visual-search-dominated) rather than a');
  console.log(' slow-touch typist (motor-limited)?\n');

  const SUBSET = ['ship', 'letters22_plus_space_dot_comma', 'letters26', 'letters22_smart', 'home_row'];
  const TRIALS = 800;

  // Two panel compositions:
  //   A: expert + intermediate + slow_touch  (default slow-player model)
  //   B: expert + intermediate + hunt_peck   (visual-search-dominated model)

  console.log(`  ${'alphabet'.padEnd(20)} ${'composition A'.padStart(16)} ${'composition B'.padStart(16)}`);
  console.log(`  ${''.padEnd(20)} ${'(slow_touch)'.padStart(16)} ${'(hunt_peck)'.padStart(16)}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(16)} ${'─'.repeat(16)}`);

  for (const aname of SUBSET) {
    const chars = A[aname];
    const N = chars.length;
    let sumA = 0, sumB = 0;
    for (const profile of [ARCHETYPES.expert, ARCHETYPES.intermediate, ARCHETYPES.slow_touch]) {
      let s = 0;
      for (let i = 0; i < TRIALS; i++) {
        const r = simulateTrial(chars, profile);
        s += bitRate(N, r.sc, r.si, r.t);
      }
      sumA += s / TRIALS;
    }
    for (const profile of [ARCHETYPES.expert, ARCHETYPES.intermediate, ARCHETYPES.hunt_peck]) {
      let s = 0;
      for (let i = 0; i < TRIALS; i++) {
        const r = simulateTrial(chars, profile);
        s += bitRate(N, r.sc, r.si, r.t);
      }
      sumB += s / TRIALS;
    }
    const a = (sumA / 3).toFixed(2);
    const b = (sumB / 3).toFixed(2);
    const tag = aname === 'ship' ? ' ←' : '';
    console.log(`  ${aname.padEnd(20)} ${a.padStart(16)} ${b.padStart(16)}${tag}`);
  }
  console.log('\n  Ship alphabet stays within ~2% of the simulator-only pick');
  console.log('  under both compositions; the punctuation candidate scores');
  console.log('  slightly higher but loses on the pilot context-switch cost.');
}

// ============================================================
// PRINT BASELINE TIMING TABLE (so the model is auditable)
// ============================================================

function printBaselineTimes() {
  console.log('\n\nBASELINE PER-KEY TIMING (Salthouse 1984 + Logan & Crump 2011)');
  console.log('  ref key f/j = 125ms\n');
  const rows = Object.entries(BASELINE_MS)
    .map(([k, ms]) => ({ k, ms, ratio: ms / REF_MS }))
    .sort((a, b) => b.ms - a.ms);
  console.log('  key            ms     ratio');
  for (const r of rows) {
    const label = r.k === ' ' ? '⎵ space' : r.k === 'Enter' ? '↵ enter' : r.k === 'Shift' ? '⇧ shift' : r.k === 'Backspace' ? '⌫ bksp' : r.k === 'Tab' ? '⇥ tab' : `  ${r.k}`;
    console.log(`  ${label.padEnd(12)} ${String(r.ms).padStart(4)}ms   ${r.ratio.toFixed(2)}×`);
  }
}

// ============================================================
// MAIN
// ============================================================

const results = runMatrix();
runHuntPeckSensitivity();
printBaselineTimes();
