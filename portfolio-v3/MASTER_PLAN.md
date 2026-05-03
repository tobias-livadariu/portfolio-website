# Portfolio V3 Master Plan

This document is the working implementation plan for the next portfolio. It preserves the soul of `portfolio-v2`: Tobias in the top-left, a compact interactive menu, dotted separators, blocky arrows, and an orbiting pixel-space background. V3 should make that scene feel physically present: 3D mesh text, a small camera head-shift, 3D separators/arrows, a lightbulb dot over the `i`, and a performant 2.5D space field.

## Current V2 Baseline

`portfolio-v2` is a Vite + React + TypeScript site using Pixi for the background. The background is driven by a large set of Pixi sprites sampled in polar coordinates around the top-left focal point. Stars are lightweight `Texture.WHITE` sprites; planets are animated spritesheets loaded progressively from `public/rotating-planet-spritesheets`.

Useful constraints from the existing site:

- Planet spritesheets currently occupy about 7.2 MB across 120 files: 60 `.json` files and 60 `.png` files.
- The current canvas rebuilds stars and planets on resize, which solves density mismatch but causes code complexity and visual/performance risk.
- The current site already uses progressive planet loading and throttled planet creation, which is the right instinct, but v3 should move more of this work to GPU-friendly buffers and deterministic data.

## Recommended Direction

Build v3 inside this repository first, as sibling folder `portfolio-v3`. Keep `portfolio-v1`, `portfolio-v2`, and `portfolio-v3` together while the new design is being explored because it makes comparison and asset reuse easy. Move v3 to a separate repository only after the architecture stabilizes or if deployment tooling becomes cleaner with an independent repo.

Recommended stack:

- Vite + React + TypeScript.
- `@react-three/fiber` as the Three.js renderer.
- `@react-three/drei` for `Text3D`, asset helpers, loaders, `Preload`, and possibly `Html`.
- Three.js custom `InstancedMesh` or `InstancedBufferGeometry` for stars, separator dots, arrows, and planet billboards.
- Zustand or a small React context for active section/menu state.
- Tailwind is optional. Use it for DOM overlays and accessibility hit targets if it remains lightweight.
- Avoid a server requirement for the portfolio. Prefer static generation and static hosting unless a future feature truly needs dynamic data.

Sources checked:

- Drei `Text3D`: https://drei.docs.pmnd.rs/abstractions/text3d
- Drei loading progress: https://drei.docs.pmnd.rs/loaders/progress-use-progress
- R3F performance scaling: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- Three `Sprite`: https://threejs.org/docs/pages/Sprite.html
- Three `InstancedMesh`: https://threejs.org/docs/pages/InstancedMesh.html
- 14 KB initial congestion window discussion: https://tugrik.net/understanding-the-14kb-rule-in-web-performance.html

## Product Shape

First viewport:

- The primary scene is the actual portfolio experience, not a landing page.
- Tobias' name remains anchored to the top-left, with 3D mesh letters.
- The dot over the `i` in `Tobias` is a small 3D lightbulb mesh.
- The menu remains compact: `About`, `Resume`, `Portfolio`, `Contact Me`.
- Hover/focus keeps the existing blocky arrows, but they become small extruded mesh arrows.
- The horizontal separators become instanced beveled/cut-corner cubes, visually between a square and a circle.

Section transitions:

- Clicking a menu item triggers the lightbulb to flicker.
- The scene drops to near-black for a short beat, then returns with the new section active.
- Use this as the replacement for the v2 bottom modal slide.
- Respect `prefers-reduced-motion`: skip flicker/blackout and perform a quick crossfade.

Content panels:

- Do not recreate large DOM modals as flat cards.
- Treat each section as a small 3D exhibit near the top-left menu, using extruded frames, pixel panels, or floating plaques.
- Use real HTML only where accessibility and text readability matter. If using Drei `Html`, keep it visually integrated with the 3D frame rather than a detached web card.
- `About`: short readable bio plus one or two small 3D props.
- `Resume`: concise experience/skills view with a direct resume PDF link.
- `Portfolio`: project list with small 2.5D thumbnails, not a huge gallery grid.
- `Contact Me`: email/social links with obvious focus states.

## Visual System

The aesthetic should be blocky, pixel-adjacent, and dimensional, not glossy sci-fi.

- Use low-poly or beveled box geometry for UI objects.
- Prefer orthographic camera for the top-left UI and background composition. It preserves the pixel/block feel and makes responsive anchoring easier.
- Use a slight perspective/parallax layer if needed, but keep the camera movement minor.
- Camera head-shift should be subtle: pointer movement maps to a small camera position/rotation offset, eased over time.
- The planet sprites remain 2D pixel assets on billboarded planes. This is intentional 2.5D, not a compromise.
- Add depth using soft shadows, rim lighting, ambient light, and a small drop-shadow plane/glow behind planet billboards.

Lighting:

- Ambient light gives all objects base readability.
- The lightbulb contributes local point light or spot/directional-like light aimed at the menu and nearby content.
- During menu transitions, animate light intensity and emissive material before the blackout.
- Do not depend on planet sprites casting shadows. Three sprites do not cast shadows, and billboard planes with transparent textures need careful handling. Fake depth with shadow/glow quads when needed.

## Space Field Architecture

Use one shared Three canvas. Avoid a separate Pixi layer.

Coordinate model:

- Define a stable world origin corresponding to the top-left focal point.
- Keep all orbital objects in polar data: `{ radius, theta0, angularSpeed, z, size, seed, assetId }`.
- On each frame, compute `theta = theta0 + time * angularSpeed`.
- For responsive layouts, update camera projection and focal origin mapping, not the entire object dataset.

Stars:

- Render stars as GPU-instanced geometry, not individual React components.
- Preferred implementation: `InstancedMesh` of small cut-corner cubes or tiny box-like meshes.
- Alternative for very high counts: `Points` with a custom square/pixel shader.
- Store initial polar attributes in typed arrays.
- Let the vertex shader or a tight imperative `useFrame` update rotate positions.
- Render all stars if the count is reasonable. Thousands of instanced stars are cheaper and simpler than per-star React visibility management.

Planets:

- Do not use GIF files directly. Use PNG/WebP/AVIF spritesheets or texture atlases.
- Use billboarded planes that face the camera.
- Group planets by atlas/material to reduce draw calls.
- For many animated planets, prefer a custom instanced billboard shader with per-instance atlas frame data rather than one mesh/material per planet.
- Keep startup planet count modest, then lazy-load additional atlases after first paint.
- Offscreen planets should be culled at the group or instance-activity level, but avoid destroying/recreating objects every resize.

Distribution:

- Avoid pure random sampling at runtime for visible objects. It will always risk clumps.
- Generate deterministic blue-noise-like polar data with seeded randomness.
- Split the orbital field into annular sectors. Each cell gets at most a small bounded number of objects, with jitter inside the cell.
- Use separate distributions for stars and planets. Planets need wider spacing and a top-left exclusion radius.
- Store seeds and object metadata so the same viewport feels consistent across reloads.

Visibility:

- Maintain an active set for planets only. Stars can usually stay fully instanced.
- Each frame or every few frames, project planet bounding spheres/rectangles against an expanded viewport.
- Expanded viewport margin must be at least the largest planet radius plus movement during one culling interval.
- Invisible planets stay in data arrays but are not assigned to visible instance slots.
- Use a stable pool of visible planet instances instead of constructing/destroying meshes.

Resize:

- Use `ResizeObserver` or R3F canvas size updates.
- Recompute camera projection and visible world bounds.
- Recompute active planet set from deterministic data.
- Do not clear and rebuild the whole field.
- Test devtools resize, monitor moves, orientation changes, and device-pixel-ratio changes.

## Planet Asset Strategy

Do not run a public planet-generation API as the default plan.

Reasons:

- A static portfolio should be fast, cacheable, and cheap to host.
- Runtime generation creates latency, cache invalidation, storage, and abuse problems.
- If many users request unique planets, generated assets can accumulate or force repeated compute.
- The startup problem is better solved by asset budgeting, atlas packing, compression, and lazy loading.

Recommended pipeline:

1. Keep a curated base set of planet spritesheets from PixelPlanets-derived generation.
2. Pre-generate assets at build time or manually commit curated assets.
3. Pack related planets into atlases to reduce request count.
4. Ship a tiny startup manifest with 5-10 hero/nearby planets.
5. Lazy-load secondary atlas groups after first paint or when a section transition gives cover.
6. Use long-lived cache headers for immutable hashed assets in production.

Possible later enhancement:

- Add an offline script that uses the JavaScript PixelPlanets port to generate new curated assets before deployment.
- A serverless generation endpoint is acceptable only if outputs are cached by deterministic seed, bounded by rate limits, and not required for first paint.

## Performance Targets

Initial load:

- First meaningful visual should not wait for every planet atlas.
- Critical HTML/CSS should be very small. The "14 KB rule" is a practical first-network-round-trip guideline from TCP slow start, not a hard limit or a maximum packet size.
- Keep the initial JS chunk as lean as possible; lazy-load heavy section content and nonessential atlas groups.
- Font files should be limited and preloaded only if they are critical.

Runtime:

- Target 60 FPS on desktop and acceptable motion on mid-range mobile.
- Cap device pixel ratio, for example `Math.min(window.devicePixelRatio, 1.5)` or `2` after profiling.
- Use instancing for repeated geometry.
- Avoid creating thousands of React components for stars/planets.
- Avoid per-frame allocations in `useFrame`.
- Use object pools and typed arrays for background entities.
- Pause or reduce animation when the tab is hidden.
- Provide a reduced-motion mode with lower angular speed and no flicker.

Rendering loop:

- Because the background is continuously orbiting, `frameloop="always"` is acceptable.
- If a future mode pauses orbital motion, switch to `frameloop="demand"` and call `invalidate` on pointer/camera/transition changes.
- Avoid React state updates inside the frame loop. Keep mutable scene data in refs, stores, or buffer attributes.

## Proposed Project Structure

```text
portfolio-v3/
  docs/
    MASTER_PLAN.md
    IMPLEMENTATION_NOTES.md
  public/
    assets/
      fonts/
      planets/
      resume.pdf
  scripts/
    generate-planets/
    pack-atlases/
  src/
    app/
      App.tsx
      routes-or-sections.ts
    scene/
      PortfolioCanvas.tsx
      camera/
      lighting/
      ui3d/
      starfield/
      planets/
      transitions/
    content/
      about.ts
      projects.ts
      resume.ts
      contact.ts
    components/
      accessibility/
      fallback/
    lib/
      math/
      seededRandom.ts
      viewport.ts
    styles/
```

`MASTER_PLAN.md` can live at the folder root for now. If implementation begins, move or copy it to `docs/MASTER_PLAN.md` and keep it updated.

## Implementation Phases

Phase 1: technical prototype

- Scaffold Vite + React + TypeScript + R3F + Drei.
- Create the single canvas, orthographic camera, ambient light, and lightbulb light.
- Render top-left 3D text with `Text3D`.
- Add pointer-driven camera head-shift.
- Add basic 3D menu hit targets and hover arrows.

Phase 2: transition language

- Implement menu state store.
- Add lightbulb flicker, blackout, and section activation.
- Add reduced-motion fallback.
- Build one 3D content panel style and validate readability.

Phase 3: starfield

- Implement deterministic polar dataset.
- Render instanced blocky stars.
- Rotate via time-based math.
- Validate responsive behavior without rebuilding all geometry.

Phase 4: planets

- Convert existing spritesheets into a manifest-driven asset system.
- Prototype billboarded planes with a small startup atlas.
- Add lazy-loaded secondary atlas groups.
- Add active instance pool and viewport culling.

Phase 5: content and polish

- Port About, Resume, Portfolio, and Contact content.
- Tune mobile layout.
- Add accessibility overlays or keyboard raycast support.
- Profile with production build.
- Verify screenshots at desktop, tablet, and mobile sizes.

## Agent Instructions

Future agents should follow these rules:

- Preserve the top-left focal identity and orbiting-space concept.
- Use React for app structure, but do not represent each star or planet as a React component.
- Keep frame-loop work imperative, allocation-free, and isolated to scene systems.
- Prefer deterministic seeded generation over runtime randomness.
- Do not add a backend unless the plan is explicitly revised.
- Before adding dependencies, justify why Three/R3F/Drei cannot solve the need.
- Test resize behavior early; do not leave it until final polish.
- Keep visual UI accessible: keyboard focus, readable text alternatives, and reduced-motion behavior are part of the feature.
- Avoid unrelated refactors of v1/v2.

## Open Design Questions

- Should the content panels be mostly 3D mesh text, or 3D frames containing HTML text for readability?
- Should the site support scrolling through sections, or keep the compact menu as the only section navigation?
- Should the planets remain mostly decorative, or should some become interactive project/contact affordances?
- How much mobile support is required for the full 3D treatment versus a simplified 2.5D version?
- Is the desired planet count closer to "dense cosmic wallpaper" or "sparse gallery of beautiful objects"?

Current recommendation: keep navigation menu-driven, use 3D frames with readable HTML text for content, keep planets decorative in the first version, and build interactive planets only after performance is proven.
