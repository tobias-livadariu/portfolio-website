# portfolio-v3

This directory contains `portfolio-v3`, the current React and Three.js version
of Tobias Livadariu's portfolio. It is separate from `../portfolio-v2`; the
commands and paths below apply to v3 only.

The landing view is a space scene with a top-left menu. Its render switch moves
between 3D, 2D, and ASCII versions of the background. Opening a menu item, or
scrolling past the landing view, reveals a terminal-styled document containing
the About, Resume, Portfolio, and Contact Me sections.

## Run it locally

```sh
npm ci
npm run dev
```

Vite serves the site with `/portfolio/` as its base path. The other useful
commands are:

```sh
npm run build         # type-check and create dist/
npm run preview       # serve the production build locally
npm run lint
npm run format:check
npm run test:e2e      # Playwright tests
```

## Project map

- `src/background/` owns render-mode state, the mode switch, and the diamond
  transition between modes.
- `src/scene/` contains the React Three Fiber canvas, cameras, lighting,
  post-processing, the 3D menu, and both starfield implementations.
- `src/modals/` contains the modal state and document layer. Its section
  folders hold the copy and layouts; `components/` holds the terminal, static
  image-to-ASCII renderer, and holographic portfolio scenes shared by them.
- `src/theme/` is the small shared palette and runtime Three.js font registry.
- `src/utility/` holds path and ASCII glyph-size helpers used across renderers.
- `public/` contains files needed by the browser at runtime: planet atlases,
  images, resume files, and active fonts.
- `assets/` contains authoring copies of fonts and lossless source images.
  They are intentionally outside `public/`, so Vite does not copy source and
  delivery formats into `dist/` together.
- `tests/e2e/` covers mode switching, modal navigation, scrolling, and the
  responsive cases that have caused regressions.
- `deployment/` contains the Nginx and systemd files used by the deployed site.
- `docs/` contains completed design plans kept for implementation history.

## Common edit points

| Change                                                 | Start here                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| 3D or ASCII star and planet density, depth, and motion | `src/scene/starfield/starfield.constants.ts`                |
| 2D star and planet behavior                            | `src/scene/starfield2d/starfield2d.constants.ts`            |
| Landing menu scale, position, and materials            | `src/scene/ui3d/main-menu.constants.ts`                     |
| Full-scene ASCII cell sizing                           | `src/scene/postprocessing/AsciiPass.ts`                     |
| Portfolio-modal ASCII cell sizing                      | `src/scene/hooks/usePortfolioAsciiGlyphSize.ts`             |
| Static planet and portrait ASCII conversion            | `src/modals/components/ascii-image-profiles.ts`             |
| Modal text and section-specific settings               | `src/modals/about/`, `resume/`, `portfolio/`, or `contact/` |
| Terminal and modal styling                             | `src/modals/modals.css`                                     |

The tunable values are generally grouped near the top of their constants or
component file. Before adding a new control, check whether that render mode
already has a separate 2D, 3D, or ASCII profile; those profiles are kept apart
where matching one mode would make another look worse.
