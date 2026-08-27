# Image sources

These PNGs are the lossless authoring sources for the static images served by
the site. Production uses lossless WebP copies under `public/` so Vite only
ships the smaller browser-facing format.

Regenerate an edited image with:

```sh
cwebp -lossless -z 9 -metadata none source.png -o public-image.webp
```
