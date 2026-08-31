import { expect, test, type Page } from "@playwright/test";
import {
  ASCII_GRAPH_TRANSITION,
  buildAsciiTransitionField,
  getAsciiTransitionGlyphPlacements,
} from "../../src/background/ascii-graph-transition";
import { BACKGROUND_TRANSITION } from "../../src/background/background-mode-core";
import {
  getTwoDimensionalVisibleHeight,
  getTwoDimensionalWorldPerPixel,
} from "../../src/scene/canvas.constants";
import { VOLUMETRIC_STARFIELD_TUNING } from "../../src/scene/starfield/starfield.constants";
import { getCinematicOrbitalAngularSpeed } from "../../src/scene/starfield/starfield.math";
import {
  PLANETS_2D,
  STARS_2D,
} from "../../src/scene/starfield2d/starfield2d.constants";
import { COLOR_PALETTE_STR } from "../../src/theme/colors";

type RenderMode = "2d" | "3d" | "ascii";

async function waitForStartupReveal(page: Page) {
  await expect(
    page.locator('.bg-transition-overlay[data-startup="true"]'),
  ).toHaveCount(0, { timeout: 15_000 });
}

/** The starfield rail shows every mode at once, so there is nothing to open. */
async function chooseMode(page: Page, mode: RenderMode) {
  const tile = page.locator(`.rm-tile[data-mode="${mode}"]`);

  await expect(tile).toBeVisible();
  await tile.click();
}

/** Same choice made from a modal's sticky toolbar instead. */
async function chooseModeFromModal(page: Page, mode: RenderMode) {
  const trigger = page.locator(".modal-render-trigger").first();

  await trigger.click();
  const panel = page.locator('.modal-render-panel[data-open="true"]');
  const option = panel.locator(`.modal-render-option[data-mode="${mode}"]`);

  await expect(panel.locator(".modal-render-option")).toHaveCount(3);
  await expect(
    panel.locator(
      ".modal-render-option-index, .modal-render-option-copy, .modal-render-option-marker",
    ),
  ).toHaveCount(0);
  await expect(option.locator(":scope > .rm-art")).toHaveCount(1);
  await expect(option.locator(":scope > .rm-tile-name")).toHaveCount(1);
  await expect(option.locator(":scope > .rm-tile-underline")).toHaveCount(1);
  await expect(option).toBeVisible();
  await option.click();
}

function currentModeLabel(page: Page) {
  return page.locator(".rm-rail-value");
}

function countConnectedGlyphClusters(text: string, glyph: string) {
  const remaining = new Set<string>();

  text.split("\n").forEach((row, y) => {
    Array.from(row).forEach((character, x) => {
      if (character === glyph) {
        remaining.add(`${x},${y}`);
      }
    });
  });

  let clusterCount = 0;

  while (remaining.size > 0) {
    clusterCount += 1;
    const first = remaining.values().next().value;

    if (first === undefined) {
      break;
    }

    remaining.delete(first);
    const pending = [first];

    while (pending.length > 0) {
      const point = pending.pop();

      if (point === undefined) {
        continue;
      }

      const [x, y] = point.split(",").map(Number);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighbour = `${x + offsetX},${y + offsetY}`;

          if (remaining.delete(neighbour)) {
            pending.push(neighbour);
          }
        }
      }
    }
  }

  return clusterCount;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

test("render control remains inside a compact dynamic viewport", async ({
  page,
}) => {
  const viewport = { height: 568, width: 320 };

  await page.setViewportSize(viewport);
  await page.goto("/");
  await waitForStartupReveal(page);

  const rail = page.locator(".rm-rail");
  // The startup reveal deliberately hands off to the rail's existing slide-in.
  // Firefox can remove the overlay early enough to observe that transform in
  // flight, so measure the settled control rather than an entrance frame.
  await expect
    .poll(async () => {
      const currentBounds = await rail.boundingBox();

      return (currentBounds?.x ?? 0) + (currentBounds?.width ?? 0);
    })
    .toBeLessThanOrEqual(viewport.width);

  const bounds = await rail.boundingBox();
  const overflow = await rail.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );

  expect(bounds).not.toBeNull();
  expect(overflow).toBeLessThanOrEqual(1);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(
    viewport.height,
  );
  expect(bounds?.y ?? 0).toBeGreaterThan(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(
    viewport.width,
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );

  /* The sigils must retain their authored 2:1 cell geometry even if a client
     cannot use Iosevka and resolves the stack to its wider system monospace. */
  await page.addStyleTag({
    content: ".rm-art { font-family: monospace !important; }",
  });
  await page.evaluate(() =>
    document.fonts.dispatchEvent(new Event("loadingdone")),
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );
  const fallbackArtBounds = await rail.locator(".rm-art").first().boundingBox();

  expect(fallbackArtBounds).not.toBeNull();
  expect(
    (fallbackArtBounds?.width ?? 0) / (fallbackArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);

  /* Once enabled, the metric-relative correction must survive viewport and
     orientation events without another JavaScript measurement. */
  await page.setViewportSize({
    height: viewport.width,
    width: viewport.height,
  });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-rm-normalize-cells",
    "true",
  );
  const landscapeFallbackArtBounds = await rail
    .locator(".rm-art")
    .first()
    .boundingBox();

  expect(landscapeFallbackArtBounds).not.toBeNull();
  expect(
    (landscapeFallbackArtBounds?.width ?? 0) /
      (landscapeFallbackArtBounds?.height ?? 1),
  ).toBeCloseTo(1, 1);
});

test("starfield and modal selectors share one responsive option scale", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 920 });
  await page.goto("/");
  await waitForStartupReveal(page);

  const railOption = page.locator('.rm-tile[data-mode="3d"]');
  const railOptionBounds = await railOption.boundingBox();
  const railArt = await railOption.locator(".rm-art").boundingBox();
  const scrollRoot = page.locator(".modal-scroll-root");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ top: window.innerHeight * 2.2 }),
  );

  const activePanel = page.locator('.modal-panel[data-active="true"]');
  const trigger = activePanel.locator(".modal-render-trigger");

  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.waitForTimeout(250);

  // The render control is one portal that can finish handing ownership to an
  // adjacent sticky header after the click. Follow the open portal instead of
  // retaining a dynamic `data-active` query that may now name another panel.
  const menuOwner = page.locator(
    '.modal-panel:has(.modal-render-panel[data-open="true"])',
  );
  await expect(menuOwner).toHaveCount(1);

  const modalOption = menuOwner.locator('.modal-render-option[data-mode="3d"]');
  const modalOptionBounds = await modalOption.boundingBox();
  const modalArt = await modalOption.locator(".rm-art").boundingBox();
  const fileBounds = await menuOwner.locator(".modal-file-label").boundingBox();
  const tabsBounds = await menuOwner
    .locator(".modal-section-tabs")
    .boundingBox();
  const controlsBounds = await menuOwner
    .locator(".modal-toolbar-right")
    .boundingBox();

  expect(railArt).not.toBeNull();
  expect(modalArt).not.toBeNull();
  expect(railOptionBounds).not.toBeNull();
  expect(modalOptionBounds).not.toBeNull();
  expect(Math.abs((railArt?.width ?? 0) - (modalArt?.width ?? 0))).toBeLessThan(
    0.75,
  );
  expect(
    Math.abs((railArt?.height ?? 0) - (modalArt?.height ?? 0)),
  ).toBeLessThan(0.75);
  expect(
    Math.abs((railOptionBounds?.width ?? 0) - (modalOptionBounds?.width ?? 0)),
  ).toBeLessThan(0.75);
  expect(
    Math.abs(
      (railOptionBounds?.height ?? 0) - (modalOptionBounds?.height ?? 0),
    ),
  ).toBeLessThan(0.75);
  await expect(menuOwner.locator(".modal-render-trigger-label")).toBeVisible();
  await expect(menuOwner.locator(".modal-render-trigger-value")).toBeVisible();
  expect(tabsBounds?.y ?? 0).toBeGreaterThanOrEqual(
    Math.max(fileBounds?.y ?? 0, controlsBounds?.y ?? 0) +
      Math.max(fileBounds?.height ?? 0, controlsBounds?.height ?? 0),
  );

  await page.setViewportSize({ height: 720, width: 520 });
  await expect(menuOwner.locator(".modal-render-trigger-label")).toBeVisible();
  await expect(menuOwner.locator(".modal-render-trigger-leader")).toBeHidden();
  await expect(menuOwner.locator(".modal-render-trigger-value")).toBeHidden();

  await page.setViewportSize({ height: 720, width: 400 });
  await expect(menuOwner.locator(".modal-render-trigger-label")).toBeHidden();
  await expect(menuOwner.locator(".modal-render-trigger-value")).toBeVisible();
});

test("closing the modal also closes its persistent render menu", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");
  await waitForStartupReveal(page);

  const scrollRoot = page.locator(".modal-scroll-root");
  const trigger = page.locator(".modal-render-trigger");
  const menu = page.locator(".modal-render-panel");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(page.locator(".modal-render-menu")).toHaveAttribute(
    "data-motion",
    "idle",
  );
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.locator(".modal-quit-button").first().click();
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1);

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(page.locator(".modal-render-menu")).toHaveAttribute(
    "data-motion",
    "idle",
  );
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(menu).not.toHaveAttribute("data-open");
});

test("closing suppresses render-menu handoffs until returning home", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");
  await waitForStartupReveal(page);

  const scrollRoot = page.locator(".modal-scroll-root");
  const panels = page.locator(".modal-panel");
  const aboutPanel = panels.first();
  const resumePanel = panels.nth(1);
  const motionRoot = page.locator(".modal-render-menu");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  await aboutPanel
    .locator(".modal-section-tabs")
    .getByRole("button", { name: "RESUME" })
    .click();
  await expect(resumePanel).toHaveAttribute("data-render-menu-owner", "true", {
    timeout: 10_000,
  });
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");

  await page.evaluate(() => {
    const stack = document.querySelector(".modal-scroll-stack");
    const motion = document.querySelector(".modal-render-menu");
    const root = document.documentElement;
    const readOwner = () =>
      document
        .querySelector<HTMLElement>(
          '.modal-panel[data-render-menu-owner="true"]',
        )
        ?.getAttribute("aria-label") ?? "none";

    root.dataset.renderMenuClosingOwners = readOwner();
    new MutationObserver(() => {
      const owner = readOwner();
      const owners = root.dataset.renderMenuClosingOwners?.split(",") ?? [];

      if (owners[owners.length - 1] !== owner) {
        root.dataset.renderMenuClosingOwners = [...owners, owner].join(",");
      }
    }).observe(stack!, {
      attributeFilter: ["data-render-menu-owner"],
      attributes: true,
      subtree: true,
    });

    root.dataset.renderMenuClosingMotions =
      motion?.getAttribute("data-motion") ?? "missing";
    new MutationObserver(() => {
      const nextMotion = motion?.getAttribute("data-motion") ?? "missing";
      const motions = root.dataset.renderMenuClosingMotions?.split(",") ?? [];

      if (motions[motions.length - 1] !== nextMotion) {
        root.dataset.renderMenuClosingMotions = [...motions, nextMotion].join(
          ",",
        );
      }
    }).observe(motion!, {
      attributeFilter: ["data-motion"],
      attributes: true,
    });
  });

  const quitButton = resumePanel.locator(".modal-quit-button");

  await quitButton.click();
  await expect(quitButton).not.toBeFocused();
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1);
  await expect(page.locator(".modal-render-trigger")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.dataset.renderMenuClosingOwners,
      ),
    )
    .toBe("RESUME section,none");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.dataset.renderMenuClosingMotions,
      ),
    )
    .toMatch(/idle,leaving/);

  /* Reaching home rearms ownership; the next downward journey may reveal the
     trigger normally again. */
  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(page.locator(".modal-render-trigger")).toBeVisible();
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");
});

test("reversing scroll during a reveal cannot strand the render trigger", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");
  await waitForStartupReveal(page);

  const scrollRoot = page.locator(".modal-scroll-root");
  const panels = page.locator(".modal-panel");
  const aboutPanel = panels.first();
  const resumePanel = panels.nth(1);
  const motionRoot = page.locator(".modal-render-menu");
  const trigger = page.locator(".modal-render-trigger");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");

  await resumePanel.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "start" }),
  );
  await expect(resumePanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "revealing");

  /* This reversal used to let the reveal effect cancel the newly-created
     handoff timer, leaving the persistent trigger clipped forever. */
  await aboutPanel.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "start" }),
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");
  await expect(trigger).toBeVisible();
});

test("one open render menu follows the topmost modal header", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/");
  await waitForStartupReveal(page);

  const scrollRoot = page.locator(".modal-scroll-root");
  const panels = page.locator(".modal-panel");
  const aboutPanel = panels.nth(0);
  const resumePanel = panels.nth(1);
  const trigger = page.locator(".modal-render-trigger");
  const menu = page.locator(".modal-render-panel");
  const motionRoot = page.locator(".modal-render-menu");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ top: window.innerHeight * 2.2 }),
  );

  await expect(trigger).toHaveCount(1);
  await expect(trigger).toBeVisible();
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(resumePanel.locator(".modal-render-trigger")).toHaveCount(0);
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toHaveAttribute("data-open", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");

  /* Move the next document under the open menu without completing the sticky
     header handoff. The menu must remain the topmost hit target there. */
  const resumeBounds = await resumePanel.boundingBox();
  const scrollRootBounds = await scrollRoot.boundingBox();

  expect(resumeBounds).not.toBeNull();
  expect(scrollRootBounds).not.toBeNull();

  await scrollRoot.evaluate(
    (element, offset) => element.scrollBy({ top: offset }),
    (resumeBounds?.y ?? 0) - (scrollRootBounds?.y ?? 0) - 320,
  );
  await expect(aboutPanel).toHaveAttribute("data-render-menu-owner", "true");

  const overlayState = await page.evaluate(() => {
    const owner = document.querySelector<HTMLElement>(
      '.modal-panel[data-render-menu-owner="true"]',
    );
    const followingPanel = owner?.nextElementSibling;
    const openMenu = document.querySelector<HTMLElement>(
      '.modal-render-panel[data-open="true"]',
    );

    if (!(followingPanel instanceof HTMLElement) || !openMenu || !owner) {
      return null;
    }

    const followingBounds = followingPanel.getBoundingClientRect();
    const menuBounds = openMenu.getBoundingClientRect();
    const overlapTop = Math.max(followingBounds.top, menuBounds.top);
    const overlapBottom = Math.min(followingBounds.bottom, menuBounds.bottom);
    const hitTarget = document.elementFromPoint(
      menuBounds.left + 8,
      overlapTop + Math.min(8, (overlapBottom - overlapTop) / 2),
    );

    return {
      contain: getComputedStyle(owner).contain,
      hasOverlap: overlapBottom > overlapTop,
      hitMenu: openMenu.contains(hitTarget),
      ownerZIndex: Number(getComputedStyle(owner).zIndex),
      followingZIndex: Number(getComputedStyle(followingPanel).zIndex),
    };
  });

  expect(overlayState).not.toBeNull();
  expect(overlayState?.hasOverlap).toBe(true);
  expect(overlayState?.hitMenu).toBe(true);
  expect(overlayState?.contain).toBe("layout");
  expect(overlayState?.ownerZIndex ?? 0).toBeGreaterThan(
    overlayState?.followingZIndex ?? 0,
  );

  await motionRoot.evaluate((element) => {
    element.setAttribute("data-motion-history", element.dataset.motion ?? "");
    new MutationObserver(() => {
      const history = element.getAttribute("data-motion-history") ?? "";

      element.setAttribute(
        "data-motion-history",
        `${history},${element.dataset.motion ?? ""}`,
      );
    }).observe(element, {
      attributeFilter: ["data-motion"],
      attributes: true,
    });
  });

  const motionDuringBoundaryScroll = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const scrollRootElement = document.querySelector(".modal-scroll-root");
        const resumeElement = document.querySelector(
          '.modal-panel[aria-label="RESUME section"]',
        );

        if (!scrollRootElement || !(resumeElement instanceof HTMLElement)) {
          resolve("missing");
          return;
        }

        scrollRootElement.addEventListener(
          "scroll",
          () => {
            queueMicrotask(() => {
              resolve(
                document
                  .querySelector<HTMLElement>(".modal-render-menu")
                  ?.getAttribute("data-motion") ?? "missing",
              );
            });
          },
          { once: true },
        );
        resumeElement.scrollIntoView({ block: "start" });
      }),
  );

  expect(motionDuringBoundaryScroll).toBe("leaving");

  await expect(resumePanel).toHaveAttribute("data-render-menu-owner", "true");
  await expect(aboutPanel).not.toHaveAttribute("data-render-menu-owner");
  await expect(trigger).toHaveCount(1);
  await expect(resumePanel.locator(".modal-render-trigger")).toHaveCount(1);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toHaveAttribute("data-open", "true");
  await expect(motionRoot).toHaveAttribute("data-motion", "idle");
  await expect(motionRoot).toHaveAttribute(
    "data-motion-history",
    /leaving.*entering.*revealing/,
  );
});

test("every render mode is offered without opening anything", async ({
  page,
}) => {
  await page.goto("/");
  await waitForStartupReveal(page);

  for (const mode of ["3d", "2d", "ascii"] as const) {
    await expect(page.locator(`.rm-tile[data-mode="${mode}"]`)).toBeVisible();
  }

  await expect(page.locator('.rm-tile[data-mode="3d"]')).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("vault sigils preserve their one, two, three source clusters", async ({
  page,
}) => {
  await page.goto("/");
  await waitForStartupReveal(page);

  for (const [mode, sourceCount] of [
    ["3d", 1],
    ["2d", 2],
    ["ascii", 3],
  ] as const) {
    const text = await page
      .locator(`.rm-tile[data-mode="${mode}"] .rm-art`)
      .textContent();

    /* At the high-resolution 63-by-33 field, a source occupies several cells.
       Count connected markers so increased sampling cannot invalidate the
       semantic one/two/three-source contract. */
    expect(countConnectedGlyphClusters(text ?? "", "@")).toBe(sourceCount);
  }
});

test("2D planets use the same playback distribution as volumetric modes", () => {
  expect(PLANETS_2D.frameRate).toEqual(
    VOLUMETRIC_STARFIELD_TUNING["3d"].planets.frameRate,
  );
  expect(PLANETS_2D.frameRate).toEqual(
    VOLUMETRIC_STARFIELD_TUNING.ascii.planets.frameRate,
  );
});

test("ASCII transition graph propagates from the renderer to complete faces", () => {
  const field = buildAsciiTransitionField(
    1_440,
    900,
    1_400,
    860,
    createSeededRandom(42),
  );

  expect(field.nodes.length).toBeGreaterThan(100);
  expect(field.edges.length).toBeGreaterThan(field.nodes.length);
  expect(field.faces.length).toBeGreaterThan(field.nodes.length);
  expect(field.nodes[field.seedIndex].startProgress).toBe(0);
  expect(field.nodes[field.goalIndex].startProgress).toBeCloseTo(
    ASCII_GRAPH_TRANSITION.goalFoundProgress,
    10,
  );
  expect(ASCII_GRAPH_TRANSITION.glyphScalePulseHz).toBeLessThan(3);

  for (const node of field.nodes) {
    expect(node.startProgress).toBeGreaterThanOrEqual(0);
    expect(node.startProgress).toBeLessThanOrEqual(1);
    expect(node.initialGlyphIndex).toBeGreaterThanOrEqual(
      ASCII_GRAPH_TRANSITION.nodeMinimumGlyphIndex,
    );
    expect(node.targetGlyphIndex).toBeGreaterThanOrEqual(
      ASCII_GRAPH_TRANSITION.nodeMinimumGlyphIndex,
    );
  }

  for (const face of field.faces) {
    expect(face.coverProgress).toBe(
      Math.max(
        field.nodes[face.a].startProgress,
        field.nodes[face.b].startProgress,
        field.nodes[face.c].startProgress,
      ),
    );
  }
});

test("ASCII transition assigns at most one glyph to each visual cell", () => {
  const field = buildAsciiTransitionField(
    1_440,
    900,
    1_400,
    860,
    createSeededRandom(42),
  );
  const minimumSpacing =
    ASCII_GRAPH_TRANSITION.glyphMinimumSpacingPx * field.responsiveScale;

  for (const [progress, clearing] of [
    [0.35, false],
    [0.7, false],
    [1, false],
    [0.4, true],
  ] as const) {
    const placements = getAsciiTransitionGlyphPlacements(
      field,
      progress,
      640,
      clearing,
    );

    expect(placements.length).toBeGreaterThan(20);
    let closestPairDistance = Number.POSITIVE_INFINITY;

    for (let left = 0; left < placements.length; left += 1) {
      for (let right = left + 1; right < placements.length; right += 1) {
        closestPairDistance = Math.min(
          closestPairDistance,
          Math.hypot(
            placements[left].x - placements[right].x,
            placements[left].y - placements[right].y,
          ),
        );
      }
    }

    expect(closestPairDistance).toBeGreaterThanOrEqual(minimumSpacing - 1e-6);
  }

  const settledPlacements = getAsciiTransitionGlyphPlacements(
    field,
    1,
    1_180,
    false,
  );

  expect(
    settledPlacements.filter(({ source }) => source === "node"),
  ).toHaveLength(field.nodes.length);
  expect(
    settledPlacements.filter(({ source }) => source === "edge").length,
  ).toBeGreaterThan(0);
});

test("volumetric modes own independent tuning and preserve ASCII appearance", () => {
  const threeDimensional = VOLUMETRIC_STARFIELD_TUNING["3d"];
  const ascii = VOLUMETRIC_STARFIELD_TUNING.ascii;

  expect(threeDimensional).not.toBe(ascii);
  expect(threeDimensional.bounds).not.toBe(ascii.bounds);
  expect(threeDimensional.orbitWells).not.toBe(ascii.orbitWells);
  expect(threeDimensional.stars).not.toBe(ascii.stars);
  expect(threeDimensional.planets).not.toBe(ascii.planets);
  expect(threeDimensional.stars.orbitalMotion).not.toBe(
    ascii.stars.orbitalMotion,
  );
  expect(threeDimensional.planets.orbitalMotion).not.toBe(
    ascii.planets.orbitalMotion,
  );
  expect(STARS_2D.colors).not.toBe(ascii.stars.colors);
  expect(threeDimensional.useDeterministicLayout).toBe(false);

  /* The physical-motion properties are intentionally excluded: they may evolve
     without changing the curated ASCII population's composition or styling. */
  const appearanceOnlyAscii = {
    ...ascii,
    orbitWells: ascii.orbitWells.map((well) =>
      Object.fromEntries(
        Object.entries(well).filter(([key]) => key !== "rotationDirection"),
      ),
    ),
    stars: Object.fromEntries(
      Object.entries(ascii.stars).filter(([key]) => key !== "orbitalMotion"),
    ),
    planets: Object.fromEntries(
      Object.entries(ascii.planets).filter(([key]) => key !== "orbitalMotion"),
    ),
  };

  expect(appearanceOnlyAscii).toEqual({
    useDeterministicLayout: true,
    bounds: {
      edgeBuffer: 0.75,
      fieldRadiusMultiplier: 1.25,
    },
    orbitWells: [
      { side: "left", position: 0.18, distance: 0.28, weight: 1 },
      { side: "left", position: 0.72, distance: 0.28, weight: 1 },
      { side: "right", position: 0.28, distance: 0.28, weight: 1 },
      { side: "right", position: 0.78, distance: 0.28, weight: 1 },
      { side: "top", position: 0.32, distance: 0.24, weight: 1 },
      { side: "top", position: 0.82, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.24, distance: 0.24, weight: 1 },
      { side: "bottom", position: 0.68, distance: 0.24, weight: 1 },
    ],
    stars: {
      seed: 48017,
      virtualCount: 10000,
      visualScale: 2.5,
      colors: [
        COLOR_PALETTE_STR.white,
        COLOR_PALETTE_STR.mutedWhite,
        COLOR_PALETTE_STR.softGray,
        COLOR_PALETTE_STR.dimBlueGray,
        COLOR_PALETTE_STR.fadedBlue,
      ],
      size: {
        mean: 0.014,
        stdDev: 0.005,
        min: 0.005,
        max: 0.03,
      },
      emissiveIntensity: {
        mean: 0.46,
        stdDev: 0.11,
        min: 0.22,
        max: 0.72,
        buckets: [0.26, 0.38, 0.5, 0.62, 0.72],
      },
      depthBand: {
        nearestZ: -8.8,
        farthestZ: -16,
      },
      depthDistribution: {
        mean: 0.58,
        stdDev: 0.22,
        min: 0,
        max: 1,
      },
      angularSpeedRadiansPerSecond: {
        mean: 0.022,
        stdDev: 0.008,
        min: 0.006,
        max: 0.044,
      },
      minOrbitRadiusRatio: 0.34,
    },
    planets: {
      seed: 73091,
      virtualCount: 300,
      visualScale: 2.35,
      pixelsToWorldUnit: 0.0048,
      tint: "#a5afbf",
      maxOpacity: 0.78,
      fadeInSeconds: 1.15,
      visibilityBuffer: 1.4,
      minOrbitRadiusRatio: 0.42,
      sizeScale: {
        mean: 0.9,
        stdDev: 0.18,
        min: 0.58,
        max: 1.28,
      },
      depthBand: {
        nearestZ: -1.35,
        farthestZ: -7.8,
      },
      depthDistribution: {
        mean: 0.5,
        stdDev: 0.2,
        min: 0,
        max: 1,
      },
      angularSpeedRadiansPerSecond: {
        mean: 0.012,
        stdDev: 0.005,
        min: 0.003,
        max: 0.026,
      },
      frameRate: {
        mean: 5,
        stdDev: 1.6,
        min: 2,
        max: 9,
      },
      rotation: {
        illuminatedDirectionRadians: (Math.PI * 3) / 4,
        damping: 4.5,
      },
    },
  });
});

test("volumetric orbital motion slows large distant orbits without freezing them", () => {
  const tuning = VOLUMETRIC_STARFIELD_TUNING["3d"].stars.orbitalMotion;
  const orbitWell = VOLUMETRIC_STARFIELD_TUNING["3d"].orbitWells[0];
  const common = {
    baseAngularSpeed: 0.022,
    cameraZ: 7.25,
    directionRandom: 0,
    orbitWell,
    tuning,
  };
  const nearSpeed = Math.abs(
    getCinematicOrbitalAngularSpeed({
      ...common,
      orbitRadiusRatio: 0.45,
      z: -8.8,
    }),
  );
  const farSpeed = Math.abs(
    getCinematicOrbitalAngularSpeed({
      ...common,
      orbitRadiusRatio: 0.95,
      z: -16,
    }),
  );

  expect(farSpeed).toBeLessThan(nearSpeed);
  expect(farSpeed).toBeGreaterThanOrEqual(
    tuning.minimumAngularSpeedRadiansPerSecond,
  );
  expect(nearSpeed).toBeLessThanOrEqual(
    tuning.maximumAngularSpeedRadiansPerSecond,
  );
});

test("2D pixel-space scale follows the current viewport height", () => {
  const visibleHeight = getTwoDimensionalVisibleHeight();
  const largeViewportHeight = 1440;
  const smallViewportHeight = 844;
  const largeScale = getTwoDimensionalWorldPerPixel(largeViewportHeight);
  const smallScale = getTwoDimensionalWorldPerPixel(smallViewportHeight);

  expect(largeScale * largeViewportHeight).toBeCloseTo(visibleHeight, 10);
  expect(smallScale * smallViewportHeight).toBeCloseTo(visibleHeight, 10);
  expect(smallScale / largeScale).toBeCloseTo(
    largeViewportHeight / smallViewportHeight,
    10,
  );
  expect(Number.isFinite(getTwoDimensionalWorldPerPixel(0))).toBe(true);
});

test("planet atlases load through a bounded, diversity-first queue", async ({
  page,
}) => {
  test.setTimeout(45_000);

  let activeAtlasRequests = 0;
  let maximumActiveAtlasRequests = 0;
  const requestedAtlases: string[] = [];
  const modalPreviewAtlases = new Set([
    "/astroid/astroid-5.webp",
    "/ice-world/ice-world-1.webp",
    "/islands/islands-1.webp",
    "/terran-wet/terran-wet-1.webp",
  ]);

  await page.route(
    "**/rotating-planet-spritesheets/**/*.webp",
    async (route) => {
      const path = new URL(route.request().url()).pathname;

      if ([...modalPreviewAtlases].some((suffix) => path.endsWith(suffix))) {
        await route.continue();
        return;
      }

      requestedAtlases.push(path);
      activeAtlasRequests += 1;
      maximumActiveAtlasRequests = Math.max(
        maximumActiveAtlasRequests,
        activeAtlasRequests,
      );

      try {
        // Keep requests overlapping long enough for the test to observe the
        // loader's actual concurrency limit rather than local-cache timing.
        await new Promise((resolve) => setTimeout(resolve, 35));
        const response = await route.fetch();
        await route.fulfill({ response });
      } finally {
        activeAtlasRequests -= 1;
      }
    },
  );

  await page.goto("/");
  await waitForStartupReveal(page);
  await expect
    .poll(() => requestedAtlases.length, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(8);

  expect(maximumActiveAtlasRequests).toBeLessThanOrEqual(2);

  const firstAtlases = requestedAtlases.slice(0, 8);
  expect(firstAtlases.every((path) => /-1\.webp$/.test(path))).toBe(true);
  expect(
    new Set(firstAtlases.map((path) => path.split("/").at(-2)).filter(Boolean))
      .size,
  ).toBe(firstAtlases.length);

  // The progressive queue intentionally continues after these assertions.
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("render menu selects every mode and refresh resets to 3D", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    localStorage.setItem("portfolio:background-mode", "ascii");
  });
  await page.goto("/");
  await waitForStartupReveal(page);

  const modeLabel = currentModeLabel(page);
  const transition = page.locator(".bg-transition-overlay");

  await expect(modeLabel).toContainText("[3D]");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("portfolio:background-mode")),
    )
    .toBeNull();

  const expectModeReady = async (mode: "ascii" | "3d" | "2d") => {
    await chooseMode(page, mode);
    /* The tile marks the pending target straight away, but the readout names
       the scene on screen, so it only changes once the transition is done. */
    await expect(page.locator(`.rm-tile[data-mode="${mode}"]`)).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(transition).toHaveCount(0, { timeout: 10_000 });
    await expect(modeLabel).toContainText(`[${mode.toUpperCase()}]`);
    await expect(page.locator(".bg-mode-switch-anchor")).not.toHaveAttribute(
      "data-hidden",
      "true",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };

  // Exercise the animated ASCII round trip together, then reload before the
  // independent 2D path. This still covers every selectable mode without
  // accumulating several large GPU atlas transitions in one browser context.
  await expectModeReady("ascii");
  await expectModeReady("3d");

  await page.reload();
  await waitForStartupReveal(page);
  await expect(modeLabel).toContainText("[3D]");

  await expectModeReady("2d");
  await page.reload();
  await waitForStartupReveal(page);
  await expect(modeLabel).toContainText("[3D]");
});

test("OS reduced-motion preference does not replace the ASCII transition", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForStartupReveal(page);

  await chooseMode(page, "ascii");

  const transition = page.locator(
    '.bg-transition-overlay[data-target-mode="ascii"]',
  );
  const countColoredTransitionPixels = () =>
    transition.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return 0;
      }
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let coloredPixels = 0;

      /* Sample every fourth physical pixel. The overlay background is #070b14;
         any sufficiently different opaque pixel belongs to a graph glyph. */
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] < 16) {
          continue;
        }
        const differenceFromBackground =
          Math.abs(pixels[index] - 7) +
          Math.abs(pixels[index + 1] - 11) +
          Math.abs(pixels[index + 2] - 20);
        if (differenceFromBackground > 24) {
          coloredPixels += 1;
        }
      }

      return coloredPixels;
    });

  await expect(transition).toHaveAttribute("data-phase", "covering");
  await expect
    .poll(countColoredTransitionPixels, { timeout: 15_000 })
    .toBeGreaterThan(50);
  await expect
    .poll(() => transition.getAttribute("data-phase"), { timeout: 15_000 })
    .toBe("clearing");
  await expect(transition).toHaveCount(0, { timeout: 10_000 });
  await expect(currentModeLabel(page)).toContainText("[ASCII]");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the mode readout waits for the new scene to emerge", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForStartupReveal(page);

  const modeLabel = currentModeLabel(page);

  await expect(modeLabel).toContainText("[3D]");
  await chooseMode(page, "2d");

  /* Mid-transition the tile has moved but the readout has not: the 2D scene
     is still hidden behind the cover at this point. */
  await expect(page.locator('.rm-tile[data-mode="2d"]')).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(modeLabel).toContainText("[3D]");

  await expect(page.locator(".bg-transition-overlay")).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(modeLabel).toContainText("[2D]");
});

test("the modal toolbar returns to the starfield before transitioning", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await waitForStartupReveal(page);

  const scrollRoot = page.locator(".modal-scroll-root");

  await scrollRoot.evaluate((element) =>
    element.scrollTo({ behavior: "instant", top: window.innerHeight * 2.2 }),
  );
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(page.locator(".modal-render-menu")).toHaveAttribute(
    "data-motion",
    "idle",
  );

  await scrollRoot.evaluate((element) => {
    const root = document.documentElement;

    delete root.dataset.modalReturnLandedAt;
    delete root.dataset.modalTransitionStartedAt;

    element.addEventListener(
      "scroll",
      () => {
        if (
          element.scrollTop <= 0 &&
          root.dataset.modalReturnLandedAt === undefined
        ) {
          root.dataset.modalReturnLandedAt = String(performance.now());
        }
      },
      { passive: true },
    );

    new MutationObserver(() => {
      if (
        document.querySelector(".bg-transition-overlay") &&
        root.dataset.modalTransitionStartedAt === undefined
      ) {
        root.dataset.modalTransitionStartedAt = String(performance.now());
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

  await chooseModeFromModal(page, "2d");

  const starfieldRail = page.locator(".bg-mode-switch-anchor");
  const starfieldTiles = starfieldRail.locator(".rm-tile");

  await expect(starfieldRail).toHaveAttribute("data-input-locked", "true");
  await expect(starfieldRail.locator(".rm-rail-options")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(starfieldTiles).toHaveCount(3);
  await expect(starfieldRail.locator("button.rm-tile")).toHaveCount(0);

  for (const tile of await starfieldTiles.all()) {
    await expect(tile).toHaveAttribute("aria-disabled", "true");
    await expect(tile).toHaveClass(/rm-tile-static/);
  }

  const selectedTileText = await starfieldTiles.first().evaluate((tile) => {
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(tile);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const text = selection?.toString() ?? "";
    selection?.removeAllRanges();

    return text;
  });
  expect(selectedTileText.trim().length).toBeGreaterThan(0);

  /* Even a programmatic click during the return cannot replace the mode that
     initiated it. The static tile and shared request lock both protect this
     interval. */
  await starfieldRail
    .locator('.rm-tile[data-mode="ascii"]')
    .evaluate((tile: HTMLElement) => tile.click());

  /* The unscroll must complete before the transition covers the screen; the
     reveal would otherwise play against a modal rather than the scene. */
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop), {
      timeout: 10_000,
    })
    .toBeLessThanOrEqual(1);

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Number(document.documentElement.dataset.modalReturnLandedAt) > 0 &&
          Number(document.documentElement.dataset.modalTransitionStartedAt) > 0,
      ),
    )
    .toBe(true);

  const modalReturnTiming = await page.evaluate(() => ({
    landedAt: Number(document.documentElement.dataset.modalReturnLandedAt),
    startedAt: Number(
      document.documentElement.dataset.modalTransitionStartedAt,
    ),
  }));

  expect(modalReturnTiming.landedAt).toBeGreaterThan(0);
  expect(
    modalReturnTiming.startedAt - modalReturnTiming.landedAt,
  ).toBeGreaterThanOrEqual(BACKGROUND_TRANSITION.modalReturnPauseMs - 25);

  await expect(page.locator(".bg-transition-overlay")).toHaveCount(0, {
    timeout: 20_000,
  });
  await expect(currentModeLabel(page)).toContainText("[2D]");
  await expect(page.locator('.rm-tile[data-mode="2d"]')).toHaveAttribute(
    "data-active",
    "true",
  );
});
