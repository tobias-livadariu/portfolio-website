# Implementation prompt

Paste everything below the line into a coding agent started in
`/Users/tobias/repos/portfolio-website/portfolio-v3`.

---

You are improving the visual design of `portfolio-v3`, Tobias Livadariu's
personal portfolio. It is a React 19, Vite, and React Three Fiber site: a
pixel-art starfield landing view with a 3D menu and three render modes (3D,
2D, ASCII), and below it a scrolling stack of four terminal-styled documents
(About, Resume, Portfolio, Contact).

A design review has already been done. Its findings are in
`docs/fable-improvements/FINDINGS.md`, with reference screenshots in
`docs/fable-improvements/screenshots/`. Read that file in full before anything
else. This prompt tells you how to act on it; the findings file holds the
evidence, the measurements, and the reasoning. Finding IDs below (A1, B2, and
so on) refer to it.

## What Tobias wants

The first goal is beauty. The site should be a beautiful personal website that
reflects him, does not look generic, and shows both technical ability and
personality.

The site is already good and he likes it. This is refinement, and the existing
aesthetic stays: the starfield, the three render modes, the diamond
transition, the terminal documents, the Dragon-Lucy palette. A change that
makes the site look more like a conventional portfolio is a regression even if
it scores better on a checklist.

Much of the terminal styling comes from his dotfiles at
`/Users/tobias/repos/dotfiles`. Treat those as a vocabulary to draw on, and
read these before designing anything new:

- `nvim/context/aesthetic-system.md` (colour meanings, allowed glyphs, borders)
- `nvim/lua/lucy/palette_dragon.lua` (the full palette, including shades the
  site does not use yet)
- `ghostty/config` and `ghostty/themes/kanagawa-dragon`
- `ghostty/context/STARSHIP-PROMPT.md`

He has said the site is not bound to match the dotfiles one to one. Deviate
when the result looks better, and say that you did.

## Ground rules

- **Dev server.** Tobias keeps Vite running at
  `http://localhost:5173/portfolio/`. Use it. Do not start a second one. The
  Playwright config starts its own server on port 5175 for tests, which is
  fine.
- **Look at what you build.** This is visual work, so judge it by screenshots,
  not by reading CSS. Capture before and after with Playwright at 390×844
  (2x, mobile), 820×1180, 1280×720, 1440×900, and 1920×1080, in each render
  mode a change touches. Wait for
  `.bg-transition-overlay[data-startup="true"]` to detach before capturing.
  Save captures to a temporary directory outside the repo.
- **Research before design choices.** For any Phase 2 item, do a short web
  search for current practice or inspiration first and mention what you found.
- **Options before large changes.** Phase 2 items are design decisions that
  belong to Tobias. Present them and wait; do not pick one and build it.
- **Do not invent facts about him.** Any new copy about his work must come
  from text already in the repo (`public/resume.pdf`, `portfolio-stories.ts`,
  the About constants) or from him. Where copy is needed and you do not have
  it, write a clearly marked placeholder and list it in your report.
- **Keep what works.** Preserve existing behaviour, timings, and interactions
  unless a task says otherwise. The codebase has many comments explaining
  browser-specific workarounds, especially for WebKit line heights and scroll
  handling. Read the comments around anything you edit and keep those
  workarounds intact.
- **Match the code style.** Tunable values are grouped as commented constants
  at the top of each file. Follow that pattern. No new dependencies without
  asking.
- **Generated assets.** If you change the modal scenes or the ASCII render
  path, refresh the posters with
  `npm run modal-posters -- http://127.0.0.1:5173/portfolio/` as the README
  describes.
- **Git.** Work on a new branch. Do not commit or push unless Tobias asks.
- **Notes.** Do not add planning or scratch documents to the repo. One-off
  notes go in `~/tmp/`.

## Already decided

Read the "Status" section of `FINDINGS.md` first. In short:

- **Already built, on branch `fable/planet-motion`:** the Kepler-orbit planet
  motion with rare moon systems and distance haze, a smooth star twinkle in
  all three modes, and the halo bounds optimisation. Two rules came out of
  Tobias's review of it: a planet must never disappear while on screen, and
  star brightness must never step between frames. Build on that branch. Their tuning lives
  in `src/scene/starfield/starfield.constants.ts`: one shared definition
  (`population`, `orbitShape`, `depthShading`, `satellites`, `twinkle`) plus
  `VOLUMETRIC_REFRAMES`, the only values ASCII may change from DEEP. A test
  enforces that, so add a mode difference there deliberately or not at all.
  The rest is in `starfield2d.constants.ts` and `UI_HALO.boundsPaddingPx`.
- **Declined, do not do these:** resizing the section titles (A1), changing
  the ASCII menu to clear the render rail (A2), keeping planets away from the
  title (A3), changing the About portrait or its copy (A4), reordering the
  résumé buttons on phones, and all four "taste calls" (gutter colours,
  first-letter accents, the literal `\n`, per-section figlet fonts).

## Phase 1: fixes to make without asking

Each of these has one reasonable answer. Do them in this order, verifying each
with screenshots before moving on.

### 1. Phone type floor (A7)

Tobias has not ruled on this one; confirm with him before starting. Then
raise the small-screen sizes in the `@media (max-width: 760px)` block of
`modals.css`:

- `.modal-terminal-body` to a 12px minimum (currently
  `clamp(0.62rem, 2.25vw, 0.82rem)`).
- `.modal-contact-note-copy` to a 12px minimum.
- `.modal-contact-action-comment` to an 11px minimum, in
  `--dragon-fg-dim` instead of `--dragon-comment` at every size (B6).

Fewer columns will fit. Check that `ls` rows, the story card frames, the
`tobifetch` stacked layout, and the prompt line still wrap cleanly at 360px
and 390px wide. Trim the gutter before trimming content if space runs out.

### 2. Selection colours (B2)

Add a site-wide `::selection` rule matching the Ghostty theme: background
`#c5c9c5`, text `#181616`. Both already exist as `--dragon-fg` and
`--dragon-bg`. Keep the existing override for the PDF text layer, where the
glyphs are transparent.

### 3. Link preview metadata (B4)

In `index.html`, add a meta description, `theme-color` (`#070b14`), Open Graph
tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:image` with width
and height), and `twitter:card` set to `summary_large_image`.

Capture a 1200×630 image of the landing scene in 3D mode with the title
legible and nothing cropped, and save it under `public/`. `og:image` and
`og:url` must be absolute. The production origin is
`https://tobias-livadariu.online/portfolio/`; confirm that against
`deployment/` before using it. Draft the description from the résumé and flag
it for Tobias to reword.

### 4. Rename one button (B8)

In `ResumeModal.tsx`, change `[ VIEW LOCAL FALLBACK ]` to `[ OPEN PDF ]`.
Leave the number of buttons alone; whether to drop one is his call.

### 5. Remove dead CSS and stray colours (C1, C2)

- Delete rules with no references: `.modal-terminal-output`,
  `.modal-ls-output`, `.modal-terminal-line-links`, `.modal-resume-image`.
  Leave the `.modal-bat` family in place until the Phase 2 projects decision
  is made, then delete it if unused.
- `#7aa2c0` and `#98bb6c` are hard-coded in `modals.css`. Give them named
  custom properties in `index.css` beside the other Dragon tokens.

Verify each deletion by searching for the class name, including template
strings that build class names, before removing it.

### 6. A DOM equivalent for the landing menu (C3)

The landing title and nav exist only inside the WebGL canvas. Add a real
`<h1>` and a `<nav>` of four buttons to the DOM for the landing view. They
should be visually hidden but focusable, call the same `openSection` as the 3D
items, and stay out of the tab order while a modal is open.

When one of those buttons has keyboard focus, drive the matching 3D nav item's
hover state so a keyboard user sees the arrows and colour change that a mouse
user sees. `NavItem.tsx` already has that hover state. If that wiring turns
out to be invasive, stop and report what it would take.

Done when: Tab from page load reaches the four sections and the render rail in
a sensible order, Enter opens the section, and there is no change in
appearance for mouse users.

## Phase 2: decisions to bring to Tobias

Finish Phase 1 first. Then, for each item below, research briefly and present
the options in one message: what each changes, what it costs, and which you
recommend. A quick mock helps a great deal here: a screenshot of the real page
with an override injected through Playwright is usually enough. Then wait for
his answer. `FINDINGS.md` has a starting set of options for most of these, and
you may add better ones.

1. **Résumé presentation (A5).** A pure white page in a dark terminal.
   Tobias likes the contrast but is open to ideas. The leading option is a
   dark render: pdf.js accepts a `pageColors` option on `page.render()` that
   redraws the page with a chosen background and foreground, the installed
   version supports it, and `ResumePdfViewer.tsx` does not use it yet. Pair it
   with a toggle back to the paper view, and note that the `resume.svg`
   loading poster is white and would need a matching dark variant. The
   alternative is to keep the page white and frame it as a deliberate object,
   with the same hard slab shadow as the render rail.
2. **Portfolio content (A6).** Three gaps: Finta is shown only as a logo and
   never named in visible text; personal projects are a bare list of names;
   the Hack the North win does not appear. Propose a visible Finta label and a
   short story built from the résumé's Finta bullets, and a richer project
   listing that stays in the terminal vocabulary. All wording needs his
   sign-off.
3. **Sense of position (B1).** The scrollbar is hidden across a roughly
   9,000px document, and the landing view gives no hint that it scrolls or
   that arrow keys, `q`, and Escape work. One direction is a lualine-style
   statusline while a panel is open, plus a single finite scroll cue on the
   landing view. Note the existing preference, stated in
   `background-mode.css`, for no idle animations next to the WebGL loop.
4. **Focus and hover vocabulary (B3).** Focus is colour-only everywhere and
   `outline: none` is set throughout. Propose one shared treatment that reads
   as terminal, for example nvim visual-mode inversion or a cursor glyph
   before the label, and apply it to tabs, action buttons, links, the render
   trigger, and the rail tiles. Whatever is chosen needs at least a 3:1 change
   between focused and unfocused states.
5. **Reduced motion (B5).** Nothing honours `prefers-reduced-motion` today.
   Propose what "reduced" means here: likely no pointer camera shift, instant
   scrolling instead of smooth, a crossfade in place of the diamond
   transition, and a slowed or still starfield. Ask how still he wants the
   starfield.
6. **Menu showing through the documents (B7).** The 3D menu stays visible
   behind panels at 72% backdrop opacity and is cut off by panel edges on wide
   screens. Options: fade the menu out as the first panel arrives, raise the
   backdrop opacity, or leave it.
7. **Direct wipe between render modes.** A mode switch currently floods the
   screen with the flat background colour, holds, then reveals the new scene
   (`DiamondTransitionOverlay.tsx`, `BackgroundModeProvider.tsx`). The idea is
   to copy the last frame of the old scene into the overlay canvas, swap the
   scene underneath it, and cut the new scene through the frozen frame with
   the same diamond, aperture, and glyph shapes, so there is no blank screen.
   Prototype it for one mode and show him before converting the rest.
8. **Scroll-linked camera.** The starfield is static while the documents
   slide over it. Moving the camera with scroll progress would make planets
   parallax away as the first document rises. It only has an effect in 3D and
   ASCII, where the camera is perspective.
9. **Throttle the starfield behind a document.** The scene renders at full
   rate while 72% dimmed and mostly covered. Halving its frame rate or pixel
   ratio while a panel is open should not be noticeable. Measure before and
   after.

## Phase 3: structure, only if asked

These do not change how the site looks. Do them only if Tobias wants them, and
keep each as its own reviewable change.

- **One palette source (C1).** The palette lives in `index.css`,
  `modals.constants.ts` (`DRAGON_LUCY`), and `theme/colors.ts` (string and
  numeric copies). Derive the TypeScript copies from one definition, or
  generate the CSS variables from it.
- **Split `ModalLayer.tsx` (C4).** Extract scroll sync, the render-menu
  handoff state machine, and keyboard handling into hooks. Behaviour must stay
  identical; the handoff has timing workarounds that are easy to break.
- **Bundle (C5).** The main chunk is 1.31 MB, 384 KB gzipped. Measure before
  changing anything. The pdf.js stylesheet (232 KB) is a likely easy win,
  since the viewer uses only the text and annotation layers.

## Verification

Before reporting, run all of these and include the results:

```sh
npm run lint
npm run format:check
npm run build
npx playwright test --workers=1
```

The e2e suite boots a WebGL scene per test and is flaky under parallel
workers. A failure in a parallel run is not evidence of a regression; confirm
with `--workers=1`.

Then check by eye, in a production build (`npm run build && npm run preview`
on a free port), that these still work: the startup reveal, switching between
all three render modes from both the rail and the toolbar dropdown, opening
each section from the 3D menu, scrolling through the whole stack, `q` and
Escape to close, and arrow keys to move between sections.

## Report

When Phase 1 is finished, report:

- What changed, one line per item, with before and after screenshots for each
  visual change.
- Anything you did not finish or chose not to do, and why.
- Every piece of placeholder or drafted copy that needs his wording.
- The verification output, including any failing tests.
- The Phase 2 options, ready for him to choose from.
