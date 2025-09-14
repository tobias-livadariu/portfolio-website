import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Assets, Spritesheet, AnimatedSprite, Texture, Ticker, Sprite } from "pixi.js";

// Extend Application interface for cleanup function
interface ExtendedApplication extends Application {
  _cleanup?: () => void;
}

// Constant: 1.8 degrees per second, expressed as radians per millisecond
const ANGULAR_SPEED_RAD_PER_MS = (1.8 * Math.PI / 180) / 1000;

// Enclosing circle margin so all radii stay <= R_MAX
const R_MAX_MARGIN = 0;

// Densities per square pixel (tune to taste)
const NUM_STARS_PER_UNIT   = 13e-4;   // stars per px^2
const NUM_PLANETS_PER_UNIT = 3e-5;    // planets per px^2

// Hard caps (do not exceed these totals)
const MAX_STARS   = 30000;
const MAX_PLANETS = 10000;

// Planet creation throttling
const PLANETS_PER_READY_VARIANT = 6;   // how many to enqueue when a variant finishes
const PLANET_SPAWN_BUDGET_PER_TICK = 4; // how many to actually create each animation tick (used only while spritesheets are still loading)

function getRMax(app: Application): number {
  return Math.hypot(app.screen.width, app.screen.height) + R_MAX_MARGIN;
}

// Yield control so the browser can render a frame
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Uniform-area polar sampling in ring [rMin, rMax]
function samplePolar(rMin: number, rMax: number): { r: number; theta: number } {
  const u = Math.random();
  const r = Math.sqrt(u) * (rMax - rMin) + rMin;
  const theta = Math.random() * Math.PI * 2;
  return { r, theta };
}

interface Star {
  sprite: Sprite;
  x: number;
  y: number;
  size: number;
  color: number;
  radius: number;
  angle: number;
}

type PlanetType =
  | "astroid"
  | "black-hole"
  | "galaxy"
  | "gas-giant-1"
  | "gas-giant-2"
  | "ice-world"
  | "islands"
  | "lava-world"
  | "no-atmosphere"
  | "star"
  | "terran-dry"
  | "terran-wet";

interface Planet {
  sprite: AnimatedSprite;
  type: PlanetType;
  variant: number; // 1..5
  radius: number;
  angle: number;
  speed: number;
  boundRadius: number; // half-diagonal for size-aware visibility checks
}

// Map type -> [ variation0Frames[], variation1Frames[], ... ]
const planetFrames = new Map<PlanetType, Texture[][]>();

// Hoisted list of all planet types and expected variants per type
const PLANET_TYPES: PlanetType[] = [
  "astroid",
  "black-hole",
  "galaxy",
  "gas-giant-1",
  "gas-giant-2",
  "ice-world",
  "islands",
  "lava-world",
  "no-atmosphere",
  "star",
  "terran-dry",
  "terran-wet",
];
const VARIANTS_PER_TYPE = 5;


// Planet exclusion zone around origin (configurable)
const PLANET_EXCLUSION_RADIUS = 395; // pixels - planets cannot spawn within this distance of origin (0,0)

// Scale factor computation based on viewport width
function getScaleFromWidth(): number {
  // Keep visuals consistent; no width-based scaling desired.
  return 1;
}

// World-space radius computation (screen radius divided by scale)
function getRMaxWorld(app: Application, scale: number): number {
  // Keep formulas consistent with getRMax()
  return getRMax(app) / Math.max(1, scale);
}

// World-space exclusion radius for planets
function getPlanetExclusionWorld(scale: number): number {
  return PLANET_EXCLUSION_RADIUS / Math.max(1, scale);
}

// Effective densities that decrease as scale increases (compensates for apparent area increase)
function getEffectiveDensities(scale: number): { D_STAR: number; D_PLANET: number } {
  const factor = scale * scale; // stage scale increases apparent area by S^2
  return {
    D_STAR: NUM_STARS_PER_UNIT / factor,
    D_PLANET: NUM_PLANETS_PER_UNIT / factor,
  };
}

async function loadPlanetFrames(
  onVariantReady?: (type: PlanetType, variantIndex: number) => void
) {
  for (const type of PLANET_TYPES) {
    const variations: Texture[][] = [];
    // Expose partially-loaded type immediately so createPlanet can see ready variants
    planetFrames.set(type, variations);

    for (let v = 1; v <= VARIANTS_PER_TYPE; v++) {
      const jsonUrl = `rotating-planet-spritesheets/${type}/${type}-${v}.json`;
      const pngUrl = `rotating-planet-spritesheets/${type}/${type}-${v}.png`;

      try {
        const [atlasData, baseTexture] = await Promise.all([
          fetch(jsonUrl).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch ${jsonUrl}`);
            return r.json();
          }),
          Assets.load(pngUrl), // returns a BaseTexture/Texture in v8
        ]);

        const sheet = new Spritesheet(baseTexture, atlasData);
        await sheet.parse();

        // Animation key matches the file name, e.g. "terran-wet-1"
        const key = `${type}-${v}`;
        const frames = sheet.animations[key];
        if (!frames || frames.length === 0) {
          console.warn(`No frames for ${key}`);
          continue;
        }
        variations[v - 1] = frames;
        // Notify that this (type, variant) is now available
        onVariantReady?.(type, v - 1);
        // Yield a frame before parsing the next variant to keep UI responsive
        await nextFrame();
      } catch (error) {
        console.warn(`Failed to load ${type}-${v}:`, error);
      }
    }
    // variations is already set incrementally above
  }
}

function createPlanet(
  app: Application,
  rMinOverride?: number,
  rMaxOverride?: number,
  typeOverride?: PlanetType,
  variantOverride?: number // 0-based index
): Planet | null {
  // Pick any planet type randomly (no uniqueness constraint)
  const planetTypes = Array.from(planetFrames.keys());
  if (planetTypes.length === 0) return null;
  const type = (typeOverride ?? planetTypes[(Math.random() * planetTypes.length) | 0]);

  const variations = planetFrames.get(type);
  if (!variations) return null;
  // Build a list of loaded variant indices (holes may exist while others load)
  const loadedIndices: number[] = [];
  for (let i = 0; i < variations.length; i++) {
    if (variations[i] && variations[i].length) loadedIndices.push(i);
  }
  if (loadedIndices.length === 0) return null;
  const chosenIndex = (variantOverride !== undefined && loadedIndices.includes(variantOverride))
    ? variantOverride
    : loadedIndices[(Math.random() * loadedIndices.length) | 0];
  const frames = variations[chosenIndex];

  const sprite = new AnimatedSprite(frames);
  sprite.anchor.set(0.5);
  sprite.animationSpeed = 2 / 60; // 2 FPS
  // Defer playback to reduce offscreen work; start when entering viewport
  const startFrame = (Math.random() * frames.length) | 0;
  sprite.gotoAndStop(startFrame);

  // Precompute half-diagonal (includes current scale) and start transparent
  const halfDiag = 0.5 * Math.hypot(sprite.width, sprite.height);
  sprite.alpha = 0;

  // Initial placement: uniform-area polar sampling in the requested ring
  const R_MAX = (rMaxOverride ?? getRMax(app));
  const rMin = Math.max((rMinOverride ?? (PLANET_EXCLUSION_RADIUS + 1)), 1);
  const { r, theta } = samplePolar(rMin, R_MAX);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);

  // Always fade-in using existing logic in animatePlanets (no instant alpha=1)

  const radius = r;
  const angle = theta;
  // Per-planet angular speed variance (±15%) to break phase lock
  // Keeps average ~1.8°/s while ensuring phases diffuse over time
  const speed = ANGULAR_SPEED_RAD_PER_MS * (0.85 + Math.random() * 0.30);

  sprite.x = x; 
  sprite.y = y; 
  
  // Rotate so the top-left corner of the square faces the origin
  sprite.rotation = angle - Math.PI / 4;

  // No TTL needed without deletions
  return { sprite, type, variant: chosenIndex + 1, radius, angle, speed, boundRadius: halfDiag };
}

// ensure the ticker callback matches v8: (ticker: Ticker) => void
function animatePlanets(planets: Planet[], app: Application, deltaMS: number, scaleFactor: number) {
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    
    // Update angle using time-based speed (rad/ms * ms)
    p.angle += p.speed * deltaMS;
    
    // Calculate new position based on circular motion
    const newX = p.radius * Math.cos(p.angle);
    const newY = p.radius * Math.sin(p.angle);
    
    // Update planet position
    p.sprite.x = newX;
    p.sprite.y = newY;
    
    // Rotate the planet around its own center at the same time-based rate
    p.sprite.rotation += p.speed * deltaMS;

    // No TTL updates needed without deletions

    // Fade-in once the bounding circle intersects the viewport (use screen coordinates)
    if (p.sprite.alpha < 1) {
      // Convert world coordinates to screen coordinates by multiplying by scale factor
      const screenX = p.sprite.x * scaleFactor;
      const screenY = p.sprite.y * scaleFactor;
      const screenBoundR = p.boundRadius * scaleFactor; // bound radius also scales with container
      const insideX = screenX > -screenBoundR && screenX < app.screen.width + screenBoundR;
      const insideY = screenY > -screenBoundR && screenY < app.screen.height + screenBoundR;
      if (insideX && insideY) {
        if (!p.sprite.playing) p.sprite.play();
        p.sprite.alpha = Math.min(1, p.sprite.alpha + 0.06);
      }
    }
  }
}

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const mountedRef = useRef(true);
  // Track the world-space radius and scale factor used at last layout
  const rMaxRef = useRef<number>(0);
  const rMaxPxRef = useRef<number>(0);
  const scaleRef = useRef<number>(1);
  const spritesheetsReadyRef = useRef<boolean>(false);
  const initialLoadRef = useRef<boolean>(true);

  const cleanup = useCallback(() => {
    mountedRef.current = false;
    
    if (appRef.current) {
      try {
        appRef.current.destroy(true, { children: true, texture: true });
      } catch (error) {
        console.warn('Pixi cleanup error:', error);
      }
      appRef.current = null;
    }

    if (canvasRef.current && canvasRef.current.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current);
    }
    canvasRef.current = null;
  }, []);

  useEffect(() => {
    let app: ExtendedApplication;
    mountedRef.current = true;

    const initPixi = async () => {
      try {
        app = new Application();
        
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x070B14,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (!mountedRef.current) {
          app.destroy(true);
          return;
        }

        appRef.current = app;
        canvasRef.current = app.canvas as HTMLCanvasElement;

        // Style the canvas for full background
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.zIndex = "-1";
        canvas.style.pointerEvents = "none";

        // Append to body instead of container to avoid React interference
        document.body.appendChild(canvas);

        // Compute initial scale factor based on viewport width
        const initialScale = getScaleFromWidth();
        
        // Create root container for world-space scaling
        const rootContainer = new Container();
        rootContainer.scale.set(initialScale);
        app.stage.addChild(rootContainer);

        // Create star container (child of root)
        const starContainer = new Container();
        rootContainer.addChild(starContainer);

        // Create planet container (child of root) 
        const planetContainer = new Container();
        rootContainer.addChild(planetContainer);

        // Track current world-space radius and scale factor for resize scaling
        rMaxRef.current = getRMaxWorld(app, initialScale);
        scaleRef.current = initialScale;

        // === Initial counts from world-space area ===
        const R_MAX_WORLD = getRMaxWorld(app, initialScale);
        const { D_STAR, D_PLANET } = getEffectiveDensities(initialScale);
        const areaCircleWorld = Math.PI * R_MAX_WORLD * R_MAX_WORLD;
        const rMinPlanetWorld = Math.max(getPlanetExclusionWorld(initialScale), 1);
        const areaRingWorld = Math.PI * (R_MAX_WORLD * R_MAX_WORLD - rMinPlanetWorld * rMinPlanetWorld);
        const numStars0 = Math.round(D_STAR * areaCircleWorld);
        const numPlanets0 = Math.round(D_PLANET * areaRingWorld);

        // No radius jitter needed without recycling (keep helpers if used elsewhere)



        const colors = [0xffffff, 0xa8a8b3, 0x7d7d87, 0x6c6f7a, 0x5a6a85];
        const stars: Star[] = [];
        const STAR_TEXTURE = Texture.WHITE; // shared 1×1 white texture

        // Helper to create a star sampled uniformly in ring [rMin, rMax]
        const createStar = (rMin = 0, rMax = getRMax(app)): Star => {
          const size = Math.random() * 2 + 1;
          const color = colors[Math.floor(Math.random() * colors.length)];

          // Use a lightweight Sprite instead of Graphics; tint + resize the shared texture
          const sprite = new Sprite(STAR_TEXTURE);
          sprite.anchor.set(0.5);
          sprite.width = size;
          sprite.height = size;
          sprite.tint = color;

          // Initial spawn anywhere inside the given ring (uniform-area)
          const { r, theta } = samplePolar(rMin, rMax);
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);

          sprite.x = x;
          sprite.y = y;
          // Keep the edge tangential to the circular path
          sprite.rotation = theta + Math.PI / 2;

          return { sprite, x, y, size, color, radius: r, angle: theta };
        };

        // (old recycling helpers removed)

        // Initialize stars using world-space coordinates
        for (let i = 0; i < numStars0; i++) {
          const star = createStar(0, R_MAX_WORLD);
          stars.push(star);
          starContainer.addChild(star.sprite);
        }

        // Prepare planets array and a spawn queue to throttle creation
        const planets: Planet[] = [];
        const planetSpawnQueue: Array<() => void> = [];
        
        // === Start animating immediately (stars only for now) ===
        const animateRef = { current: (ticker: Ticker) => {
          if (!mountedRef.current || !starContainer) return;
          const deltaMS = ticker?.deltaMS ?? 16.67;
          const clampedDeltaMS = Math.min(deltaMS, 100);
          const step = ANGULAR_SPEED_RAD_PER_MS * clampedDeltaMS;
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            star.angle += step;
            const newX = star.radius * Math.cos(star.angle);
            const newY = star.radius * Math.sin(star.angle);
            star.sprite.x = newX;
            star.sprite.y = newY;
            star.x = newX; star.y = newY;
            // Set rotation directly from angle to avoid extra accumulation/drift
            star.sprite.rotation = star.angle + Math.PI / 2;
          }
          // Throttle only PLANET creation (LIFO) when spritesheets are still loading
          let budget = PLANET_SPAWN_BUDGET_PER_TICK;
          while (budget-- > 0 && planetSpawnQueue.length) {
            const job = planetSpawnQueue.pop()!; // use as a stack (LIFO)
            job();
          }
          animatePlanets(planets, app, clampedDeltaMS, scaleRef.current);
        }};
        app.ticker.add(animateRef.current);

        // === Progressive planet creation as spritesheets become available ===
        const VARIANTS_EXPECTED = PLANET_TYPES.length * VARIANTS_PER_TYPE; // 60
        const perVariantQuota = Math.max(1, Math.min(
          PLANETS_PER_READY_VARIANT,
          Math.ceil(numPlanets0 / VARIANTS_EXPECTED)
        ));
        let createdInitialPlanets = 0;

        const onVariantReady = (type: PlanetType, variantIndex: number) => {
          if (!mountedRef.current) return;
          if (!initialLoadRef.current) return; // stop auto-spawn after initial load completes
          if (createdInitialPlanets >= numPlanets0) return;
          const remaining = numPlanets0 - createdInitialPlanets;
          const toSpawn = Math.min(perVariantQuota, remaining);
          for (let i = 0; i < toSpawn; i++) {
            planetSpawnQueue.push(() => {
              const p = createPlanet(app, rMinPlanetWorld, R_MAX_WORLD, type, variantIndex);
              if (p) {
                planets.push(p);
                planetContainer.addChild(p.sprite);
                createdInitialPlanets++;
              }
            });
          }
        };

        // Kick off loading; when done, mark spritesheets ready
        // (Do NOT await inside init; allow UI to remain responsive.)
        loadPlanetFrames(onVariantReady)
          .finally(() => {
            spritesheetsReadyRef.current = true;
            initialLoadRef.current = false;
          });

        // No proportional scaling; we add/remove to maintain density

        // (animateRef already added above)

        // === Helpers to clear and rebuild everything ===
        const clearStars = () => {
          for (let i = stars.length - 1; i >= 0; i--) {
            starContainer.removeChild(stars[i].sprite);
            stars[i].sprite.destroy();
          }
          stars.length = 0;
        };

        const clearPlanets = () => {
          for (let i = planets.length - 1; i >= 0; i--) {
            planetContainer.removeChild(planets[i].sprite);
            planets[i].sprite.destroy();
          }
          planets.length = 0;
        };

        const rebuildStars = (count: number, rMaxWorld: number) => {
          for (let i = 0; i < count; i++) {
            const s = createStar(0, rMaxWorld);
            stars.push(s);
            starContainer.addChild(s.sprite);
          }
        };

        const rebuildPlanets = (count: number, rMinWorld: number, rMaxWorld: number) => {
          if (spritesheetsReadyRef.current) {
            // All frames available: build synchronously
            for (let i = 0; i < count; i++) {
              const p = createPlanet(app, rMinWorld, rMaxWorld);
              if (p) {
                planets.push(p);
                planetContainer.addChild(p.sprite);
              }
            }
          } else {
            // Still loading: push to LIFO stack and let ticker drain
            for (let i = 0; i < count; i++) {
              planetSpawnQueue.push(() => {
                const p = createPlanet(app, rMinWorld, rMaxWorld);
                if (p) {
                  planets.push(p);
                  planetContainer.addChild(p.sprite);
                }
              });
            }
          }
        };

        // Handle window resize: clear & rebuild based on new area (no incremental add/remove)
        const handleResize = () => {
          if (!app || !mountedRef.current || !rootContainer) return;
          
          // 1. Resize renderer
          app.renderer.resize(window.innerWidth, window.innerHeight);
          
          // 2. Keep scale fixed at 1 (no width-based visual scaling)
          const newScale = 1;
          rootContainer.scale.set(newScale);

          // 3. Recompute area & counts with caps
          const newRMaxWorld = getRMaxWorld(app, newScale);
          const { D_STAR: dStar, D_PLANET: dPlanet } = getEffectiveDensities(newScale);
          const rMinPlanetWorld = Math.max(getPlanetExclusionWorld(newScale), 1);
          const areaCircleWorld = Math.PI * newRMaxWorld * newRMaxWorld;
          const areaRingWorld = Math.PI * Math.max(0, (newRMaxWorld * newRMaxWorld - rMinPlanetWorld * rMinPlanetWorld));
          const nextStars = Math.min(MAX_STARS, Math.round(dStar * areaCircleWorld));
          const nextPlanets = Math.min(MAX_PLANETS, Math.round(dPlanet * areaRingWorld));

          // 4. Clear everything and rebuild fresh
          clearStars();
          clearPlanets();
          rebuildStars(nextStars, newRMaxWorld);
          rebuildPlanets(nextPlanets, rMinPlanetWorld, newRMaxWorld);

          // 5. Persist refs
          scaleRef.current = newScale;
          rMaxRef.current = newRMaxWorld;
          rMaxPxRef.current = getRMax(app);
        };

        window.addEventListener('resize', handleResize);

        // Store cleanup references
        app._cleanup = () => {
          if (animateRef.current) {
            app.ticker.remove(animateRef.current);
          }
          window.removeEventListener('resize', handleResize);
        };

      } catch (error) {
        console.error('Pixi initialization error:', error);
        mountedRef.current = false;
      }
    };

    initPixi();

    return () => {
      if (app && app._cleanup) {
        app._cleanup();
      }
      cleanup();
    };
  }, [cleanup]);

  // Return null since we're appending to body
  return null;
};

export default Starfield;
