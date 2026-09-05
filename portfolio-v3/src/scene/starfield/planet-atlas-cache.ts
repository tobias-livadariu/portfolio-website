import { loadPlanetAtlases, type PlanetAtlas } from "./planet-atlas";

/* Atlases are shared between the 3D and 2D starfields, which mount and
   unmount as the user toggles background modes. Textures therefore live for
   the page lifetime and are never disposed here — matching the steady-state
   memory cost the 3D starfield already had. */

type AtlasListener = (atlas: PlanetAtlas) => void;

const loadedAtlases = new Map<string, PlanetAtlas>();
const listeners = new Set<AtlasListener>();

let loadingStarted = false;
let resolveFirstAtlas: (() => void) | null = null;

const firstAtlasReady = new Promise<void>((resolve) => {
  resolveFirstAtlas = resolve;
});

/**
 * Starts the atlas load, once.
 *
 * The latch is released again if a whole pass produced nothing, so a startup
 * that ran without a network — every atlas exhausting its retries — can be
 * picked up by a later caller instead of leaving the field permanently empty.
 * A pass that loaded even one atlas stays latched: the rest already retried.
 */
export function ensurePlanetAtlasesLoading() {
  if (loadingStarted) {
    return;
  }

  loadingStarted = true;
  void loadPlanetAtlases((atlas) => {
    loadedAtlases.set(atlas.key, atlas);
    resolveFirstAtlas?.();
    resolveFirstAtlas = null;

    for (const listener of listeners) {
      listener(atlas);
    }
  })
    .catch((error) => {
      console.warn("Planet atlas loading stopped early:", error);
    })
    .finally(() => {
      if (loadedAtlases.size === 0) {
        loadingStarted = false;
      }
    });
}

export function getLoadedPlanetAtlases(): ReadonlyMap<string, PlanetAtlas> {
  return loadedAtlases;
}

/* Replays already-loaded atlases synchronously so late subscribers (e.g. the
   2D starfield mounting after the 3D one finished loading) catch up. */
export function subscribePlanetAtlases(listener: AtlasListener) {
  listeners.add(listener);

  for (const atlas of loadedAtlases.values()) {
    listener(atlas);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function whenFirstPlanetAtlasReady() {
  return firstAtlasReady;
}
