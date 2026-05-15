# UI Halo Rework Handoff Plan

Status date: May 14, 2026

This document is a handoff plan for the next agent working on the portfolio v3 3D UI readability halo. It summarizes the project context, the current implementation, the bug we are solving, the recommended implementation strategy, verification sources, and concrete acceptance criteria.

The agent should still inspect the current code before editing. This file is intended to be complete enough to start from, but local code is the source of truth.

## Project Summary

This repository is `portfolio-v3`, a Vite + React + TypeScript portfolio using React Three Fiber, Drei, and Three.js.

The larger direction is documented in [MASTER_PLAN.md](./MASTER_PLAN.md). The relevant goals from the master plan are:

- Preserve the soul of the earlier `portfolio-v2`: compact top-left Tobias identity, blocky menu, dotted separators, pixel arrows, and a moving space background.
- Render the new v3 experience as a real 3D scene with a perspective camera.
- Keep the top-left UI readable while planets and stars move behind it.
- Prefer centralized constants, clear explanations, and small incremental changes.
- Keep the first screen as the actual portfolio experience, not a landing page.

The main scene is currently assembled in `src/scene/PortfolioCanvas.tsx`:

- `<Canvas>` uses `dpr={CANVAS_DPR}`, `flat`, `frameloop="always"`, and the configured perspective camera.
- `<color attach="background" args={[COLOR_PALETTE_STR.background]} />` sets the intended background to `#070B14`.
- The scene contains pointer camera shift, lighting, the starfield, the 3D main menu, and the UI halo pass.

The major scene areas are:

- `src/scene/ui3d/`: top-left title/menu, nav rows, blocky arrows, separators, text materials, menu animation, and `UiHaloPass`.
- `src/scene/starfield/`: stars and sprite planets.
- `src/scene/camera/`: cursor-driven camera movement.
- `src/theme/colors.ts`: shared string and numeric palette values.

## Current UI Halo State

The current postprocess halo implementation lives in:

- `src/scene/ui3d/UiHaloPass.tsx`
- `src/scene/ui3d/main-menu.constants.ts`

`MainMenu.tsx` names the root group with `UI_HALO.rootName`, currently `"ui-halo-root"`. `UiHaloPass` finds that root each frame and builds a mask from the root descendants.

The current `UI_HALO` constants include:

- `rootName`: scene object name used to find the UI group.
- `skipUserDataKey`: userData flag used to exclude invisible hitboxes from the halo mask.
- `color`: dark halo color, currently `COLOR_PALETTE_STR.emberShadow`.
- `backgroundColor`, `sceneClearColor`: intended scene background color, currently `COLOR_PALETTE_STR.background`.
- `radiusPx`: screen-space mask expansion radius.
- `opacity`: halo opacity.
- `resolutionScale`: mask render target scale.
- `multisampleCount`: mask target MSAA sample count.
- `maxSampleRadiusPx`: compile-time shader loop cap for dilation samples.
- `expandedMaskStart`, `expandedMaskEnd`: smoothstep thresholds for turning sampled mask values into halo coverage.
- `solidMaskStart`, `solidMaskEnd`: current attempt to subtract the filled UI from the expanded halo.
- `outputAlpha`: final shader output alpha.
- `maskColor`, `maskClearColor`, `maskClearAlpha`: colors used when rendering the offscreen UI mask.

The current shader works by:

1. Rendering the whole scene to a composer buffer.
2. Rendering the UI to a mask target with white mask material.
3. Expanding the mask in screen space by sampling nearby mask pixels.
4. Subtracting the "solid" center UI mask with `solidMaskStart` / `solidMaskEnd`.
5. Mixing the halo color into the scene color.
6. Sending the result through `OutputPass`.

This mostly works, but it produces visible jitter/scratchiness near glyph edges, especially where the glyph meets the halo and where bright planets sit directly behind text.

## Previous Attempts And Lessons

### Black Background Bug

The background previously looked pitch black even though it should be `#070B14`. Three independent auditors investigated this earlier.

Root cause: R3F defaults to ACES filmic tone mapping. When postprocessing owned the final frame, the dark blue background was being tone-mapped and looked almost black. The current `PortfolioCanvas.tsx` uses the R3F `flat` prop, which maps to `THREE.NoToneMapping` and is the correct fix for this palette-driven scene.

Important: do not remove `flat` from `<Canvas>`.

Also keep `OutputPass` at the end of the composer chain. `OutputPass` performs final output color-space conversion and optional tone mapping in Three's postprocessing pipeline. With `flat`, tone mapping is disabled, but `OutputPass` is still the normal final pass.

### Duplicate Geometry Shadow Attempt

A geometry-based "shadow menu" was attempted: render duplicate UI geometry behind the real menu, slightly larger/darker, with the same animation. This was rejected.

Reason: in perspective, small position/scale differences become visible as a second offset menu. It was too hard to tune across text, arrows, separators, rotation, camera movement, hover state, and mobile scale. Do not reintroduce this approach.

The desired path is still a screen-space halo/matte effect, but implemented with a cleaner render order so it does not fight the glyph edge.

## Bug We Are Solving

The current halo looks scratchy/jittery around Text3D edges and separator edges.

Most likely reason:

- The current shader expands the UI mask and then subtracts the filled UI mask using thresholded mask values.
- That means the boundary where real text meets halo is controlled by small changes in antialiasing, depth, camera rotation, and MSAA resolve.
- As the menu rotates/animates, different pixels cross `solidMaskStart` / `solidMaskEnd`, so the inner halo edge crawls across the glyph boundary.

The user wants the halo to behave like a dark screen-space readability matte behind the UI, not like a separate 3D object and not like an edge outline sitting on top of the glyphs.

## Current Strong Candidate Solution

This is the strongest known solution based on the current code, previous screenshots, and the research pass so far. It is not meant to forbid a better implementation if the next agent finds one after reading the code and checking current Three/R3F guidance. If a different approach is chosen, the agent should briefly document why it has a better chance of fixing the glyph-edge jitter without reintroducing the duplicate-geometry alignment problem.

Keep `UiHaloPass`, but change the composition order:

1. Render the background scene without the UI root into the composer read buffer.
2. Render a UI-only white mask into the mask render target.
3. Dilate/expand that mask in the composite shader.
4. Composite the dark halo over the background.
5. Render the real UI root on top of the haloed background using the original materials.
6. Run optional SMAA.
7. Run `OutputPass`.

This avoids the current fragile "subtract the solid glyph from the halo" boundary. The halo is allowed to exist underneath the glyph; the real UI is rendered after the halo and naturally covers it. The glyph/halo boundary is then the real Text3D render edge, not a postprocess threshold seam.

This matches Tobias' "black UI superimposed with the current UI leaking through" intuition, but implemented as postprocess layering rather than duplicate scene geometry: first draw the dark readability matte, then draw the actual orange/ash 3D UI over it.

Conceptually:

```text
Current:
  full scene with UI -> mask -> expanded mask minus solid mask -> final

Strong candidate:
  background without UI -> mask -> expanded mask -> draw halo -> draw real UI on top -> final
```

This should remove most of the inner-edge jitter while keeping the successful screen-space halo behavior.

## Why This Is A Strong Current Path

This plan was checked against current docs:

- R3F `Canvas` docs say `flat` uses `THREE.NoToneMapping` instead of ACES filmic tone mapping, and R3F otherwise defaults to ACES plus sRGB output. Source: https://r3f.docs.pmnd.rs/api/canvas
- Three's postprocessing docs describe `EffectComposer` as an ordered chain of passes over read/write render targets, with `needsSwap`, `clear`, and `renderToScreen` controlling buffer flow. Source: https://threejs.org/manual/en/post-processing.html
- Three `EffectComposer` docs show the intended chain shape and `OutputPass` as the normal final pass. Source: https://threejs.org/docs/pages/EffectComposer.html
- Three `SMAAPass` docs say it must run before `OutputPass`. Source: https://threejs.org/docs/pages/SMAAPass.html
- Three `Object3D` docs confirm layers can control visibility by camera, but this plan can avoid a broad layer migration by temporarily hiding renderable objects during individual passes. Source: https://threejs.org/docs/pages/Object3D.html
- Three `Material.toneMapped` docs note tone mapping behavior is different when rendering to targets/postprocessing, another reason to keep `Canvas flat` and `OutputPass` rather than relying on per-material flags. Source: https://threejs.org/docs/pages/Material.html
- Postprocessing chains can lose the browser/canvas default antialiasing path because the scene is rendered through intermediate buffers. If outer halo edges still crawl after fixing render order, investigate `SMAAPass`, `FXAA`, or multisampled render targets, but keep `SMAAPass` before `OutputPass`.

The next agent should still use web search before implementation to verify no better modern Three/R3F pattern exists for this specific pass structure. Prioritize official Three.js, R3F, and Drei docs. If using community examples, treat them as implementation hints, not authority.

## Implementation Plan

### 1. Inspect Current State

Before editing:

```bash
git status --short
rg "MENU_SHADOW|UiHaloPass|UI_HALO|solidMask" src
sed -n '1,260p' src/scene/ui3d/UiHaloPass.tsx
sed -n '1,180p' src/scene/PortfolioCanvas.tsx
sed -n '1,160p' src/scene/ui3d/main-menu.constants.ts
```

If a duplicate-geometry shadow implementation is present, stop and ask Tobias whether to revert/stash it first. Do not silently remove unrelated user edits.

If the current state matches this handoff, continue.

### 2. Keep These Invariants

Do not break these:

- `PortfolioCanvas.tsx` should keep `<Canvas flat ...>`.
- `PortfolioCanvas.tsx` should keep the scene background at `COLOR_PALETTE_STR.background`.
- `UiHaloPass` should stay in `src/scene/ui3d/`, not in a separate `effects` directory.
- `MainMenu` should keep `name={UI_HALO.rootName}` on the root group.
- Invisible nav hitboxes should keep `userData={{ [UI_HALO.skipUserDataKey]: true }}` so they do not create halo blocks.
- Horizontal dotted line cubes should be included in the halo.
- The halo color should remain centrally configurable in `UI_HALO`.

### 3. Change The Background Render Pass

Current `UiSceneRenderPass` renders the full scene into `readBuffer`, including the UI. Change it so the UI root is hidden while the background is rendered.

Preferred minimal approach:

- Inside `UiSceneRenderPass.render`, find `this.renderScene.getObjectByName(UI_HALO.rootName)`.
- Store the root's previous `visible` value.
- Set `root.visible = false` only for the background render.
- Restore it in `finally`.

This avoids rendering orange UI into the background buffer before the halo is applied.

Avoid hiding all UI child meshes individually here; hiding the root group is enough for the background pass and is less fragile.

### 4. Keep The UI Mask Pass But Stop Subtracting The Solid UI

The mask pass can stay close to the current implementation:

- Collect mask targets under the UI root.
- Ignore `skipUserDataKey` objects.
- Replace target materials with a white `MeshBasicMaterial`.
- Hide non-target renderables while rendering the mask.
- Restore all materials and visibility in `finally`.

The shader should change:

- Remove `solidMaskStart` and `solidMaskEnd` from the shader.
- Remove `solidUi`.
- Compute halo from the expanded mask only.

Sketch:

```glsl
float expandedMask = smoothstep(
  expandedMaskStart,
  expandedMaskEnd,
  max(neighbor, center)
);

float halo = expandedMask * opacity;
gl_FragColor = vec4(mix(sceneColor.rgb, haloColor, halo), outputAlpha);
```

It is acceptable for the halo to exist underneath the actual UI. The real UI will be rendered afterward and will cover it.

### 5. Render The Real UI On Top In The Same Composite Pass

After `this.quad.render(renderer)` composites the haloed background into `writeBuffer`, render the real UI root into that same target.

Recommended mechanics inside `UiHaloCompositePass.render`:

1. Render mask target as current code does.
2. Set `haloMaterial.uniforms.inputTexture.value = readBuffer.texture`.
3. Set render target to `writeBuffer` or screen.
4. Render the fullscreen quad to write the haloed background.
5. Clear depth only, not color, before drawing the UI:

```ts
renderer.clearDepth();
```

6. Temporarily hide every renderable object that is not one of the selected UI mask targets.
7. Render the scene with the original camera/materials.
8. Restore visibility/materials in `finally`.

This makes the UI draw on top of any planets/stars/halo already in the color buffer. Clearing depth matters because the background pass may have written depth values that would otherwise reject UI fragments.

The selected mask targets are individual renderable descendants. That is fine: non-renderable parent groups remain visible and preserve transforms, while only renderable non-UI objects are hidden during overlay rendering.

Implementation helper suggestion:

```ts
function applyVisibilitySceneState(
  scene: Object3D,
  visibleTargets: Set<Object3D>,
  snapshots: RenderableSnapshot[],
) {
  snapshots.length = 0;

  scene.traverse((object) => {
    if (!isRenderableObject(object)) return;

    snapshots.push({
      material: object.material,
      object,
      visible: object.visible,
    });

    object.visible = visibleTargets.has(object);
  });
}
```

Then reuse `restoreSceneState`.

Do not replace materials during overlay rendering. Only hide/show renderable objects.

### 6. Add SMAA As An Optional Outer-Edge Smoother

The old inner-edge jitter should be solved primarily by render order. If outer halo edges still shimmer, add `SMAAPass` before `OutputPass`.

Use the import style already used in this repo:

```ts
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
```

Then:

```ts
const smaaPass = new SMAAPass();

composer.addPass(new UiSceneRenderPass(scene, camera));
composer.addPass(haloPass);

if (UI_HALO.smaaEnabled) {
  composer.addPass(smaaPass);
}

composer.addPass(outputPass);
```

Dispose it on cleanup if created.

Add `smaaEnabled` to `UI_HALO` with a comment:

- `true`: smooths postprocess halo/UI composite edges before final output.
- `false`: useful for comparing raw halo behavior and diagnosing blur/perf.

The Three docs explicitly say `SMAAPass` must run before `OutputPass`.

### 7. Update Constants And Comments

Update `UI_HALO` comments in `main-menu.constants.ts`.

Recommended constants after the rework:

```ts
export const UI_HALO = {
  rootName: "ui-halo-root",
  skipUserDataKey: "skipUiHalo",
  color: COLOR_PALETTE_STR.emberShadow,
  backgroundColor: COLOR_PALETTE_STR.background,
  radiusPx: 4,
  opacity: 1,
  sceneClearColor: COLOR_PALETTE_STR.background,
  sceneClearAlpha: 1,
  resolutionScale: 1,
  multisampleCount: 4,
  maxSampleRadiusPx: 8,
  expandedMaskStart: 0.01,
  expandedMaskEnd: 0.24,
  outputAlpha: 1,
  maskColor: COLOR_PALETTE_STR.white,
  maskClearColor: COLOR_PALETTE_STR.black,
  maskClearAlpha: 0,
  smaaEnabled: true,
} as const;
```

Remove `solidMaskStart` and `solidMaskEnd` unless the agent finds a concrete reason to keep them as deprecated constants. If they are kept temporarily, mark them as legacy and ensure they are not used.

Comment meaning:

- `radiusPx`: halo thickness in screen pixels. Larger means a bigger readability buffer.
- `opacity`: how strongly `color` replaces the background under the expanded mask.
- `resolutionScale`: lower than 1 makes the mask cheaper but softer/blockier; higher than 1 is sharper but more expensive.
- `multisampleCount`: MSAA samples for the mask render target. Higher may reduce mask edge stair-stepping at GPU cost.
- `maxSampleRadiusPx`: shader compile-time maximum loop radius. Must be at least `radiusPx * resolutionScale`.
- `expandedMaskStart` / `expandedMaskEnd`: softness of the expanded edge. Lower/narrower values make the halo harder; wider values make it smoother.
- `smaaEnabled`: enables an anti-aliasing pass over the composite before output.

### 8. Object Selection Options: Layers Or Traversal

Layer-based rendering is the cleaner long-term architecture if it can be added without churn:

- UI objects on layer 1.
- Starfield/background on layer 0.
- Background pass renders layer 0.
- Mask/UI overlay passes render layer 1.
- Restore camera layers after each pass.

Three's docs confirm objects render only when their layers overlap the camera.

However, R3F scene inheritance and the current component tree may make a layer migration more invasive than this bugfix deserves. The current code already uses explicit root traversal and temporary material/visibility mutation for the mask pass. That traversal approach is acceptable if the agent keeps it contained, restores state in `finally`, and avoids mutating unrelated user-visible state.

Do not treat layers as mandatory. Treat them as the cleaner option if implementation is straightforward. Treat traversal as the pragmatic fallback if layers create broader risk.


### 9. Verification Steps

Run these after edits:

```bash
npm run lint
npm run build
```

Then launch the app:

```bash
npm run dev
```

Manual checks:

- Background must remain visibly `#070B14`, not pure black.
- The UI must still animate, hover, and click as before.
- Hover arrows must still appear only on hover.
- Hitboxes must not create rectangular halo blocks.
- Horizontal separators must receive the halo.
- Bright planets behind text should no longer show tiny gaps between glyph and halo.
- The halo should not jitter/scratch across glyph faces during menu rotation.
- Starfield planets should still render behind UI, with the halo improving readability.
- Mobile/responsive scale should not alter halo thickness except by screen pixels, which is desired.

Optional automated visual check:

- If Playwright is already installed, capture screenshots at desktop and mobile widths.
- If not installed, Tobias has allowed package installs, but do not add Playwright unless it materially helps this task.
- A useful pixel sanity test is sampling a background-only area to confirm it is close to `#070B14`.

### 10. Expected Diff Shape

Likely edited files:

- `src/scene/ui3d/UiHaloPass.tsx`
- `src/scene/ui3d/main-menu.constants.ts`

Possible edited files:

- `src/scene/PortfolioCanvas.tsx`, only if `flat` or pass placement is missing. Do not otherwise churn it.
- `docs/UI_HALO_REWORK_PLAN.md`, only to update this plan after implementation.

Unexpected edits that should be treated with suspicion:

- Reintroducing `MENU_SHADOW`.
- Adding a new `effects` directory.
- Changing starfield distribution.
- Changing menu layout constants.
- Removing `OutputPass`.
- Removing `Canvas flat`.
- Changing palette values without Tobias explicitly asking.

## Acceptance Criteria

The task is complete when:

- The halo is produced by screen-space mask expansion.
- The actual 3D UI is rendered after the halo composite.
- `solidMaskStart` / `solidMaskEnd` are no longer needed to fight the glyph seam.
- The background remains the portfolio background color, not black.
- Inner-edge jitter is substantially reduced or gone.
- Separator dots are included in the halo.
- Hover interactions still work.
- `npm run lint` and `npm run build` pass.
- The implementation is explained to Tobias in terms of render order: background first, halo matte second, real UI last.

## If The Recommended Fix Is Not Enough

If visible jitter remains after the render-order rework:

1. Confirm whether the jitter is on the inner glyph/halo boundary or only on the outer halo/background boundary.
2. If inner boundary still jitters, the overlay UI is not actually covering the halo. Inspect overlay render order, `renderer.clearDepth()`, selected object collection, and visibility restoration.
3. If only outer boundary jitters, tune `expandedMaskStart`, `expandedMaskEnd`, `radiusPx`, `resolutionScale`, and `smaaEnabled`.
4. If outer shimmer is still unacceptable, consider a more expensive separable blur/dilation pass instead of the current max-neighbor dilation. Keep this in `ui3d` and make every numeric value a constant.
5. If postprocessing remains problematic, ask Tobias before revisiting geometry approaches. The previous duplicate-shadow-menu approach was rejected because perspective made it look offset.

The agent can ask Tobias clarifying questions if needed, especially for visual tradeoffs like halo thickness, color, or softness. However, the implementation direction above should be sufficient to proceed without further product clarification.
