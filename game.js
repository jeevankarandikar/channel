// Scoring + sampling + render loop. Rendering uses createElement and
// textContent only; no innerHTML, no dynamic code eval. See README.md and
// simulate_alphabets.mjs for the alphabet rationale.

const ALPHABETS = {
  ship: {
    label: 'ship · 25 (recommended)',
    tokens: [
      ...'abcdefghijklmnoprstuvwxy',  // 24 letters, drop q and z (least-typed and Salthouse-slowest)
      ' ',
    ],
    n: 25,
    note: 'ship alphabet. 24 letters + space, N=25 to match the 5x5 touchband grid. drops q and z (least-typed in english, slowest per salthouse 1984) and the punctuation that an earlier candidate had (cognitive context-switch the simulator does not price). space stays because it is the fastest key on the keyboard (125ms, tied with f/j) and the most over-trained motor pattern in english typing.',
  },
  letters26: {
    label: 'letters · 26',
    tokens: [...'abcdefghijklmnopqrstuvwxyz'],
    n: 26,
    note: 'every letter, log2(25) = 4.64 bits/sel · monte carlo baseline',
  },
  letters_plus_specials: {
    label: 'letters + specials · 31',
    tokens: [
      ...'abcdefghijklmnopqrstuvwxyz',
      ' ', 'Enter', 'Shift', '.', ','
    ],
    n: 31,
    note: 'all letters + 5 fast specials, fastest-player optimum in the simulator',
  },
  letters22_smart: {
    label: 'letters · 22 (drop p q x z)',
    tokens: [...'abcdefghijklmnorstuvwy'],
    n: 22,
    note: 'drop the four actually-slowest letters per salthouse 1984',
  },
  letters22_freq: {
    label: 'letters · 22 (drop j q x z)',
    tokens: [...'abcdefghiklmnoprstuvwy'],
    n: 22,
    note: 'drop four least-frequent english letters (note: j is fast)',
  },
  letters19_freq: {
    label: 'letters · 19 (top freq)',
    tokens: [...'etaoinshrdlcumwfgyp'],
    n: 19,
    note: 'top 19 by english frequency, log2(18) = 4.17',
  },
  letters12_freq: {
    label: 'letters · 12 (top freq)',
    tokens: [...'etaoinshrdlc'],
    n: 12,
    note: 'top 12 by english frequency, log2(11) = 3.46',
  },
  home_row: {
    label: 'home row · 9',
    tokens: ['a', 's', 'd', 'f', ' ', 'j', 'k', 'l', ';'],
    n: 9,
    note: 'prepared finger positions: a s d f, thumbs on space, j k l ;',
  },
  tap_grid: {
    label: 'tap grid · 25',
    tokens: Array.from({ length: 25 }, (_, i) => `tap-${String(i + 1).padStart(2, '0')}`),
    n: 25,
    note: '5x5 touchscreen pilot, recommended for iPad or large touchscreens',
  },
  home_inner: {
    label: 'home row no pinky · 6',
    tokens: [...'sdfjkl'],
    n: 6,
    note: 'log2(5) = 2.32',
  },
  digits: {
    label: 'digits · 10',
    tokens: [...'0123456789'],
    n: 10,
    note: 'top number row, log2(9) = 3.17',
  },
};

// label = themed display name (channel-bandwidth metaphor); method = the
// literal input method, kept as the technical name and shown as a subtitle.
const CHANNEL_MODES = {
  full: {
    id: 'full',
    label: 'fullband',
    method: 'full keyboard',
    alphabet: 'ship',
    summary: 'Fast typists. Highest bits per hit on a physical keyboard.',
  },
  tap: {
    id: 'tap',
    label: 'touchband',
    method: 'tap grid',
    alphabet: 'tap_grid',
    summary: 'Recommended for a tablet or phone. 25 direct targets.',
  },
};

const CALIBRATION_METHODS = ['full', 'tap'];
const TAP_GRID_SIZE = 5;

// Display glyph for a token. Letters / single chars render as-is; the
// special keys get a readable Unicode symbol.
const TOKEN_GLYPH = {
  ' ':        '␣',
  'Enter':    '↵',
  'Shift':    '⇧',
  'Backspace':'⌫',
  'Tab':      '⇥',
};

function tokenGlyph(token) {
  if (token.startsWith('tap-')) return token.slice(4);
  return TOKEN_GLYPH[token] !== undefined ? TOKEN_GLYPH[token] : token;
}

// Map an alphabet token to the data-key value(s) of the keyboard-plate
// element(s) it should highlight. "Shift" highlights BOTH ShiftL and
// ShiftR, since the user can press either to satisfy the target.
function tokenToPlateKeys(token) {
  if (token === 'Shift') return ['ShiftL', 'ShiftR'];
  return [token];
}

// Normalize event.key into our token vocabulary. Returns null for keys
// we want to ignore entirely (modifier-only that aren't in any alphabet).
function normalizeEventKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  const k = event.key;
  if (k === 'Shift' || k === 'Enter') return k;
  if (k.length === 1) return k.toLowerCase();
  return null; // Tab, Backspace, Esc, Caps, F-keys, arrows
}

// Raw decoder output where confirmed in the literature; LM-corrected
// figures are deliberately excluded for fair comparison with our i.i.d.
// task. See README.md for citations and caveats.

const REFERENCE_RATES = [
  { name: 'P300 speller (EEG)',                value: 0.30 },
  { name: 'Pandarinath 2017 · cursor iBCI',    value: 2.40 },
  { name: 'Willett 2021 · handwriting raw',    value: 4.90 },
  { name: 'SSVEP · Chen 2015 (non-invasive)',  value: 5.32 },
  { name: 'Jude 2026 · QWERTY iBCI raw',       value: 6.60 },
  { name: 'Mouse · ISO 9241-9 throughput',     value: 4.50 },
  { name: 'Neuralink · Arbaugh 2024 cursor',   value: 9.00 },
];

const EVAL_DURATION_MS = 60_000;
const CALIBRATION_DURATION_MS = 15_000;

// Leaderboard backend (Supabase). The anon key is a public client key; the
// table is guarded by row-level security (public read + constrained insert).
const SUPABASE_URL = 'https://gbuxhwowkilajdenonky.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidXhod293a2lsYWpkZW5vbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MjA3MjYsImV4cCI6MjA5NTQ5NjcyNn0.wGA2ej-2P-ZeYf2EvHbWVsvn_sGh2YAgIJdWva1mvRA';
const QUEUE_DEPTH = 4;
const ERROR_FLASH_MS = 420;
const SPARKLINE_SAMPLE_MS = 500;       // sample bit rate every 500ms during eval


const KEYBOARD_LAYOUT = [
  [
    { k: '`' }, { k: '1' }, { k: '2' }, { k: '3' }, { k: '4' }, { k: '5' },
    { k: '6' }, { k: '7' }, { k: '8' }, { k: '9' }, { k: '0' },
    { k: '-' }, { k: '=' },
    { k: 'Backspace', label: '⌫', w: 1.75 },
  ],
  [
    { k: 'Tab', label: '⇥', w: 1.5 },
    { k: 'q' }, { k: 'w' }, { k: 'e' }, { k: 'r' }, { k: 't' },
    { k: 'y' }, { k: 'u' }, { k: 'i' }, { k: 'o' }, { k: 'p' },
    { k: '[' }, { k: ']' }, { k: '\\', w: 1.25 },
  ],
  [
    { k: 'CapsLock', label: '⇪', w: 1.75 },
    { k: 'a' }, { k: 's' }, { k: 'd' }, { k: 'f' }, { k: 'g' },
    { k: 'h' }, { k: 'j' }, { k: 'k' }, { k: 'l' },
    { k: ';' }, { k: "'" }, { k: 'Enter', label: '↵', w: 2 },
  ],
  [
    { k: 'ShiftL', label: '⇧', w: 2.25 },
    { k: 'z' }, { k: 'x' }, { k: 'c' }, { k: 'v' }, { k: 'b' },
    { k: 'n' }, { k: 'm' }, { k: ',' }, { k: '.' }, { k: '/' },
    { k: 'ShiftR', label: '⇧', w: 2.75 },
  ],
  [
    { k: 'fn',     label: 'fn',  w: 1 },
    { k: 'Ctrl',   label: '⌃',   w: 1 },
    { k: 'AltL',   label: '⌥',   w: 1 },
    { k: 'MetaL',  label: '⌘',   w: 1.25 },
    { k: ' ',      label: '',    w: 5 },
    { k: 'MetaR',  label: '⌘',   w: 1.25 },
    { k: 'AltR',   label: '⌥',   w: 1 },
    { k: 'arrows', label: '◆',   w: 2.75 },
  ],
];


const state = {
  screen: 'title',       // 'title' | 'calibration' | 'game' | 'results'
  mode: 'practice',      // 'practice' | 'calibration' | 'eval'
  selectedMode: 'full',
  calibration: {
    active: false,
    currentMode: null,
    results: { full: null, tap: null },
    recommendedMode: null,
    testAll: false,
  },
  alphabetName: 'ship',
  chars: [...ALPHABETS.ship.tokens],
  N: ALPHABETS.ship.n,
  queue: [],
  sc: 0,
  si: 0,
  startTime: 0,
  elapsedMs: 0,
  tickHandle: null,
  history: [],           // persisted to localStorage
  pausedAt: null,
  pauseAccumMs: 0,
  // Per-letter timing for alphabet optimization. Reset per session.
  // letterStats[letter] = { totalMs, count, errorsAsTarget }
  letterStats: {},
  targetShownAt: 0,      // performance.now() when queue[0] last advanced
  // Bit-rate trajectory samples for the sparkline (live + post-run).
  // [{ tMs, B }]
  bitRateHistory: [],
  lastSampleAt: 0,
  awaitingStart: false,
  // Wrong-key feedback: flash the correct key (board + queue) red until the
  // player presses it or this deadline passes. Driven from render() rather
  // than a setTimeout because the queue is rebuilt every animation frame.
  errorFlashToken: null,
  errorFlashUntil: 0,
};

// Aggregated per-letter stats across all eval sessions, persisted to
// localStorage. Used to compute the "calibrated" alphabet that drops the
// player's slowest letters.
let aggregateLetterStats = {};
let lastPhysicalKeyAt = 0;

// Use rejection sampling on a Uint32 to avoid modulo bias.

function sampleChar(chars) {
  const n = chars.length;
  const maxUnbiased = Math.floor(0xffffffff / n) * n;
  const buf = new Uint32Array(1);
  let val;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= maxUnbiased);
  return chars[val % n];
}

function refillQueue() {
  while (state.queue.length < QUEUE_DEPTH) {
    state.queue.push(sampleChar(state.chars));
  }
}


function elapsedSeconds() {
  return state.elapsedMs / 1000;
}

function sessionDurationMs() {
  return state.mode === 'calibration' ? CALIBRATION_DURATION_MS : EVAL_DURATION_MS;
}

function computeBitRate() {
  const t = elapsedSeconds();
  if (t <= 0) return 0;
  if (state.N < 3) return 0;
  return Math.log2(state.N - 1) * Math.max(state.sc - state.si, 0) / t;
}

function bitsPerSelection() {
  if (state.N < 3) return 0;
  return Math.log2(state.N - 1);
}


function el(tag, options) {
  const node = document.createElement(tag);
  if (!options) return node;
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) {
      node.setAttribute(k, String(v));
    }
  }
  if (options.style) {
    for (const [k, v] of Object.entries(options.style)) {
      node.style.setProperty(k, String(v));
    }
  }
  if (options.children) {
    for (const child of options.children) {
      if (child instanceof Node) node.appendChild(child);
      else if (child !== null && child !== undefined) {
        node.appendChild(document.createTextNode(String(child)));
      }
    }
  }
  return node;
}

function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function svgEl(tag, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (!attrs) return node;
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}


function focusSoftKeyboardInput() {
  const input = document.querySelector('[data-soft-keyboard-input]');
  if (!input) return;
  // Tap grid is direct-touch; focusing the hidden input would raise the OS
  // keyboard over the targets, so keep it blurred in that mode.
  if (state.selectedMode === 'tap') {
    input.blur();
    return;
  }
  input.value = '';
  input.focus({ preventScroll: true });
}

// Replay the board-shake animation on a wrong input. Removing the class and
// forcing reflow restarts the animation even on rapid consecutive misses.
function triggerErrorShake() {
  const kb = document.querySelector('[data-keyboard]');
  if (!kb) return;
  kb.classList.remove('keyboard--shake');
  void kb.offsetWidth;
  kb.classList.add('keyboard--shake');
}

function processStruckToken(struck) {
  if (state.screen !== 'game') return;
  if (state.pausedAt !== null) return;
  if (state.awaitingStart) return;

  const target = state.queue[0];
  if (!target) return;

  if (struck === target) {
    const now = performance.now();
    const dtMs = now - state.targetShownAt;
    if (!state.letterStats[target]) {
      state.letterStats[target] = { totalMs: 0, count: 0, errorsAsTarget: 0 };
    }
    state.letterStats[target].totalMs += dtMs;
    state.letterStats[target].count += 1;
    state.targetShownAt = now;

    state.sc++;
    // Got it right: clear any pending wrong-key flash.
    state.errorFlashToken = null;
    state.errorFlashUntil = 0;
    state.queue.shift();
    refillQueue();
    render();
  } else {
    if (!state.letterStats[target]) {
      state.letterStats[target] = { totalMs: 0, count: 0, errorsAsTarget: 0 };
    }
    state.letterStats[target].errorsAsTarget += 1;

    state.si++;
    // Flash the correct key red on the board and up top so the miss is obvious.
    state.errorFlashToken = target;
    state.errorFlashUntil = performance.now() + ERROR_FLASH_MS;
    render();
    triggerErrorShake();
  }
}

function normalizeTextInputValue(value) {
  if (!value || value.length !== 1) return null;
  if (value === '\n') return 'Enter';
  return value.toLowerCase();
}

function handleKeyDown(event) {
  // Dev panel toggle (Shift+Cmd+D on Mac, Shift+Ctrl+D elsewhere)
  if (event.key === 'D' && event.shiftKey && (event.metaKey || event.ctrlKey)) {
    toggleDevPanel();
    event.preventDefault();
    return;
  }

  // Swallow keys while the leaderboard popup is open (Esc closes it
  // via a separate capture-phase listener).
  const popup = document.querySelector('[data-leaderboard-popup]');
  if (popup && !popup.hidden) return;

  // Title screen: space or enter starts guided calibration.
  if (state.screen === 'title') {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleStartChoice(true);
    }
    return;
  }

  if (state.screen === 'calibration') {
    if (event.key === 'Enter') {
      event.preventDefault();
      advanceCalibration();
    }
    return;
  }

  // Results screen: Enter = run again with the same method, matching the
  // primary "run again" button on the screen.
  if (state.screen === 'results') {
    if (event.key === 'Enter') {
      event.preventDefault();
      startEval();
    }
    return;
  }

  if (state.screen !== 'game') return;
  if (state.pausedAt !== null) return;

  // Suppress OS key repeats
  if (event.repeat) return;

  if (state.awaitingStart) {
    // Hitting the first target starts the run AND counts as that hit, so the
    // target advances on the first press (no confusing "stuck on it" double-tap).
    const first = normalizeEventKey(event);
    if (first !== null && first === state.queue[0]) {
      event.preventDefault();
      beginReadyRun();
      processStruckToken(first);
    }
    return;
  }

  // Normalize: letters, Shift, Enter, space, punctuation; reject Tab,
  // Caps, F-keys, modifier combos.
  const struck = normalizeEventKey(event);
  if (struck === null) return;
  lastPhysicalKeyAt = performance.now();

  // Special-case: prevent space from scrolling the page mid-game.
  if (event.key === ' ') event.preventDefault();

  processStruckToken(struck);
}

function handleSoftKeyboardBeforeInput(event) {
  if (state.screen !== 'game') return;
  if (event.isComposing) return;
  const input = event.currentTarget;
  const struck = normalizeTextInputValue(event.data);
  event.preventDefault();
  input.value = '';
  if (struck === null) return;
  if (state.awaitingStart) {
    if (struck === state.queue[0]) { beginReadyRun(); processStruckToken(struck); }
    return;
  }
  if (performance.now() - lastPhysicalKeyAt < 50) return;
  processStruckToken(struck);
}

function handleSoftKeyboardInput(event) {
  if (state.screen !== 'game') return;
  const input = event.currentTarget;
  const raw = input.value;
  input.value = '';
  if (performance.now() - lastPhysicalKeyAt < 50) return;
  if (!raw || raw.length !== 1) return;
  const struck = normalizeTextInputValue(raw);
  if (state.awaitingStart) {
    if (struck === state.queue[0]) { beginReadyRun(); processStruckToken(struck); }
    return;
  }
  if (struck !== null) processStruckToken(struck);
}


function resetSession() {
  state.sc = 0;
  state.si = 0;
  state.queue = [];
  refillQueue();
  state.startTime = performance.now();
  state.elapsedMs = 0;
  state.pauseAccumMs = 0;
  state.pausedAt = null;
  state.letterStats = {};
  state.targetShownAt = state.startTime;
  state.bitRateHistory = [];
  state.lastSampleAt = 0;
}

function startGame(mode, options = {}) {
  state.mode = mode;
  state.screen = 'game';
  resetSession();
  state.awaitingStart = Boolean(options.ready);
  // Stop any tick from a prior run so a restart-into-ready-state does not
  // keep the old timer ticking on the freshly reset startTime; without this
  // the elapsed counter advances during the ready overlay.
  stopTick();
  applyScreen();
  focusSoftKeyboardInput();
  if (!state.awaitingStart) startTick();
  render();
}

function startEval() {
  setChannelMode(state.selectedMode || 'full');
  startGame('eval', { ready: true });
}

// Touch-primary devices (phone/tablet) get touchband suggested; otherwise
// fullband. Only a suggestion - the player can always pick the other.
function suggestedMethod() {
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  return coarse ? 'tap' : 'full';
}

function beginReadyRun() {
  if (state.screen !== 'game' || !state.awaitingStart) return;
  state.awaitingStart = false;
  state.startTime = performance.now();
  state.targetShownAt = state.startTime;
  state.elapsedMs = 0;
  state.pauseAccumMs = 0;
  state.pausedAt = null;
  state.lastSampleAt = 0;
  state.bitRateHistory = [];
  applyScreen();
  focusSoftKeyboardInput();
  startTick();
  render();
}

function setChannelMode(modeId) {
  const mode = CHANNEL_MODES[modeId];
  if (!mode) return;
  state.selectedMode = modeId;
  setAlphabet(mode.alphabet);
  buildKeyboard();
  render();
}

function resetCalibration() {
  state.calibration = {
    active: true,
    currentMode: null,
    results: { full: null, tap: null },
    recommendedMode: null,
    selectedRunMode: null,
    testAll: false,
  };
}

function recommendCalibrationMode(results) {
  const entries = Object.entries(results)
    .filter(([, result]) => result && Number.isFinite(result.bps));
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) => (
    entry[1].bps >= best[1].bps ? entry : best
  ))[0];
}

function startCalibration() {
  stopTick();
  toggleStartChoice(false);
  resetCalibration();
  state.screen = 'calibration';
  state.mode = 'practice';
  setChannelMode('full');
  applyScreen();
  render();
}

function startCalibrationFromMode(modeId) {
  resetCalibration();
  toggleStartChoice(false);
  startCalibrationRun(modeId);
}

function startCalibrationRun(modeId) {
  setChannelMode(modeId);
  state.calibration.currentMode = modeId;
  startGame('calibration', { ready: true });
}

function finishCalibrationRun() {
  const modeId = state.calibration.currentMode;
  if (!modeId) return;
  state.calibration.results[modeId] = {
    bps: computeBitRate(),
    sc: state.sc,
    si: state.si,
    n: state.N,
  };
  state.calibration.recommendedMode = recommendCalibrationMode(state.calibration.results);
  // The method you just warmed up becomes the default for the scored run.
  state.calibration.selectedRunMode = modeId;
  state.calibration.currentMode = null;
  state.screen = 'calibration';
  state.mode = 'practice';
  stopTick();
  applyScreen();
  render();
}

function advanceCalibration() {
  const nextMode = CALIBRATION_METHODS.find((modeId) => !state.calibration.results[modeId]);
  if (nextMode) {
    startCalibrationRun(nextMode);
    return;
  }
  startRecommendedEval();
}

function startRecommendedEval() {
  const modeId = state.calibration.selectedRunMode
    || state.calibration.recommendedMode
    || state.selectedMode;
  setChannelMode(modeId);
  startEval();
}

function startTick() {
  if (state.tickHandle !== null) cancelAnimationFrame(state.tickHandle);
  const tick = () => {
    if (state.pausedAt === null) {
      state.elapsedMs = performance.now() - state.startTime - state.pauseAccumMs;
    }
    // Sample bit rate for the live sparkline (every SPARKLINE_SAMPLE_MS).
    if (state.elapsedMs - state.lastSampleAt >= SPARKLINE_SAMPLE_MS) {
      state.bitRateHistory.push({
        tMs: state.elapsedMs,
        B: computeBitRate(),
      });
      state.lastSampleAt = state.elapsedMs;
    }
    if (state.mode === 'calibration' && state.elapsedMs >= CALIBRATION_DURATION_MS) {
      state.elapsedMs = CALIBRATION_DURATION_MS;
      state.bitRateHistory.push({ tMs: state.elapsedMs, B: computeBitRate() });
      render();
      finishCalibrationRun();
      return;
    }
    if (state.mode === 'eval' && state.elapsedMs >= EVAL_DURATION_MS) {
      state.elapsedMs = EVAL_DURATION_MS;
      // Final sample at exactly t=60s for a clean chart endpoint.
      state.bitRateHistory.push({ tMs: state.elapsedMs, B: computeBitRate() });
      render();
      endEval();
      return;
    }
    render();
    state.tickHandle = requestAnimationFrame(tick);
  };
  state.tickHandle = requestAnimationFrame(tick);
}

function stopTick() {
  if (state.tickHandle !== null) {
    cancelAnimationFrame(state.tickHandle);
    state.tickHandle = null;
  }
}

function endEval() {
  stopTick();
  state.screen = 'results';

  const finalRate = computeBitRate();
  const totalKeystrokes = state.sc + state.si;
  const cps = totalKeystrokes / elapsedSeconds();
  const accuracy = totalKeystrokes > 0 ? state.sc / totalKeystrokes : 0;

  setText('[data-final-rate]', finalRate.toFixed(2));
  setText('[data-final-n]', state.N);
  setText('[data-final-sc]', state.sc);
  setText('[data-final-si]', state.si);
  setText('[data-final-t]', elapsedSeconds().toFixed(1) + ' s');
  setText('[data-final-cps]', cps.toFixed(2));
  setText('[data-final-accuracy]', (accuracy * 100).toFixed(1) + '%');

  const letterStatsCopy = {};
  for (const [letter, s] of Object.entries(state.letterStats)) {
    letterStatsCopy[letter] = { ...s };
  }

  const record = {
    timestamp: new Date().toISOString(),
    alphabet: state.alphabetName,
    N: state.N,
    sc: state.sc,
    si: state.si,
    elapsedMs: Math.round(state.elapsedMs),
    cps: Number(cps.toFixed(3)),
    accuracy: Number(accuracy.toFixed(4)),
    bitRate: Number(finalRate.toFixed(3)),
    letterStats: letterStatsCopy,
  };
  state.history.push(record);
  mergeIntoAggregate(letterStatsCopy);
  persistHistory();
  renderHistory();
  renderLetterStats();
  renderComparison(finalRate);
  renderResultSparkline();
  renderResultHeatmap();

  // Stash this run for an opt-in leaderboard submission and load the board.
  state.lastResult = {
    bps: Number(finalRate.toFixed(2)),
    method: CHANNEL_MODES[state.selectedMode]?.label || 'channel',
    device: leaderboardDevice(),
    n: state.N,
    sc: state.sc,
    si: state.si,
  };
  resetLeaderboardForm();
  loadLeaderboard();

  applyScreen();
}


function leaderboardDevice() {
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  return coarse ? 'phone' : 'keyboard';
}

// Canonical device buckets. The DB only stores keyboard / phone / tablet
// after migration; anything else (defensive) falls back to keyboard.
function normalizeDevice(raw) {
  const d = String(raw || '').toLowerCase();
  return d === 'phone' || d === 'tablet' ? d : 'keyboard';
}

function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
}

function showLeaderboardStatus(msg) {
  const status = document.querySelector('[data-leaderboard-status]');
  if (status) {
    status.textContent = msg;
    status.hidden = false;
  }
}

function resetLeaderboardForm() {
  const form = document.querySelector('[data-leaderboard-form]');
  const input = document.querySelector('[data-leaderboard-name]');
  const status = document.querySelector('[data-leaderboard-status]');
  const deviceSel = document.querySelector('[data-leaderboard-device]');
  if (form) form.hidden = false;
  if (input) input.value = '';
  if (deviceSel) deviceSel.value = leaderboardDevice();
  if (status) status.hidden = true;
}

function renderLeaderboard(rows, listEl) {
  // listEl lets the title-screen popup render into its own <ol> without
  // colliding with the results-page board.
  const list = listEl || document.querySelector('[data-leaderboard]');
  if (!list) return;
  clearChildren(list);
  // One entry per name: keep their best score across all methods and devices.
  // Cross-device comparison is the user's call (the run picker explains it),
  // the board just shows who's at the top regardless of method.
  const best = new Map();
  rows.forEach((row) => {
    const key = row.handle.toLowerCase();
    const prev = best.get(key);
    if (!prev || Number(row.bps) > Number(prev.bps)) {
      best.set(key, {
        handle: row.handle,
        bps: row.bps,
        device: normalizeDevice(row.device),
        created_at: row.created_at,
      });
    }
  });
  const top = [...best.values()].sort((a, b) => Number(b.bps) - Number(a.bps)).slice(0, 10);
  if (!top.length) {
    list.appendChild(el('li', { className: 'leaderboard-empty', text: 'no scores yet, be the first' }));
    return;
  }
  top.forEach((row, i) => {
    list.appendChild(el('li', {
      className: 'leaderboard-row',
      children: [
        el('span', { className: 'lb-rank', text: String(i + 1) }),
        el('span', { className: 'lb-name', text: row.handle }),
        el('span', { className: 'lb-bps', text: Number(row.bps).toFixed(2) }),
        el('span', { className: 'lb-meta', text: `${row.device} · ${shortDate(row.created_at)}` }),
      ],
    }));
  });
}

async function loadLeaderboard(listEl) {
  const list = listEl || document.querySelector('[data-leaderboard]');
  if (!list) return;
  // Retry once after a short backoff so a transient network blip on first
  // load (the leaderboard fetch races page render on slow connections) does
  // not surface as a hard "unavailable" state.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/scores?select=handle,bps,device,created_at&order=bps.desc&limit=100`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } },
      );
      if (!res.ok) throw new Error(`leaderboard read ${res.status}`);
      renderLeaderboard(await res.json(), list);
      return;
    } catch (err) {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
  }
  clearChildren(list);
  list.appendChild(el('li', { className: 'leaderboard-empty', text: 'leaderboard unavailable' }));
}

function openLeaderboardPopup() {
  const popup = document.querySelector('[data-leaderboard-popup]');
  if (!popup) return;
  popup.hidden = false;
  const list = popup.querySelector('[data-leaderboard-popup-list]');
  if (list) {
    clearChildren(list);
    list.appendChild(el('li', { className: 'leaderboard-empty', text: 'loading…' }));
    loadLeaderboard(list);
  }
  const closeBtn = popup.querySelector('[data-action="close-leaderboard-popup"]');
  if (closeBtn) closeBtn.focus();
}

function closeLeaderboardPopup() {
  const popup = document.querySelector('[data-leaderboard-popup]');
  if (popup) popup.hidden = true;
}

async function submitScore(handle) {
  const r = state.lastResult;
  if (!r) return;
  const clean = String(handle || '').trim().slice(0, 24);
  if (!clean) {
    showLeaderboardStatus('enter your name first');
    return;
  }
  const deviceSel = document.querySelector('[data-leaderboard-device]');
  const device = deviceSel ? deviceSel.value : r.device;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        handle: clean, bps: r.bps, method: r.method,
        device, n: r.n, sc: r.sc, si: r.si,
      }),
    });
    if (!res.ok) throw new Error(`submit ${res.status}`);
    const form = document.querySelector('[data-leaderboard-form]');
    if (form) form.hidden = true;
    showLeaderboardStatus('added to the leaderboard');
    loadLeaderboard();
  } catch (err) {
    showLeaderboardStatus('could not submit, try again');
  }
}

// Merge a session's letter stats into the persisted aggregate.
function mergeIntoAggregate(sessionStats) {
  for (const [letter, s] of Object.entries(sessionStats)) {
    if (!aggregateLetterStats[letter]) {
      aggregateLetterStats[letter] = { totalMs: 0, count: 0, errorsAsTarget: 0 };
    }
    aggregateLetterStats[letter].totalMs += s.totalMs;
    aggregateLetterStats[letter].count += s.count;
    aggregateLetterStats[letter].errorsAsTarget += s.errorsAsTarget;
  }
}

// Compute per-letter summary sorted slowest-first. minCount filters out
// letters with too little data to be meaningful.
function letterStatsSummary(stats, minCount = 3) {
  const rows = [];
  for (const [letter, s] of Object.entries(stats)) {
    if (s.count < minCount) continue;
    const meanMs = s.totalMs / s.count;
    const errorRate = s.errorsAsTarget / (s.count + s.errorsAsTarget);
    rows.push({ letter, meanMs, count: s.count, errors: s.errorsAsTarget, errorRate });
  }
  rows.sort((a, b) => b.meanMs - a.meanMs);
  return rows;
}

// Build an alphabet that drops the player's slowest dropCount letters from
// the current alphabet, based on aggregate per-letter timing data. Falls
// back to the current alphabet if there's not enough data.
function calibratedAlphabet(currentChars, dropCount = 4, minCount = 5) {
  const rows = letterStatsSummary(aggregateLetterStats, minCount);
  const haveData = new Map(rows.map((r) => [r.letter, r]));
  // Only consider letters that are in the current alphabet AND have enough data.
  const eligible = currentChars.filter((c) => haveData.has(c));
  if (eligible.length < currentChars.length / 2) {
    return null; // Not enough data, decline to calibrate
  }
  // Sort current alphabet's letters by mean time desc, drop top dropCount.
  const sortedByTime = [...currentChars].sort((a, b) => {
    const ta = haveData.get(a)?.meanMs ?? 0;
    const tb = haveData.get(b)?.meanMs ?? 0;
    return tb - ta;
  });
  const toDrop = new Set(sortedByTime.slice(0, dropCount));
  return currentChars.filter((c) => !toDrop.has(c));
}

// Single exit path. Tearing the run down also has to clear the pause
// bookkeeping and hide the blur overlay so a paused-then-exit does not
// leave the overlay visible over the title or freeze the next run's tick.
function exitToTitle() {
  stopTick();
  state.screen = 'title';
  state.awaitingStart = false;
  state.pausedAt = null;
  state.pauseAccumMs = 0;
  const overlay = document.querySelector('[data-blur-overlay]');
  if (overlay) overlay.hidden = true;
  applyScreen();
}

const abortEval = exitToTitle;
const backToTitle = exitToTitle;


function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value);
}

function applyScreen() {
  const app = document.getElementById('app');
  app.dataset.screen = state.screen;
  app.dataset.mode = state.mode;
  app.dataset.ready = String(Boolean(state.awaitingStart));
  document.querySelectorAll('.screen').forEach((screen) => {
    const active = screen.dataset.screen === state.screen;
    screen.hidden = !active;
    screen.inert = !active;
    screen.setAttribute('aria-hidden', String(!active));
  });
}

function renderReadyPanel() {
  const panel = document.querySelector('[data-ready-panel]');
  if (!panel) return;
  panel.hidden = !state.awaitingStart;
  panel.inert = !state.awaitingStart;
  panel.setAttribute('aria-hidden', String(!state.awaitingStart));
  if (!state.awaitingStart) return;

  if (state.selectedMode === 'tap') {
    setText('[data-ready-title]', 'set your screen');
    setText('[data-ready-body]', 'use both hands. tap the yellow square (not blue) to start');
    setText('[data-ready-cta]', 'tap the yellow square to start');
    return;
  }

  setText('[data-ready-title]', 'set your hands normally');
  setText('[data-ready-body]', 'use your normal typing position');
  setText('[data-ready-cta]', 'hit the lit key to start');
}

function toggleStartChoice(show) {
  const panel = document.querySelector('[data-start-choice]');
  if (!panel) return;
  panel.hidden = !show;
  panel.inert = !show;
  panel.setAttribute('aria-hidden', String(!show));
  if (show) {
    if (!state.selectedStartMethod) state.selectedStartMethod = suggestedMethod();
    renderStartChoice();
  }
}

// The picker pre-selects the method that fits the device, tags it, and the
// primary action goes straight to the scored run; warm-up is the secondary.
function renderStartChoice() {
  const suggestion = suggestedMethod();
  const selected = state.selectedStartMethod || suggestion;
  document.querySelectorAll('[data-pick-method]').forEach((node) => {
    node.classList.toggle('start-method--selected', node.dataset.pickMethod === selected);
  });
  document.querySelectorAll('[data-device-tag]').forEach((tag) => {
    tag.hidden = tag.dataset.deviceTag !== suggestion;
  });
  const cta = document.querySelector('[data-scored-cta]');
  if (cta) cta.textContent = `start 60s run · ${CHANNEL_MODES[selected].label}`;
}

function formatCalibrationResult(result) {
  if (!result) return 'not run';
  return `${result.bps.toFixed(2)} bps`;
}

function renderCalibration() {
  const runMode = state.calibration.selectedRunMode
    || CALIBRATION_METHODS.find((modeId) => state.calibration.results[modeId])
    || state.selectedMode;

  Object.keys(CHANNEL_MODES).forEach((modeId) => {
    const resultNode = document.querySelector(`[data-mode-result="${modeId}"]`);
    if (resultNode) {
      resultNode.textContent = formatCalibrationResult(state.calibration.results[modeId]);
    }

    const card = document.querySelector(`[data-calibration-card="${modeId}"]`);
    if (card) {
      // Mark the method the scored run will use (selectable). No "fastest" flag:
      // keyboard vs touch is a cross-device call, not an in-app race.
      card.classList.toggle('mode-card--selected', Boolean(state.calibration.results[modeId]) && runMode === modeId);
    }

    const chooser = document.querySelector(`[data-choose-mode="${modeId}"]`);
    if (chooser) {
      chooser.textContent = state.calibration.results[modeId] ? 'practice again' : `practice ${CHANNEL_MODES[modeId].label}`;
    }
  });

  const title = document.querySelector('[data-calibration-title]');
  const body = document.querySelector('[data-calibration-body]');
  if (title && body) {
    title.textContent = 'practice';
    body.textContent = 'start the 60s run, or practice again';
  }

  const cta = document.querySelector('[data-calibration-best]');
  if (cta) {
    cta.hidden = !runMode;
    cta.textContent = runMode ? `start 60s run · ${CHANNEL_MODES[runMode].label}` : 'start 60s run';
  }
}

function render() {
  renderCalibration();
  if (state.screen !== 'game') return;
  renderReadyPanel();
  renderQueue();
  renderKeyboardState();
  renderHUD();
}

function renderQueue() {
  const container = document.querySelector('[data-queue]');
  clearChildren(container);
  const errorActive = state.errorFlashToken !== null
    && performance.now() < state.errorFlashUntil;
  state.queue.forEach((token, i) => {
    const isSpecial = token.length > 1 || TOKEN_GLYPH[token] !== undefined;
    const isErrorTarget = errorActive && i === 0;
    container.appendChild(
      el('span', {
        className: 'queue-char'
          + (isSpecial ? ' queue-char-special' : '')
          + (isErrorTarget ? ' queue-char--error' : ''),
        text: tokenGlyph(token),
        attrs: {
          'data-position': i,
          'data-token': token,
          'title': isSpecial ? token : undefined,
        },
      })
    );
  });
}

function renderKeyboardState() {
  const kb = document.querySelector('[data-keyboard]');
  const keys = kb.querySelectorAll('.key');

  // Earliest queue position wins so a key never shows two queue colors at once.
  const plateKeyLookup = new Map();
  state.queue.forEach((token, idx) => {
    for (const pk of tokenToPlateKeys(token)) {
      if (!plateKeyLookup.has(pk)) plateKeyLookup.set(pk, idx);
    }
  });

  // The active alphabet, expanded to the set of plate keys it covers.
  const alphabetPlateKeys = new Set();
  for (const token of state.chars) {
    for (const pk of tokenToPlateKeys(token)) alphabetPlateKeys.add(pk);
  }

  // Wrong-key flash: light up the correct key red while the deadline holds.
  const errorActive = state.errorFlashToken !== null
    && performance.now() < state.errorFlashUntil;
  const errorPlateKeys = errorActive
    ? new Set(tokenToPlateKeys(state.errorFlashToken))
    : null;

  keys.forEach((node) => {
    const dataKey = node.dataset.key;
    node.classList.remove(
      'key--in-alphabet', 'key--target', 'key--error',
      'key--queue-1', 'key--queue-2', 'key--queue-3'
    );

    if (alphabetPlateKeys.has(dataKey)) {
      node.classList.add('key--in-alphabet');
    }

    const queuePos = plateKeyLookup.get(dataKey);
    if (queuePos === 0) node.classList.add('key--target');
    else if (queuePos === 1) node.classList.add('key--queue-1');
    else if (queuePos === 2) node.classList.add('key--queue-2');
    else if (queuePos === 3) node.classList.add('key--queue-3');

    if (errorPlateKeys && errorPlateKeys.has(dataKey)) {
      node.classList.add('key--error');
    }
  });
}

function renderHUD() {
  const rate = computeBitRate();
  setText('[data-bit-rate]', rate.toFixed(2));

  const timedDuration = sessionDurationMs();
  const remainingMs = (state.mode === 'eval' || state.mode === 'calibration')
    ? Math.max(0, timedDuration - state.elapsedMs)
    : state.elapsedMs;
  const remainingSec = remainingMs / 1000;
  setText('[data-time]', remainingSec.toFixed(1) + ' s');

  const total = state.sc + state.si;
  const accuracy = total > 0 ? (state.sc / total) * 100 : null;
  setText('[data-sc]', state.sc);
  setText('[data-si]', state.si);
  setText('[data-n]', state.N);
  setText('[data-live-accuracy]', accuracy === null ? '—' : accuracy.toFixed(1) + '%');
  setText('[data-alphabet-label]', CHANNEL_MODES[state.selectedMode]?.label || 'channel');
}


function renderResultSparkline() {
  const container = document.querySelector('[data-result-sparkline]');
  if (!container) return;
  clearChildren(container);
  if (state.bitRateHistory.length < 2) {
    container.appendChild(el('p', { className: 'caption muted', text: 'no trajectory recorded' }));
    return;
  }
  const W = 720, H = 160;
  const padL = 36, padR = 8, padT = 12, padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const peakB = Math.max(...state.bitRateHistory.map((s) => s.B), 1);

  const points = state.bitRateHistory.map((s) => {
    const x = padL + (s.tMs / EVAL_DURATION_MS) * plotW;
    const y = padT + (1 - s.B / peakB) * plotH;
    return [x, y];
  });
  const pathLine = 'M ' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
  const pathFill = pathLine + ` L ${(points[points.length - 1][0]).toFixed(1)},${padT + plotH} L ${padL},${padT + plotH} Z`;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'trajectory-svg',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': 'bit rate over time',
  });
  const grid = svgEl('g', { class: 'grid' });

  // Y-axis ticks every 5 bps
  for (let v = 0; v <= peakB; v += 5) {
    const y = padT + (1 - v / peakB) * plotH;
    const tick = svgEl('g', { class: 'tick' });
    tick.appendChild(svgEl('line', { x1: padL, y1: y, x2: W - padR, y2: y }));
    const label = svgEl('text', { x: padL - 6, y: y + 3, 'text-anchor': 'end' });
    label.textContent = String(v);
    tick.appendChild(label);
    grid.appendChild(tick);
  }
  // X-axis ticks every 15s
  for (let t = 0; t <= 60; t += 15) {
    const x = padL + (t / 60) * plotW;
    const tick = svgEl('g', { class: 'tick tick-x' });
    tick.appendChild(svgEl('line', {
      x1: x,
      y1: padT + plotH,
      x2: x,
      y2: padT + plotH + 4,
    }));
    const label = svgEl('text', { x, y: padT + plotH + 14, 'text-anchor': 'middle' });
    label.textContent = `${t}s`;
    tick.appendChild(label);
    grid.appendChild(tick);
  }

  svg.appendChild(grid);
  svg.appendChild(svgEl('path', { d: pathFill, class: 'trajectory-fill' }));
  svg.appendChild(svgEl('path', { d: pathLine, class: 'trajectory-line' }));
  container.appendChild(svg);
}


function renderResultHeatmap() {
  const container = document.querySelector('[data-result-heatmap]');
  if (!container) return;
  clearChildren(container);
  const entries = Object.entries(state.letterStats).filter(([, s]) => s.count > 0);
  if (entries.length === 0) {
    return;
  }
  const means = entries.map(([, s]) => s.totalMs / s.count);
  const minMs = Math.min(...means);
  const maxMs = Math.max(...means);
  const range = Math.max(maxMs - minMs, 1);

  // Sort fastest first, show every target encountered so the grid reads
  // as a per-target speed map (top-left fastest, bottom-right slowest).
  const rows = entries
    .map(([letter, s]) => ({
      letter,
      meanMs: s.totalMs / s.count,
      count: s.count,
      errors: s.errorsAsTarget,
      heat: (s.totalMs / s.count - minMs) / range,
    }))
    .sort((a, b) => a.meanMs - b.meanMs);

  rows.forEach((r) => {
    const intensity = r.heat.toFixed(2);
    const glyph = TOKEN_GLYPH[r.letter] !== undefined ? TOKEN_GLYPH[r.letter] : r.letter;
    const cell = el('div', { className: 'heat-cell', style: { '--heat': intensity } });
    cell.appendChild(el('span', { className: 'heat-glyph', text: glyph }));
    cell.appendChild(el('span', { className: 'heat-ms', text: `${Math.round(r.meanMs)}ms` }));
    cell.appendChild(el('span', {
      className: 'heat-meta',
      // ✓ for hits, ✗ for errors. Always show both so the grid scans
      // uniformly; a clean run reads as "3✓ 0✗" rather than going blank.
      text: `${r.count}✓  ${r.errors}✗`,
    }));
    container.appendChild(cell);
  });
}


function renderComparison(rate) {
  const rows = [...REFERENCE_RATES, { name: 'you · ' + (CHANNEL_MODES[state.selectedMode]?.label || 'channel'), value: rate, you: true }];
  // Best-to-worst: your bar lands at the top so the comparison reads
  // "here's where you sit, here's what you beat."
  rows.sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...rows.map((r) => r.value));

  const container = document.querySelector('[data-comparison]');
  clearChildren(container);
  rows.forEach((r) => {
    const pct = (r.value / maxValue) * 100;
    const bar = el('div', { className: r.you ? 'bar bar--you' : 'bar' });
    bar.appendChild(el('span', { className: 'bar-label', text: r.name }));

    const track = el('span', { className: 'bar-track' });
    const fill = el('span', {
      className: 'bar-fill',
      style: { width: pct + '%' },
    });
    track.appendChild(fill);
    bar.appendChild(track);

    bar.appendChild(el('span', {
      className: 'bar-value',
      text: r.value.toFixed(2) + ' bps',
    }));

    container.appendChild(bar);
  });
}


function renderKey(key) {
  const keyEl = el('div', {
    className: 'key',
    attrs: { 'data-key': key.k },
  });
  if (key.w) keyEl.style.setProperty('--w', key.w);
  const label = key.label !== undefined ? key.label : key.k;
  keyEl.appendChild(el('span', { className: 'key-label', text: label }));
  return keyEl;
}

function buildTapGrid() {
  const grid = el('div', {
    className: 'tap-grid',
    attrs: {
      'aria-label': 'tap grid targets',
      'style': `--tap-grid-size: ${TAP_GRID_SIZE}`,
    },
  });

  ALPHABETS.tap_grid.tokens.forEach((token) => {
    grid.appendChild(el('button', {
      className: 'key tap-cell',
      attrs: {
        type: 'button',
        'data-key': token,
        'data-tap-token': token,
        'aria-label': `tap target ${tokenGlyph(token)}`,
      },
      children: [
        el('span', { className: 'key-label', text: tokenGlyph(token) }),
      ],
    }));
  });

  return grid;
}

function buildKeyboard() {
  const kb = document.querySelector('[data-keyboard]');
  if (!kb) return;
  clearChildren(kb);
  kb.classList.toggle('keyboard-tap', state.selectedMode === 'tap');

  if (state.selectedMode === 'tap') {
    kb.appendChild(buildTapGrid());
    return;
  }

  KEYBOARD_LAYOUT.forEach((row) => {
    const rowEl = el('div', { className: 'kb-row' });
    row.forEach((key) => rowEl.appendChild(renderKey(key)));
    kb.appendChild(rowEl);
  });
}


function setAlphabet(name) {
  if (!Object.prototype.hasOwnProperty.call(ALPHABETS, name)) return;
  const def = ALPHABETS[name];
  state.alphabetName = name;
  state.chars = def.tokens ? [...def.tokens] : def.chars.split('');
  state.N = def.n;
  // If currently in a game, reset
  if (state.screen === 'game') {
    state.queue = [];
    state.sc = 0;
    state.si = 0;
    state.startTime = performance.now();
    state.elapsedMs = 0;
    state.pauseAccumMs = 0;
    state.letterStats = {};
    state.targetShownAt = state.startTime;
    refillQueue();
  }
  render();
  renderDevAlphabets();
}


function renderDevAlphabets() {
  const container = document.querySelector('[data-alphabet-buttons]');
  if (!container) return;
  clearChildren(container);
  Object.entries(ALPHABETS).forEach(([name, def]) => {
    const isActive = name === state.alphabetName;
    const btn = el('button', {
      className: 'btn btn-ghost' + (isActive ? ' btn--active' : ''),
      text: def.label,
      attrs: {
        'data-pick-alphabet': name,
        'title': def.note,
        'type': 'button',
      },
    });
    container.appendChild(btn);
  });
}

function toggleDevPanel() {
  const panel = document.querySelector('[data-dev-panel]');
  panel.hidden = !panel.hidden;
}

function persistHistory() {
  try {
    localStorage.setItem('bitrate-history', JSON.stringify(state.history));
    localStorage.setItem('bitrate-aggregate-letters', JSON.stringify(aggregateLetterStats));
  } catch {
    // ignore quota / privacy mode
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('bitrate-history');
    state.history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.history)) state.history = [];
  } catch {
    state.history = [];
  }
  try {
    const raw = localStorage.getItem('bitrate-aggregate-letters');
    aggregateLetterStats = raw ? JSON.parse(raw) : {};
    if (typeof aggregateLetterStats !== 'object' || aggregateLetterStats === null) {
      aggregateLetterStats = {};
    }
  } catch {
    aggregateLetterStats = {};
  }
}

function renderHistory() {
  const list = document.querySelector('[data-history]');
  if (!list) return;
  clearChildren(list);

  if (state.history.length === 0) {
    const li = el('li');
    li.appendChild(el('span', { text: 'no runs yet' }));
    list.appendChild(li);
    return;
  }

  const recent = state.history.slice(-12).reverse();
  recent.forEach((r) => {
    const li = el('li');
    li.appendChild(el('span', { text: String(r.alphabet) }));
    li.appendChild(el('span', {
      text: `${r.sc}c · ${r.si}e · ${Number(r.cps).toFixed(1)}cps`,
    }));
    li.appendChild(el('span', {
      className: 'history-rate',
      text: Number(r.bitRate).toFixed(2) + ' bps',
    }));
    list.appendChild(li);
  });
}

function exportHistory() {
  const blob = new Blob(
    [JSON.stringify(state.history, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bitrate-history-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearHistory() {
  state.history = [];
  aggregateLetterStats = {};
  persistHistory();
  renderHistory();
  renderLetterStats();
}

// Render the per-letter timing summary in the dev panel: top 8 slowest
// letters from the aggregate (across all eval sessions), plus a projected
// bit-rate gain from dropping the slowest 4.
function renderLetterStats() {
  const container = document.querySelector('[data-letter-stats]');
  if (!container) return;
  clearChildren(container);

  const rows = letterStatsSummary(aggregateLetterStats, 3);
  if (rows.length < 4) {
    container.appendChild(el('p', {
      className: 'dev-empty',
      text: 'play a few eval rounds to collect per-letter timing.',
    }));
    return;
  }

  // Top 8 slowest
  const top = rows.slice(0, 8);
  const header = el('div', { className: 'letter-row letter-row-head' });
  header.appendChild(el('span', { text: 'letter' }));
  header.appendChild(el('span', { text: 'mean' }));
  header.appendChild(el('span', { text: 'n' }));
  header.appendChild(el('span', { text: 'err' }));
  container.appendChild(header);

  for (const r of top) {
    const row = el('div', { className: 'letter-row' });
    row.appendChild(el('span', { className: 'letter-glyph', text: r.letter }));
    row.appendChild(el('span', { text: `${r.meanMs.toFixed(0)}ms` }));
    row.appendChild(el('span', { text: String(r.count) }));
    row.appendChild(el('span', {
      text: r.errors > 0 ? `${(r.errorRate * 100).toFixed(0)}%` : '·',
    }));
    container.appendChild(row);
  }

  // Calibrated alphabet preview + apply button
  const calibrated = calibratedAlphabet(state.chars, 4, 5);
  if (calibrated && calibrated.length >= 3) {
    const meanAll = rows.reduce((s, r) => s + r.meanMs, 0) / rows.length;
    const droppedRows = rows.slice(0, 4);
    const meanDropped = droppedRows.reduce((s, r) => s + r.meanMs, 0) / droppedRows.length;
    const speedGain = meanDropped / meanAll - 1; // fractional, positive means dropped are slower
    const bitsLoss = Math.log2(state.N - 1) / Math.log2(calibrated.length - 1) - 1;
    const netDelta = speedGain - bitsLoss;

    const preview = el('div', { className: 'calibrate-preview' });
    preview.appendChild(el('div', {
      className: 'calibrate-line',
      children: [
        el('span', { className: 'meta', text: 'drop 4 slowest →' }),
        el('span', {
          className: 'mono',
          text: top.slice(0, 4).map((r) => r.letter).join(' '),
        }),
      ],
    }));
    preview.appendChild(el('div', {
      className: 'calibrate-line',
      children: [
        el('span', { className: 'meta', text: 'projected Δ' }),
        el('span', {
          className: 'mono',
          text: `speed +${(speedGain * 100).toFixed(1)}% · bits -${(bitsLoss * 100).toFixed(1)}% · net ${(netDelta * 100 >= 0 ? '+' : '')}${(netDelta * 100).toFixed(1)}%`,
        }),
      ],
    }));
    const applyBtn = el('button', {
      className: 'btn btn-primary btn-sm',
      text: 'use calibrated alphabet',
      attrs: { 'data-action': 'use-calibrated' },
    });
    preview.appendChild(applyBtn);
    container.appendChild(preview);
  }
}

function useCalibratedAlphabet() {
  const calibrated = calibratedAlphabet(state.chars, 4, 5);
  if (!calibrated || calibrated.length < 3) return;
  const name = 'calibrated';
  ALPHABETS[name] = {
    label: `calibrated · ${calibrated.length} (drop slowest 4)`,
    tokens: [...calibrated],
    n: calibrated.length,
    note: 'dropped your slowest 4 tokens from current alphabet based on history',
  };
  setAlphabet(name);
}

// i.i.d. sanity check: sample 10k chars, return uniformity + autocorrelation stats
function runSanityIID() {
  const N_SAMPLES = 10_000;
  const counts = new Map();
  state.chars.forEach((c) => counts.set(c, 0));
  const stream = [];
  for (let i = 0; i < N_SAMPLES; i++) {
    const c = sampleChar(state.chars);
    counts.set(c, counts.get(c) + 1);
    stream.push(c);
  }

  const expected = N_SAMPLES / state.chars.length;
  let chi2 = 0;
  counts.forEach((obs) => {
    chi2 += Math.pow(obs - expected, 2) / expected;
  });
  const df = state.chars.length - 1;

  let matches = 0;
  for (let i = 1; i < stream.length; i++) {
    if (stream[i] === stream[i - 1]) matches++;
  }
  const matchRate = matches / (N_SAMPLES - 1);
  const expectedMatchRate = 1 / state.chars.length;

  const maxCount = Math.max(...counts.values());
  const histLines = [...counts.entries()].map(([c, n]) => {
    const bar = '▇'.repeat(Math.round((n / maxCount) * 16));
    return `${c}  ${String(n).padStart(5)}  ${bar}`;
  });

  const lines = [
    `samples            ${N_SAMPLES}`,
    `alphabet           ${state.alphabetName} (N=${state.N})`,
    `expected/bin       ${expected.toFixed(1)}`,
    `chi-square         ${chi2.toFixed(2)}  (df=${df})`,
    `lag-1 match rate   ${matchRate.toFixed(4)}  (expected ${expectedMatchRate.toFixed(4)})`,
    ``,
    ...histLines,
  ];

  const out = document.querySelector('[data-sanity-output]');
  if (out) out.textContent = lines.join('\n');
}


function onWindowBlur() {
  if (state.screen !== 'game') return;
  if (state.mode !== 'eval') return;
  if (state.pausedAt !== null) return;
  state.pausedAt = performance.now();
  const overlay = document.querySelector('[data-blur-overlay]');
  if (overlay) overlay.hidden = false;
}

function onWindowFocus() {
  if (state.pausedAt === null) return;
  state.pauseAccumMs += performance.now() - state.pausedAt;
  state.pausedAt = null;
  const overlay = document.querySelector('[data-blur-overlay]');
  if (overlay) overlay.hidden = true;
}


function wireActions() {
  document.querySelectorAll('[data-action]').forEach((node) => {
    node.addEventListener('click', () => {
      const action = node.dataset.action;
      switch (action) {
        case 'open-start-choice':        toggleStartChoice(true); break;
        case 'reset-calibration':        startCalibration(); break;
        case 'begin-ready-run':          beginReadyRun();    break;
        case 'start-scored':
          setChannelMode(state.selectedStartMethod || suggestedMethod());
          toggleStartChoice(false);
          startEval();
          break;
        case 'warm-up':                   startCalibrationFromMode(state.selectedStartMethod || suggestedMethod()); break;
        case 'start-recommended-eval':   startRecommendedEval(); break;
        case 'restart-eval':
        case 'start-eval-from-practice':  startEval();       break;
        case 'restart-current': {
          // Restart whichever mode is currently active: a scored eval
          // restarts the eval, a warm-up run restarts the warm-up.
          if (state.mode === 'eval') {
            startEval();
          } else {
            const modeId = state.calibration?.currentMode || state.selectedMode || 'full';
            startCalibrationRun(modeId);
          }
          break;
        }
        case 'abort-eval':                abortEval();       break;
        case 'back-to-title':             backToTitle();     break;
        case 'export-history':            exportHistory();   break;
        case 'clear-history':             clearHistory();    break;
        case 'sanity-iid':                runSanityIID();    break;
        case 'close-dev':                 toggleDevPanel();  break;
        case 'use-calibrated':            useCalibratedAlphabet(); break;
        case 'open-leaderboard-popup':    openLeaderboardPopup(); break;
        case 'close-leaderboard-popup':   closeLeaderboardPopup(); break;
      }
    });
  });

  const popup = document.querySelector('[data-leaderboard-popup]');
  if (popup) {
    // Backdrop click closes; clicks inside the card don't bubble out.
    popup.addEventListener('click', (event) => {
      if (event.target === popup) closeLeaderboardPopup();
    });
  }
  // Esc closes the popup whenever it's open, ahead of the game keydown handler.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const p = document.querySelector('[data-leaderboard-popup]');
    if (p && !p.hidden) {
      closeLeaderboardPopup();
      event.stopPropagation();
    }
  }, true);

  document.querySelectorAll('[data-pick-method]').forEach((node) => {
    node.addEventListener('click', () => {
      state.selectedStartMethod = node.dataset.pickMethod;
      renderStartChoice();
    });
  });

  const calibrationModes = document.querySelector('[data-calibration-modes]');
  if (calibrationModes) {
    calibrationModes.addEventListener('click', (event) => {
      const target = event.target.closest('[data-choose-mode]');
      if (target) {
        startCalibrationRun(target.dataset.chooseMode);
        return;
      }
      // Tapping a measured method card selects it for the scored run.
      const card = event.target.closest('[data-calibration-card]');
      if (!card) return;
      const modeId = card.dataset.calibrationCard;
      if (!state.calibration.results[modeId]) return;
      state.calibration.selectedRunMode = modeId;
      render();
    });
  }

  const alphPicker = document.querySelector('[data-alphabet-buttons]');
  if (alphPicker) {
    alphPicker.addEventListener('click', (e) => {
      const target = e.target.closest('[data-pick-alphabet]');
      if (!target) return;
      setAlphabet(target.dataset.pickAlphabet);
    });
  }

  const lbForm = document.querySelector('[data-leaderboard-form]');
  if (lbForm) {
    lbForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.querySelector('[data-leaderboard-name]');
      submitScore(input ? input.value : '');
    });
  }
  // Keep typing in the name field from reaching the game keydown handler
  // (Enter on the results screen would otherwise restart calibration).
  const lbInput = document.querySelector('[data-leaderboard-name]');
  if (lbInput) lbInput.addEventListener('keydown', (event) => event.stopPropagation());

  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);

  const softInput = document.querySelector('[data-soft-keyboard-input]');
  if (softInput) {
    softInput.addEventListener('beforeinput', handleSoftKeyboardBeforeInput);
    softInput.addEventListener('input', handleSoftKeyboardInput);
  }

  const gameScreen = document.querySelector('.screen-game');
  if (gameScreen) {
    gameScreen.addEventListener('click', focusSoftKeyboardInput);
    gameScreen.addEventListener('pointerdown', (event) => {
      const target = event.target.closest('[data-tap-token]');
      if (!target || state.selectedMode !== 'tap') return;
      event.preventDefault();
      if (state.awaitingStart) {
        if (target.dataset.tapToken === state.queue[0]) {
          beginReadyRun();
          processStruckToken(target.dataset.tapToken);
        }
        return;
      }
      processStruckToken(target.dataset.tapToken);
    });
  }

  const overlay = document.querySelector('[data-blur-overlay]');
  if (overlay) {
    overlay.addEventListener('click', () => {
      window.focus();
      onWindowFocus();
    });
  }
}

function init() {
  // URL param ?alphabet=letters22 swaps alphabet without UI
  const params = new URLSearchParams(window.location.search);
  const alphParam = params.get('alphabet');
  if (alphParam && Object.prototype.hasOwnProperty.call(ALPHABETS, alphParam)) {
    setAlphabet(alphParam);
  }
  if (params.get('dev') === '1') {
    const panel = document.querySelector('[data-dev-panel]');
    if (panel) panel.hidden = false;
  }

  buildKeyboard();
  loadHistory();
  renderHistory();
  renderLetterStats();
  renderDevAlphabets();
  wireActions();
  toggleStartChoice(false);
  applyScreen();
}

document.addEventListener('DOMContentLoaded', init);

// Expose a tiny debug API for self-tests
window.__bitrate = {
  state,
  ALPHABETS,
  setAlphabet,
  computeBitRate,
  bitsPerSelection,
  runSanityIID,
  exportHistory,
};
