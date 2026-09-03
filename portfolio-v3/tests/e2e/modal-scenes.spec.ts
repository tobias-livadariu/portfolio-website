import { expect, test, type Page } from "@playwright/test";

async function waitForStartupReveal(page: Page) {
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 15_000 });
}

async function openModal(page: Page) {
  await page.mouse.move(900, 120);
  await page.mouse.wheel(0, 160);
  await expect(page.locator(".modal-layer")).toHaveClass(/modal-layer-open/);

  return page.locator(".modal-panel").first();
}

async function openPortfolio(page: Page) {
  await openModal(page);
  return page.locator('.modal-panel[aria-label="PORTFOLIO section"]');
}

async function scrollIntoModalViewport(locator: ReturnType<Page["locator"]>) {
  await locator.evaluate((element) => {
    const scrollRoot = element.closest(".modal-scroll-root");

    if (!(scrollRoot instanceof HTMLElement)) {
      throw new Error("Scene is not inside the modal scroll root.");
    }

    scrollRoot.scrollTop += element.getBoundingClientRect().top - 80;
    scrollRoot.dispatchEvent(new Event("scroll"));
  });
}

async function installWebGlCanvasCounter(page: Page) {
  await page.addInitScript(() => {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    const countedCanvases = new WeakSet<HTMLCanvasElement>();

    HTMLCanvasElement.prototype.getContext = function (
      contextId: string,
      ...options: unknown[]
    ) {
      const context = nativeGetContext.call(this, contextId, ...options);

      if (
        context &&
        (contextId === "webgl" || contextId === "webgl2") &&
        !countedCanvases.has(this)
      ) {
        countedCanvases.add(this);
        const root = document.documentElement;
        root.dataset.webglCanvasCount = String(
          Number(root.dataset.webglCanvasCount ?? 0) + 1,
        );
      }

      return context;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

async function installModalViewportRecorder(page: Page) {
  await page.addInitScript(() => {
    type RecordedCall = {
      args: [number, number, number, number];
      kind: "scissor" | "viewport";
    };
    const calls: RecordedCall[] = [];
    const callWindow = window as typeof window & {
      __modalWebGlBoundsCalls?: RecordedCall[];
    };

    callWindow.__modalWebGlBoundsCalls = calls;

    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const kind of ["scissor", "viewport"] as const) {
        const nativeMethod = Context.prototype[kind];

        Context.prototype[kind] = function (
          x: number,
          y: number,
          width: number,
          height: number,
        ) {
          if (
            (this.canvas as HTMLCanvasElement).closest(
              '[data-testid="modal-shared-scene-layer"]',
            )
          ) {
            calls.push({ args: [x, y, width, height], kind });
            if (calls.length > 512) {
              calls.splice(0, calls.length - 512);
            }
          }

          nativeMethod.call(this, x, y, width, height);
        };
      }
    }
  });
}

test("modal scenes use one shared WebGL context and keep posters until complete frames exist", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await installWebGlCanvasCounter(page);
  await page.setViewportSize({ height: 1140, width: 2048 });

  let releaseSceneFont!: () => void;
  let sceneFontRequested = false;
  const sceneFontReleased = new Promise<void>((resolve) => {
    releaseSceneFont = resolve;
  });

  await page.route("**/pixel-emulator.typeface.json", async (route) => {
    sceneFontRequested = true;
    await sceneFontReleased;
    await route.continue();
  });

  await page.goto("/");
  await waitForStartupReveal(page);
  /* The section canvases exist with the modal markup, but they are inert
     until the shared renderer mounts, so only the background holds a context. */
  await expect(
    page.locator('[data-testid="modal-shared-scene-layer"]'),
  ).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute(
    "data-webgl-canvas-count",
    "1",
  );

  const activePanel = await openPortfolio(page);
  const sharedCanvas = page.locator(
    '[data-testid="modal-shared-scene-layer"] canvas',
  );
  const sceneHosts = activePanel.locator(
    ".modal-incoming, .modal-story-canvas-shell",
  );
  const posters = activePanel.locator(".modal-r3f-scene-poster");

  await expect.poll(() => sceneFontRequested).toBe(true);
  await expect(sharedCanvas).toHaveCount(1);
  await expect(
    page.locator('[data-testid="modal-shared-scene-layer"] > div'),
  ).toHaveCSS("pointer-events", "none");
  /* Each section presents through its own in-flow canvas so the compositor
     scrolls the scene with the modal. They are 2D canvases fed by the one
     shared WebGL context, which is what `data-webgl-canvas-count` guards. */
  await expect(
    sceneHosts.locator("canvas.modal-shared-scene-view"),
  ).toHaveCount(3);
  await expect(posters).toHaveCount(3);
  for (const poster of await posters.all()) {
    await expect(poster).toBeVisible();
    await expect(poster).not.toHaveAttribute("data-scene-ready", "true");
  }
  await expect(page.locator("html")).toHaveAttribute(
    "data-webgl-canvas-count",
    "2",
  );
  const canvasGeometry = await sharedCanvas.evaluate((canvas) => ({
    drawingHeight: (canvas as HTMLCanvasElement).height,
    drawingWidth: (canvas as HTMLCanvasElement).width,
    rect: canvas.getBoundingClientRect().toJSON(),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
  }));
  expect(canvasGeometry.rect.left).toBe(0);
  expect(canvasGeometry.rect.top).toBe(0);
  expect(canvasGeometry.rect.width).toBe(canvasGeometry.viewportWidth);
  expect(canvasGeometry.rect.height).toBe(canvasGeometry.viewportHeight);
  expect(canvasGeometry.drawingWidth).toBeLessThanOrEqual(
    canvasGeometry.viewportWidth * 1.5,
  );
  expect(canvasGeometry.drawingHeight).toBeLessThanOrEqual(
    canvasGeometry.viewportHeight * 1.5,
  );
  const incomingBoundsBefore = await sceneHosts.first().boundingBox();

  releaseSceneFont();

  for (const host of await sceneHosts.all()) {
    await scrollIntoModalViewport(host);
    const poster = host.locator(".modal-r3f-scene-poster");
    await expect(poster).toHaveAttribute("data-scene-ready", "true", {
      timeout: 20_000,
    });
    await expect(poster).toHaveCSS("visibility", "hidden");
  }

  await expect(sharedCanvas).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute(
    "data-webgl-canvas-count",
    "2",
  );
  const incomingBoundsAfter = await sceneHosts.first().boundingBox();
  expect(incomingBoundsBefore).not.toBeNull();
  expect(incomingBoundsAfter).not.toBeNull();
  expect(
    Math.abs(
      (incomingBoundsBefore?.height ?? 0) - (incomingBoundsAfter?.height ?? 0),
    ),
  ).toBeLessThan(2);
});

test("resume SVG remains visible until the PDF page has actually rendered", async ({
  page,
}) => {
  test.setTimeout(45_000);
  let releasePdf!: () => void;
  let pdfRequested = false;
  const pdfReleased = new Promise<void>((resolve) => {
    releasePdf = resolve;
  });

  await page.route("**/resume.pdf", async (route) => {
    pdfRequested = true;
    await pdfReleased;
    await route.continue();
  });

  await page.goto("/");
  await waitForStartupReveal(page);
  await openModal(page);
  const activePanel = page.locator('.modal-panel[aria-label="RESUME section"]');
  await scrollIntoModalViewport(activePanel);

  const poster = activePanel.locator(".modal-resume-svg-poster");
  await expect(poster).toBeVisible();
  await expect
    .poll(() => poster.evaluate((image) => image.complete))
    .toBe(true);
  await expect.poll(() => pdfRequested).toBe(true);
  await expect(activePanel.locator(".modal-resume-pdf-canvas")).toHaveCount(0);

  releasePdf();
  await expect(activePanel.locator(".modal-resume-pdf-canvas")).toBeVisible({
    timeout: 20_000,
  });
  await expect(poster).toHaveAttribute("data-pdf-ready", "true");
  await expect(poster).toHaveCSS("visibility", "hidden");
});

test("neutral modal scene renders remain visually stable", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chromium owns the checked-in neutral-render visual reference.",
  );
  test.setTimeout(60_000);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/?captureModalScenePosters=1");
  await waitForStartupReveal(page);
  const activePanel = await openPortfolio(page);
  const scenes = [
    {
      name: "modal-incoming.png",
      target: activePanel.locator(".modal-incoming"),
    },
    {
      name: "modal-shopify.png",
      target: activePanel.locator(".modal-story-hero").nth(0),
    },
    {
      name: "modal-ideanotion.png",
      target: activePanel.locator(".modal-story-hero").nth(1),
    },
  ];

  for (const scene of scenes) {
    await scrollIntoModalViewport(scene.target);
    await expect(
      scene.target.locator('.modal-r3f-scene-poster[data-scene-ready="true"]'),
    ).toBeAttached({ timeout: 20_000 });
    await page.waitForTimeout(250);
    const clip = await scene.target.boundingBox();
    expect(clip).not.toBeNull();
    const screenshot = await page.screenshot({
      animations: "disabled",
      clip: clip ?? undefined,
    });
    expect(screenshot).toMatchSnapshot(scene.name, {
      maxDiffPixelRatio: 0.001,
    });
  }
});

test.describe("dense-display shared modal compositor", () => {
  test.use({
    deviceScaleFactor: 2,
    viewport: { height: 900, width: 1280 },
  });

  test("uses one DPR conversion and matches the dense visual references", async ({
    browserName,
    page,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Chromium owns the checked-in dense-render visual reference.",
    );
    test.setTimeout(60_000);
    await installModalViewportRecorder(page);
    await page.goto("/?captureModalScenePosters=1");
    await waitForStartupReveal(page);
    const activePanel = await openPortfolio(page);
    const sharedCanvas = page.locator(
      '[data-testid="modal-shared-scene-layer"] canvas',
    );
    const scenes = [
      {
        name: "modal-incoming-dpr2.png",
        target: activePanel.locator(".modal-incoming"),
      },
      {
        name: "modal-shopify-dpr2.png",
        target: activePanel.locator(".modal-story-canvas-shell").nth(0),
      },
      {
        name: "modal-ideanotion-dpr2.png",
        target: activePanel.locator(".modal-story-canvas-shell").nth(1),
      },
    ];

    for (const scene of scenes) {
      await scrollIntoModalViewport(scene.target);
      await expect(
        scene.target.locator(
          '.modal-r3f-scene-poster[data-scene-ready="true"]',
        ),
      ).toBeAttached({ timeout: 20_000 });
      await page.waitForTimeout(250);

      const compositorBounds = await page.evaluate(
        ({ canvasSelector, targetSelector, targetIndex }) => {
          const canvas =
            document.querySelector<HTMLCanvasElement>(canvasSelector);
          const target =
            document.querySelectorAll<HTMLElement>(targetSelector)[targetIndex];
          const callWindow = window as typeof window & {
            __modalWebGlBoundsCalls?: Array<{
              args: [number, number, number, number];
              kind: "scissor" | "viewport";
            }>;
          };

          if (!canvas || !target) {
            throw new Error("Could not measure the shared modal compositor.");
          }

          const canvasRect = canvas.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const renderScale = canvas.width / canvasRect.width;
          const presentCanvas = target.querySelector<HTMLCanvasElement>(
            "canvas.modal-shared-scene-view",
          );

          if (!presentCanvas) {
            throw new Error("The section is not presenting through a canvas.");
          }

          /* A section is drawn into the origin of the shared renderer and then
             copied out, so its bounds must not depend on where the section
             currently sits in the document. That independence is what keeps
             the scene glued to the modal while it scrolls. */
          const expected = [0, 0, presentCanvas.width, presentCanvas.height];
          const calls = callWindow.__modalWebGlBoundsCalls ?? [];
          const hasMatchingCall = (kind: "scissor" | "viewport") =>
            calls.some(
              (call) =>
                call.kind === kind &&
                call.args.every(
                  (value, index) => Math.abs(value - expected[index]) <= 1,
                ),
            );

          /* The section canvas carries the device pixels exactly once. It is
             allowed to be smaller than the section's full density only when
             the section does not fit inside the shared renderer. */
          const fitScale = Math.min(
            1,
            canvas.width / (targetRect.width * renderScale),
            canvas.height / (targetRect.height * renderScale),
          );

          return {
            expected,
            hasMatchingScissor: hasMatchingCall("scissor"),
            hasMatchingViewport: hasMatchingCall("viewport"),
            presentBacking: [presentCanvas.width, presentCanvas.height],
            presentExpected: [
              Math.floor(targetRect.width * fitScale * renderScale),
              Math.floor(targetRect.height * fitScale * renderScale),
            ],
            renderScale,
          };
        },
        {
          canvasSelector: '[data-testid="modal-shared-scene-layer"] canvas',
          targetIndex:
            scene.name === "modal-incoming-dpr2.png"
              ? 0
              : scene.name === "modal-shopify-dpr2.png"
                ? 0
                : 1,
          targetSelector:
            scene.name === "modal-incoming-dpr2.png"
              ? '.modal-panel[aria-label="PORTFOLIO section"] .modal-incoming'
              : '.modal-panel[aria-label="PORTFOLIO section"] .modal-story-canvas-shell',
        },
      );

      expect(compositorBounds.renderScale).toBe(1.5);
      expect(compositorBounds.hasMatchingViewport).toBe(true);
      expect(compositorBounds.hasMatchingScissor).toBe(true);
      expect(compositorBounds.presentBacking[0]).toBeCloseTo(
        compositorBounds.presentExpected[0],
        -0.5,
      );
      expect(compositorBounds.presentBacking[1]).toBeCloseTo(
        compositorBounds.presentExpected[1],
        -0.5,
      );

      const clip = await scene.target.boundingBox();
      expect(clip).not.toBeNull();
      const screenshot = await page.screenshot({
        animations: "disabled",
        clip: clip ?? undefined,
      });
      expect(screenshot).toMatchSnapshot(scene.name, {
        maxDiffPixelRatio: 0.001,
      });
    }

    await expect(sharedCanvas).toHaveCount(1);
  });
});
