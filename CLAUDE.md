# channel

Project context I keep for Claude Code while working on this repo: house rules,
current state, deploy steps. Shipping it with the submission because how I work
with AI tooling is part of the answer.

## conventions

- Keep UI copy short, technical, and direct.
- Do not add decorative eyebrow labels, marketing language, or explanatory chrome to the app.
- Put rationale in `README.md`, `DESIGN.md`, and `REFERENCES.md`; keep the game focused on measurement.
- README and doc prose use professional sentence/title case (not all-lowercase) and Jeevan's natural voice. App UI copy stays lowercase by design.
- No em dashes anywhere (hard rule). Use commas, colons, or periods. Hyphens in compound words are fine; the `—` glyph as a "no value" placeholder in the HUD is allowed.
- No emoji.
- Comments should explain why, not what.

## app

- Single-page vanilla web app: `index.html`, `styles.css`, `game.js`.
- Local run command: `./run.sh`.
- Verification commands:
  - `node --check game.js`
  - `node verify_scoring.mjs`
  - `node verify_tap_grid.mjs`
  - `node simulate_alphabets.mjs`

## design

- Product name: `Channel`.
- Metric name: `bit rate`.
- Shipped methods: `full keyboard` (fullband) and `tap grid` (touchband). `home row` exists only in `simulate_alphabets.mjs` as a data point, never wired into the UI.
- Visual register: paper-instrument, clinical, restrained.
- Avoid generic dashboard/card visuals.

## state

- Ship alphabet: 24 letters + space, `N = 25`. Drops `q` and `z` (least-typed and slowest per Salthouse) and punctuation (cognitive context-switch the simulator does not price). Internal key is `ship` in both `game.js` and `simulate_alphabets.mjs`.
- Touchband: 5x5 tap grid, also `N = 25`.
- Live URL: `jeevankarandikar.com/projects/channel`. Hosted on Vercel.
- Leaderboard: Supabase project `gbuxhwowkilajdenonky`, `scores` table, RLS = public `SELECT` + `INSERT` only. Anon key is public by design.
- Source repo on github: `github.com/jeevankarandikar/channel`, `main` branch.

## UI surfaces

- **Title screen:** hero + Shenoy formula + `begin` + `see the leaderboard` link.
- **Picker:** fullband / touchband, one tagged `your device` via `matchMedia('(pointer: coarse)')`.
- **Ready overlay:** queue + plate behind it. Touchband: "tap the yellow square (not blue)" + two-hands hint. Fullband: "set your hands normally".
- **In-run HUD:** `Sc` / `Si` / `N` / accuracy / mode + `restart` + `exit`. `restart-current` action branches on `state.mode` so warm-up restarts warm-up and eval restarts eval.
- **Results:** hero bps, captioned stat cells (N → alphabet size, etc.), trajectory chart, 5x5 target speed map showing `Nx✓ Nx✗`, raw-rate-benchmarks chart sorted best-to-worst, leaderboard form + top 10.
- **Dev panel:** `Shift + Cmd + D` toggles. Alphabet swap, history, chi-square sanity.

## deploy

Local repo is not a git repo. Deploy from the worktree at
`/Users/jeevankarandikar/.config/superpowers/worktrees/jeevankarandikar.com/channel-deploy-main/`.

1. Bump `?v=tttNN` in local `index.html`.
2. Copy `game.js` + `styles.css` to the worktree.
3. Regenerate worktree's `index.html` with absolute `/projects/channel/` paths.
4. `git commit && vercel --prod --yes && git push origin main`.

Favicon (`favicon.svg`) and OG image (`og.svg`) live in the worktree at
`/projects/channel/`. CSP for the route lives in `vercel.json` and lists
Supabase + the font CDN as the only allowed `connect-src` / `font-src` origins.
