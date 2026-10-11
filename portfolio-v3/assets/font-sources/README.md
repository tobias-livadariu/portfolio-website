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

The full Iosevka runtime sources are in `iosevka-term/`. The production WOFF2
files are subsets covering the ranges declared in `src/fonts.css`; this keeps
the current terminal UI metrically compatible without sending unused scripts
and symbols. They also keep only the OpenType features browsers apply by
default. Iosevka's character variants and stylistic sets (`cv*`, `ss*`) more
than triple the file size, and no stylesheet enables them; if one ever sets
`font-feature-settings` or `font-variant-*` on this font, add those features to
the list. Regenerate both weights with FontTools when new glyphs are
introduced:

```sh
for weight in Regular Bold; do
  uvx --from 'fonttools[woff]' pyftsubset "assets/font-sources/iosevka-term/IosevkaTerm-$weight.full.woff2" --output-file="public/fonts/iosevka-term/WOFF2/IosevkaTerm-$weight.woff2" --flavor=woff2 --unicodes='U+0020-007E,U+00A0-00FF,U+2000-206F,U+2190-22FF,U+2500-257F' --layout-features='ccmp,locl,mark,mkmk,calt,liga,clig,rlig,kern,rvrn' --recommended-glyphs
done
```
