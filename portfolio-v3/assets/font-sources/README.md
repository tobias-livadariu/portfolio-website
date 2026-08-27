# Font sources

These files are kept outside `public/` because the current site does not load
them in the browser. Vite copies everything under `public/` into `dist/`, even
when no stylesheet or component refers to it.

The active runtime files remain under `public/fonts/`. To use one of the WOFF2
files here in CSS, move it back to the matching family directory under
`public/fonts/`, add its `@font-face` declaration to `src/fonts.css`, and add a
font variable only when a stylesheet consumes it. The TTF and OTF files are
authoring sources for future conversions; `npm run fonts:ttfconvert -- <dir>`
can generate a Three.js typeface JSON from TTF files.
