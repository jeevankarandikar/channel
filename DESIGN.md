---
name: Channel
description: >
  Editorial scientific paper register. Cream page, ink type, single
  marigold accent, dark instrument plate inset. Two methods at fixed
  alphabet size: fullband (full keyboard) and touchband (5x5 tap grid).
  Device-aware flow: the matching method is suggested per device, primary
  action is the scored 60-second run, optional 15-second warm-up.
version: 1.0-2026-05-28
colors:
  paper-bg:        "oklch(90.8% 0.045 82)"
  paper-raised:    "oklch(88.8% 0.044 82)"
  paper-card:      "oklch(94.0% 0.032 82)"
  ink-primary:     "oklch(20% 0.025 280)"
  ink-secondary:   "oklch(40% 0.020 280)"
  ink-quiet:       "oklch(58% 0.015 280)"
  ink-line:        "oklch(20% 0.025 280 / 0.10)"
  ink-line-strong: "oklch(20% 0.025 280 / 0.22)"
  accent:          "oklch(70% 0.165 75)"
  accent-soft:     "oklch(88% 0.08 75)"
  accent-line:     "oklch(70% 0.165 75 / 0.40)"
  accent-glow:     "oklch(70% 0.165 75 / 0.45)"
  plate-bg:        "oklch(28% 0.030 280)"
  plate-raised:    "oklch(32% 0.030 280)"
  plate-line:      "oklch(70% 0.020 280 / 0.12)"
  plate-text-dim:  "oklch(50% 0.020 280)"
  plate-text:      "oklch(82% 0.018 80)"
  plate-target:    "oklch(82% 0.18 75)"
  error:           "oklch(50% 0.165 28)"
typography:
  display:
    fontFamily: Source Serif 4
    fontWeight: 700
    fontSizeMin: 96
    fontSizeMax: 240
    letterSpacing: -0.035em
    lineHeight: 0.92
  rate:
    fontFamily: Source Serif 4
    fontWeight: 700
    fontSizeMin: 56
    fontSizeMax: 144
    letterSpacing: -0.03em
    fontVariantNumeric: tabular-nums
  queue-char:
    fontFamily: Source Serif 4
    fontWeight: 700
    fontSizeMin: 48
    fontSizeMax: 96
    fontStyle: italic (positions 1-3), upright (position 0)
  body:
    fontFamily: Hubot Sans
    fontWeight: 400
    fontSize: 16
    lineHeight: 1.55
  meta:
    fontFamily: Hubot Sans
    fontWeight: 500
    fontSize: 11
    letterSpacing: 0.14em
    textTransform: uppercase
  hud-value:
    fontFamily: Hubot Sans
    fontWeight: 500
    fontSize: 15
    fontVariantNumeric: tabular-nums
  key-label:
    fontFamily: Hubot Sans
    fontWeight: 500
    fontSize: 13
spacing:
  unit: 4
  scale: [4, 8, 12, 16, 24, 40, 64, 96]
rounded:
  key: 6
  plate: 14
  card: 14
  pill: 9999
easing:
  out:   "cubic-bezier(0.22, 1, 0.36, 1)"
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)"
duration:
  fast: "180ms"
  base: "260ms"
  slow: "420ms"
  entrance: "640ms"
---

# Channel design system

Source of truth for the visual language. The YAML frontmatter above is
machine-readable tokens; the prose below is the rationale. See
`REFERENCES.md` for the research and design references behind these
choices.

The register is editorial scientific paper with a dark instrument plate
inset into the cream page. The page is paper. The keyboard is a contained
dark plate set into the page, where a warm marigold-amber glow marks the
current target. Everything else (typography, stats, the comparison chart)
lives on the cream paper around the plate.

The interface supports two methods:

- **fullband** (full keyboard): 25-key alphabet, higher bits per hit, more
  movement.
- **touchband** (tap grid): 5x5 direct-touch surface for tablet or phone.

A third method, home row, was tested and cut; see `README.md`.

## Overview

### Audience

The BCI engineering review panel will play this for sixty seconds each.
They are reading the README, the rendered interface, and the source as a
single body of work. Design quality is being judged alongside the bit
rate the game extracts from them.

Assume mixed player ability: one very fast typist, one balanced product
engineer, and one slower or less keyboard-specialized reviewer. Do not
build UI copy around named individuals.

The brief explicitly says the reviewers are tired of "8-target
center-out tasks." Any aesthetic move that reads as a generic AI
dashboard weakens the submission.

### Voice

Three words: **paper-instrument, clinical, considered**.

The interface voice is declarative, technical, restrained, and
confident. It lives in the same register as a Stanford technical report,
a Nature methods section, or a mid-century scientific instrument's
readout panel. It is not sci-fi BCI cosplay, not a gamer overlay, and
not a SaaS dashboard.

The work is a measurement instrument first and a portfolio piece
second. The instrument is the thing being shown; the chrome is the thing
being removed.

**Name.** Use **Channel** for the product. Use **bit rate** only for the
metric. Two playable methods, labelled by a channel-bandwidth analogy that fits
an instrument measuring an information channel: **fullband** (full keyboard) and
**touchband** (tap grid). The literal input method stays as a lower-case
subtitle so the technical name is never lost.

**Positioning.** This is a measurement instrument on paper, not a sci-fi
BCI game. The aesthetic refuses the dark gamer register the panel is tired
of seeing. The strongest move available is to look like a Stanford
technical report that happens to be playable.

**Register.** Editorial scientific paper. Cousins: a Nature methods
section, a Le Labo product page, the cover of a 1970s scientific journal,
Stripe documentation, Apple Health's "Show All Data" detail view. Not
monkeytype, not a gamer overlay, not a SaaS dashboard.

**Personal-site alignment.** The app should borrow the restraint of
`jeevankarandikar.com`: simple lowercase navigation language, clear
centered moments, generous quiet space, and almost no explanatory chrome.
If a line sounds like onboarding copy, remove it or move it to the
README.

## Colors

### Discipline

- **Light mode only.** This is a paper. No theme toggle.
- **Single accent.** Warm marigold-amber `oklch(70% 0.165 75)` appears in
  exactly two places: the current target glow inside the plate, and the
  "you" bar in the results comparison chart. Nowhere else.
- **Error red is structural.** Only used for the wrong-key flash (held
  until the correct key is pressed, up to 420ms). Never as a static UI color.
- **Ink, not black.** All text is `oklch(20% 0.025 280)` - a deep
  indigo-tinted ink, not pure black. Tints the page subliminally toward
  the same hue as the dark plate.
- **Cream, not white.** Page is `oklch(90.8% 0.045 82)` with a subtle
  vellum gradient and faint grid texture. It should clearly read as warm
  paper, not default white.

### Plate layout

The keyboard's "plate" is the only dark surface on the page:
`oklch(28% 0.030 280)`. This is the contained "lit room" interpretation
of the brief - a *plate set into the paper*, not the whole interface.
Inside the plate, the warm marigold glow on the current target reads like
a single LED indicator on a piece of lab equipment.

## Typography

### Two faces, both deliberately outside the reflex list

1. **Source Serif 4 Variable** - display, hero, rate readout, queue
   chars. Adobe's open-source serif optimized for digital scientific
   reading. Variable axis (200-900 weight, optical-size 8-60). Provides
   the "research paper" gravitas.
2. **Hubot Sans Variable** - body, meta, HUD labels, numerics, keyboard
   key labels, dev panel. GitHub's open-source humanist sans, variable
   weight 200-900, with tabular figures.

Both fonts are deliberately outside the common reflex-font list. No
Inter, Plus Jakarta, Outfit, DM Sans, IBM Plex, JetBrains Mono,
Fraunces, Crimson, Cormorant, or Playfair anywhere in this project.

### No monospace

Hubot Sans with `font-variant-numeric: tabular-nums` handles all numerics:
same column-alignment discipline, none of the developer-cliché register.
The only place a generic ui-monospace font appears is the dev panel's
chi-square output, which is genuine terminal output and earns its
monospace.

### Hierarchy

Hierarchy comes from size + weight + serif/sans contrast, not from cards.

- Display (hero "Channel"): clamp 96-240px, serif 700, tight tracking
- Rate readout (live B): clamp 56-144px, serif 700, tabular nums
- Queue chars: clamp 48-96px, serif 700, italic for queue 1-3 and upright
  for the current target. Italic-to-upright is the "moving toward the
  active" signal in editorial typography
- Body/meta: 11-16px, Hubot Sans 400-500
- Key labels: 13px, Hubot Sans 500

## Layout

### The page is the paper

- Max width 1280px, padding scales 24px to 96px on viewport.
- Title screen is centered and sparse: oversized lowercase `channel`,
  one direct subtitle, properly typeset Shenoy formula, and one large
  `begin` button.
- The wordmark in the top corner is a small italic serif "Channel" - a
  print-like masthead, not a logo.
- Generous whitespace. Avoid dashboard cards. Use a single restrained
  panel only when a flow needs focus, as in calibration.

### Title start choice

The title CTA should not say `start trial`. Use `begin`. Pressing it
opens a small choice panel:

- the device-suggested method is pre-selected and tagged `your device`
  (touch → touchband, keyboard → fullband); the player can switch to the other.
- the primary action starts the 60-second scored run with the selected method.
- `warm up 15s first` is the optional secondary - a single 15-second pilot.

Keep the panel lowercase, compact, and visually quieter than the primary
button.

### Warm-up panel

The post-warm-up panel is a centered product panel, not a methods page.

- Max width about 560px.
- Rounded warm paper surface with a very faint inset line.
- Centered wordmark, lowercase phase label, compact serif title.
- One instruction line only.
- Two method tiles showing the warm-up bps; the method the scored run will use
  carries an accent frame (selectable - tap to switch). No `fastest` race -
  keyboard vs touch is a cross-device call, not an in-app comparison.
- Actions stay visible without scrolling on common laptop viewports.
- No teaching diagram, no literal hand overlay, no side notes.
- No audio: Channel is silent by design. Background music is an uncontrolled
  confound for a bit-rate metric (arousal, tempo entrainment, individual
  differences), and the evidence for music/binaural-beat benefits is weak or
  debunked. Any future auditory feedback stays off by default and silent during
  the scored run. Rationale and citations live in `README.md` / `REFERENCES.md`.

### The plate

Single dark surface containing the rendered keyboard, with a subtle drop
shadow into the page below. Border-radius 14px. Padding clamp 14-22px.
The plate is the only place dark color exists in the interface.

### The keyboard

full keyboard mode uses five rows of Mac keys: digits, qwerty, asdf,
zxcv, modifiers + space. Letters and selected punctuation are active
surfaces; modifiers and unused keys are rendered dim. Each key is a
thin-bordered rectangle in the plate.

tap grid mode uses a 5x5 grid with 25 direct targets. It should be shown
as a large touch-first surface, not as a keyboard. The copy should steer
reviewers toward iPad or large touchscreens while keeping the mode
available everywhere for pilot comparison.

## Lit-keyboard rendering

### Key states (priority order)

| State | Background | Border | Color | Glow |
| --- | --- | --- | --- | --- |
| idle | `plate-raised` | thin `plate-line` | `plate-text-dim` | none |
| in-alphabet | `plate-raised` | thin `plate-line` | `plate-text` | none |
| queue-3 | slight lift | thin `plate-line` | `plate-text` | none |
| queue-2 | more lift | medium accent-tinted | `plate-text` | none |
| queue-1 | warm tint | accent-tinted | warm | none |
| **target** | amber-tinted | `accent` border | `plate-target` | strong amber halo |
| error (≤420ms) | `error-soft` overlay | `error` border | red text | brief red ring |

The current target glow is a single `box-shadow` with a multi-stop bloom,
not a stack of decorative layers. Animation: 220ms ease-out fade as the
queue advances. No pulse, no breathing - a measurement instrument
doesn't pulse.

### Dual coding (per the design plan)

The current target is rendered twice:

- As the leftmost large *upright* serif glyph in the queue strip above
  the plate
- As a glowing key inside the plate

Touch typists use the symbol-to-finger reflex; less-automatized users use
positional pattern matching on the plate. The player's brain picks the
route.

For full keyboard, do not turn the plate into the primary thing to read.
The target glyph and queue are primary. The plate confirms the motor map.
If the player visually searches the keyboard every trial, the design has
failed.

## Calibration

### Purpose

The two methods isolate the central question at a fixed alphabet size:

- fullband (full keyboard): overtrained symbol-to-finger motor memory.
- touchband (tap grid): same `N = 25`, but direct spatial tapping.

They are device-dependent, so the app suggests one per device rather than
racing them in one session; the player can warm up either, then the scored
eval locks the chosen method for the full sixty seconds.

The scored run (and any warm-up) has a ready state before the timer starts:

- fullband tells the reviewer to use their normal typing position.
- touchband recommends a tablet or phone.
- The run starts when the player hits the first target (no separate space
  press); clicking/tapping the lit target works as the fallback.

### Picker + warm-up prompts

Use short, concrete, lowercase copy:

- "choose your input"
- "fullband" / "use a full keyboard"  (tagged "your device" on a keyboard)
- "touchband" / "use a tablet, or a phone"  (tagged "your device" on touch)
- "keyboard and touchscreen are different channels, so run each on its own device and keep your best"
- "start 60s run · {method}" (primary) / "warm up 15s first" (secondary)
- "warm-up" / "start the scored run, or warm up again"  (post-warm-up panel)
- "warm up again" / "warm up {method}"  (per-tile)
- "set your screen" / "best on a tablet or phone" / "tap the lit square to start"
- "set your hands normally" / "use your normal typing position" / "hit the lit key to start"
- "reset" / "back"

Do not write a long methods explanation on the calibration screen.
Details live in `README.md`.

## Comparison chart

Refero **Operate** inspired the ledger-grid treatment:

- Each row is a thin label + a horizontal track with a ruled baseline +
  a tabular-nums value.
- Fill is a 2px ink line for reference rates, a 3px amber line for the
  "you" bar with a soft glow.
- Rows are separated by hairline ink rules (no card chrome).

A ledger feel signals "we measured something and plotted it", which fits
the project's framing better than flat grey bars in a card.

## Motion

### Vocabulary

- **blur-in** - filter blur(8px) to 0, opacity 0 to 1, translateY(20px) to 0,
  640-800ms cubic-bezier(0.22, 1, 0.36, 1). Used on the hero title and
  on the final B reveal.
- **fade-up** - opacity + 8px lift, 260ms ease-out. Used on the formula
  and CTA buttons entering after the hero.
- **fill-bar** - scale-x 0 to 1, 600ms ease-out, on the comparison bars.

### Motion discipline

- No bounce, no elastic, no scroll-jacking, no parallax.
- No breathing dot (a static marigold dot signals "live").
- Every animation wrapped in `prefers-reduced-motion: reduce` guards.
- Apple-style cubic-bezier easing throughout.

## Components

### Wordmark

Small italic Source Serif 4 "Channel" mark. Top-left corner on title
and results screens; centered inside the calibration panel; top-left of
the game screen. Reads as a print masthead.

### Buttons

Pill-shaped (border-radius 999px) per the editorial register.

- `btn-primary`: filled ink, cream text. Used for the primary action.
- `btn-ghost`: transparent with a hairline ink border.
- `btn-sm`: smaller variant for HUD inline actions.

Focus ring is the warm marigold accent at 2px / 3px offset.

### HUD

Top stats on the game screen, close to the target and easy to scan.
Inline stat pairs: tiny uppercase label + tabular-nums value. No card,
no ruled border. The action button (begin eval / abort) sits at the
right margin when space allows.

### Cursor

A custom CSS reticle: a small marigold ring with a center dot, drawn as a
cursor image (not a JS follower, so pointer motion stays instant). Interactive
targets swap it for a filled marigold dot. A dark halo keeps it legible on both
the cream page and the dark plate.

### Tap grid surface

A flush 5x5 board in a tic-tac-toe / 2048 register: cells fill their whole grid
track with thin divider lines, the current target fills the entire square solid
accent, the next target pre-lights in a cool blue (a dim second shade of gold
blurred into the current target at speed), and the highlight switches instantly
with no transition. Home row uses the same gold-current / blue-next pairing on
the finger guide.

## Do's and don'ts

### Do

- Lead with the rate readout as the visual hero. It is the measurement.
- Use the marigold accent in exactly two places: lit target, "you" bar.
- Let the cream paper dominate. Whitespace is the design.
- Honor `prefers-reduced-motion` everywhere.
- Keep the title and prompts terse. The README carries the iteration
  story.
- Use the input line: "Use the keyboard you are fastest on: phone,
  laptop, desktop, or iPad."
- Keep calibration centered, compact, and panel-like.

### Don't

- Don't reintroduce cyan, phosphor blue, or any cool accent.
- Don't reintroduce JetBrains Mono or any mono as dominant typography.
- Don't add a breathing dot. The indicator is static.
- Don't add dashboard cards or visible drop-shadow stacks.
- Don't add gradient text or glow text effects.
- Don't write narrative copy on screens. That belongs in README.md.
- Don't use side-stripe accent borders >1px.
- Don't call the modes "Relay 9", "Channel 25", or other internal names.
- Don't add method pages, explanatory overlays, or teaching illustrations
  that compete with the target.
