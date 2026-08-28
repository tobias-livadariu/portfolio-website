# Oversized planet atlas compatibility

> **Status (August 28, 2026): deferred technical debt.** The portfolio is
> working across Chromium, WebKit, and Firefox. This note records a remaining
> GPU compatibility and performance risk that should be addressed separately
> so the current rendering does not change immediately before deployment.

## Work completed

The August 28 browser-hardening pass made portfolio motion unconditional and
removed the story-scene motion toggle, OS reduced-motion branches, and the
reduced-motion background-transition fallback. Visible scenes retain their
established animation; canvases may still pause while completely off screen to
avoid wasting GPU time.

The same pass added:

- dynamic viewport and safe-area positioning for the renderer control on
  mobile Safari, with legacy viewport-unit fallbacks;
- renderer-menu stacking and focus handling that behaves consistently in
  Chromium, WebKit, and Firefox;
- fallbacks for clients without `IntersectionObserver` or `ResizeObserver`;
- an `overflow: hidden` fallback for clients without `overflow: clip`; and
- permanent Playwright coverage for Chromium, WebKit, Firefox, compact mobile
  viewports, full motion under an OS reduced-motion preference, render-mode
  switching, modal navigation, and continuous modal opening.

Formatting, linting, the production build, and the relevant browser tests all
passed after these changes.

## Remaining risk

Some planet sprite atlases are `10000 × 200` or `15000 × 300` pixels. During
browser testing, Three.js reported that these textures exceeded the available
GPU texture dimension and resized them to an `8192`-pixel maximum. This is a
common hardware/WebGL limit and can differ by GPU, driver, browser, and device.

The current rendering remains functional because the sprite UV coordinates are
normalized, but relying on runtime resizing has several risks:

- The browser must decode the full source image and then allocate and resample
  it before uploading it to the GPU. This can increase startup CPU work, memory
  pressure, and time to the first complete starfield.
- Low-memory mobile devices may stutter, lose a WebGL context, or fail an atlas
  upload under pressure.
- Automatic resizing can soften sprite frames and can produce slightly
  different results across GPU/browser combinations.
- The full source payload is still downloaded even when the GPU ultimately
  receives a smaller texture.
- A client with a lower texture limit than the tested browsers could require a
  more aggressive resize or fail to render that atlas.

This is not currently a release blocker: tested clients rendered the starfield,
all render modes remained usable, and no atlas-related test failed. It is still
worth fixing before adding larger atlases or more planet variants.

## Recommended remediation

Fix this in the asset-generation pipeline rather than adding another runtime
resize step. Two reasonable approaches are:

1. Split every oversized horizontal atlas into multiple textures whose width
   remains safely below the chosen compatibility ceiling. Store frame-to-atlas
   metadata so animation can cross texture boundaries without changing timing.
2. Generate device tiers, such as a full-quality atlas capped at `8192` pixels
   and a smaller mobile atlas. Select a tier from the renderer's reported
   `MAX_TEXTURE_SIZE` before loading the atlas payload.

Atlas splitting is the safer default because it preserves the existing frame
resolution on capable devices. A tiered version can be added later if network
or memory measurements justify it.

Do not simply lower the atlas dimensions in place without visual comparison.
The planet sprites are a prominent part of the site, and an unnoticed change to
frame dimensions, UV boundaries, filtering, or playback order could introduce
blur, seams, flicker, or altered animation speed.

## Acceptance criteria for a future fix

- No generated texture exceeds the selected compatibility ceiling.
- The browser console no longer reports Three.js texture resizing.
- Planet scale, color, frame order, frame rate distribution, and motion match
  the current site in 2D, 3D, and ASCII modes.
- Atlases continue to load through the bounded, diversity-first queue.
- Mode transitions do not trigger duplicate downloads or visible stalls.
- Peak decoded-image memory and time to the first populated starfield are no
  worse than the current build and preferably improve.
- Chromium, WebKit, and Firefox tests pass at desktop and compact mobile sizes.
- A visual comparison is performed on at least one device whose
  `MAX_TEXTURE_SIZE` is `8192` or lower.

The current source and asset-generation scripts remain authoritative. Measure
the actual atlas inventory and GPU limits again before implementing this plan.
