# Planet atlas sources

The PNG files in this directory are the lossless authoring sources for the
planet sprite atlases. Production serves lossless WebP copies from
`public/rotating-planet-spritesheets/`; keeping the PNGs outside `public/`
prevents Vite from copying both formats into the deployment.

When an atlas changes, regenerate its WebP with:

```sh
cwebp -lossless -z 9 -metadata none source.png -o public-atlas.webp
```
