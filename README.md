# Channel

Live: **[jeevankarandikar.com/projects/channel](https://jeevankarandikar.com/projects/channel)**

## Running it

- **Hosted:** [jeevankarandikar.com/projects/channel](https://jeevankarandikar.com/projects/channel) on Vercel.
- **Local:** `./run.sh`. Starts `python3 -m http.server` and opens the page.

No npm, no build step. The 60-second measurement is fully client-side. The
optional online leaderboard reads from a Supabase table over HTTPS (row-level
security is enabled; the anon key is public by design); if there's no network
the board shows "leaderboard unavailable" and the run isn't blocked.

## Why N = 25

The formula creates the problem. Small alphabets are fast to hit but worth
fewer bits each; large alphabets are worth more per hit but add travel,
search, and errors. `N = 2` scores zero, since `log2(1) = 0`.

`N - 1` reserves one key for backspace in real BCIs. Channel has no backspace;
`Si` does the equivalent via `max(Sc - Si, 0)`.

I didn't want to pick by my personal taste, so I wrote
`simulate_alphabets.mjs`, a Monte Carlo search scored against a modeled panel
of player types using per-key timing from Salthouse 1984 and skilled-typing
control from Logan and Crump 2011. The ship alphabet is 24 fast letters plus
space, dropping `q` and `z` (the two least-typed and slowest-typed letters):

```text
a b c d e f g h i j k l m n o p r s t u v w x y space
```

Pilot testing surfaced one thing the simulator doesn't model. In a
random-symbol stream, `.` and `,` impose a cognitive context-switch even on
quick typists, a half-beat where your hand's mid-flow and your brain has to
register "oh, punctuation." The simulator only prices per-key motor time, not
the mental mode-shift. So punctuation's out, space stays in (it's the fastest
key on the keyboard at 125ms, tied with `f` and `j`, and the most over-trained
motor pattern in English typing). At `N = 25` each correct hit's worth
`log2(24) = 4.58` bits, matching the 5x5 touchband grid.

How the alphabet got here:

- **Simulator winner:** 22 fast letters + space + `.` + `,`. Panel-avg 24.3 bps.
- **Ship alphabet:** dropped punctuation, added `p` and `x`. About 2% lower in simulator, faster in pilot.

Two natural followups also lost in the search. Top-row digits push `N` up but
type slower per Salthouse, so the extra `log2(N - 1)` doesn't pay for itself.
A punctuation-only set is fast per key but collapses `N` and tanks bits per
hit.

## Why keyboard and touch

I considered voice, mouse grids, gaze, chords, steno, MIDI, and controller
input. Keyboard won for the obvious reasons:

- Overtrained symbol-to-finger motor memory.
- Ten fingers, one action per target.
- No special hardware, runs anywhere.

The one open question is whether direct spatial tapping on a touchscreen can
beat that keyboard motor memory at the same alphabet size. So Channel ships
two methods at `N = 25`:

- **fullband** (full keyboard): the 24 letters + space alphabet above.
- **touchband** (tap grid): a 5x5 grid of 25 direct targets, for tablet or phone.

The methods are device-dependent. The app suggests the one that fits your
device, lets you warm up, then runs the scored 60 seconds. Run each on its
own device and keep your best.

## Other design choices

- **Home row was tested and cut.** Scored about 28% below the 25-key set in
  simulation; friends confirmed it was the weakest method. Kept only as a
  data point in `simulate_alphabets.mjs`.
- **Silent by design.** Background music is a textbook confound for a
  bit-rate metric (arousal, tempo, individual differences), and the evidence
  for binaural-beat benefits is weak or debunked.
- **Target colors are a vision-science choice.** Current target is gold, next
  target is high-luminance cool blue, picked for fast detection on the dark
  plate and to stay distinguishable for color-blind players. Errors never
  rely on color alone: a wrong hit also shakes the board to alert the player.
- **Visual system** (paper-instrument register, dark plate, ledger comparison
  chart) is documented in `DESIGN.md`.

## Citations

Every number and design choice here is grounded in published work. Full
bibliography with DOIs is in `REFERENCES.md`.

- **Bit-rate formula:** Shenoy et al. 2021. The achieved-bit-rate formula the
  assignment specifies.
- **Per-key timing + skilled typing:** Salthouse 1984, Logan and Crump 2011.
  Base of the Monte Carlo simulator.
- **Comparison chart benchmarks:**
  - Jude et al. 2026 (QWERTY iBCI, 6.6 bps raw).
  - Willett 2021 (handwriting iBCI, 4.9 bps raw).
  - Pandarinath 2017 (cursor iBCI, 2.4 bps).
  - Chen et al. 2015 (SSVEP non-invasive, 5.3 bps).
  - Neuralink / Arbaugh 2024 (cursor BCI, 9 bps).
  - MacKenzie 1992 (Fitts'-law / mouse throughput baseline, ~4.5 bps).
  - P300 speller (EEG, ~0.3 bps): noted in the brief and across the BCI literature, Wolpaw 2002 surveys the range.
- **Color and detection:** Töllner 2020, Komban 2014, Wong 2011.
- **Silence rationale:** Kämpfe 2010 meta-analysis, Pietschnig and Oberleiter
  Mozart-effect debunks.

## Scoring and feedback

- Targets sampled with `crypto.getRandomValues()` and rejection sampling: no
  modulo bias.
- Four-target queue stays visible from the ready screen through the run,
  matching the 3-5 character eye-hand span in typing research. Targets are
  still i.i.d.; the queue is a preview, not a model.
- Correct input increments `Sc`; wrong input increments `Si`, doesn't advance
  the target, and flashes the correct target red.
- Auto-suggests `fullband` on keyboard devices, `touchband` on touch, via
  `matchMedia('(pointer: coarse)')`.
- Scored run pauses on window blur, resumes on focus.
- Final screen reports `B`, `N`, `Sc`, `Si`, a 60-second trajectory, a
  per-target speed map (fastest to slowest), and a comparison against raw
  published BCI rates.

## In-app polish

- Title screen has a "see the leaderboard" link that opens the live top 10 before you commit to a run.
- Mid-run HUD: `restart` re-rolls cleanly without losing your selected method; `exit` returns to title. Works in both warm-up and scored eval.
- Touchband ready overlay clarifies "tap the yellow square (not blue) to start" and recommends two hands.
- Results stat cells caption every abbreviation (`N` = alphabet size, `Sc` = correct hits, `t` = seconds, etc.) so the Shenoy formula doesn't need separate explanation.
- Per-target speed map shows `Nx✓ Nx✗` for each target you hit, ordered fastest to slowest.
- Comparison chart sorted best-to-worst with "you" pinned at the top.

## What's prod-ready about this

None of these were in the brief.

- **Hosted on Vercel** with a locked-down CSP: `default-src 'self'`, no
  `unsafe-eval`, no remote scripts. HSTS preload, `nosniff`, strict
  `Referrer-Policy`, `frame-src 'none'`.
- **No injection surface.** All DOM via `createElement` and `textContent`.
  No `innerHTML`, no dynamic code evaluation, no string timers.
- **Live leaderboard backed by Supabase.** RLS-guarded: the `scores` table
  allows public `SELECT` and `INSERT` only, verified by REST probe. Anon key
  is public by design.
- **Keyboard accessible.** Tab reaches every interactive surface; every
  focusable element renders a `:focus-visible` ring at 2px marigold, 3px
  offset.
- **Reduced motion honored.** `prefers-reduced-motion: reduce` zeros every
  entrance animation.
- **320px responsive.** Tap-grid cells stay at 54.7px on iPhone SE, above
  the 44px Apple HIG touch target.
- **Pause on blur.** Tabbing away mid-run halts the timer.
- **Offline-first.** The 60-second measurement is entirely client-side.
- **Auditable claims.** Three `verify_*.mjs` files reproduce the scoring
  math, the i.i.d. chi-square check, and the alphabet Monte Carlo.
- **Hosted and local are byte-identical.** Same `game.js` and `styles.css`;
  only the hosted `index.html` differs (absolute asset paths for the route).
- **Favicon and OG image.** Link preview has the wordmark, browser tab has
  the marigold-dot mark.

## First-session anecdotes

Friends played cold on their own devices, no practice beyond the 15-second
warm-up. Live scores are on the in-app leaderboard.

- Most cleared both the raw (~6 bps) and LM-corrected (8.6 bps) QWERTY iBCI
  rates from Jude et al. 2026, on a task that forbids LM help.
- The in-app chart plots the raw figure (6.6 bps) so the comparison's honest.
- Chethan K is the cross-device datapoint the two methods were built to
  produce: 13.07 on keyboard, 9.86 on touch, so fullband wins by about 3 bps
  for him.
- Faster typists and faster phones push higher; slow typists land lower,
  exactly what the channel-capacity framing predicts.
- On a phone the 5x5 cells are small, so touch picks up more mis-taps than
  on a tablet, inherent to keeping `N = 25` on a small screen.

## Verifying

```sh
node verify_scoring.mjs     # scoring formula + i.i.d. sampling sanity
node verify_tap_grid.mjs    # tap-grid pilot checks
node simulate_alphabets.mjs # reproduces the alphabet choice
```

## Files

```text
channel/
├── index.html
├── styles.css
├── game.js
├── run.sh
├── verify_scoring.mjs
├── verify_tap_grid.mjs
├── simulate_alphabets.mjs
├── CLAUDE.md
├── DESIGN.md
├── REFERENCES.md
└── README.md
```
