import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics, Assets, Spritesheet, AnimatedSprite, Texture } from "pixi.js";

// Constant: 1.8 degrees per second, expressed as radians per millisecond
const ANGULAR_SPEED_RAD_PER_MS = (1.8 * Math.PI / 180) / 1000;

// Enclosing circle margin so all radii stay <= R_MAX
const R_MAX_MARGIN = 500;

// Densities per square pixel (tune to taste)
const NUM_STARS_PER_UNIT   = 13e-4;   // stars per px^2
const NUM_PLANETS_PER_UNIT = 3e-5;   // planets per px^2

function getRMax(app: Application): number {
  return Math.hypot(app.screen.width, app.screen.height) + R_MAX_MARGIN;
}

// Uniform-area polar sampling in ring [rMin, rMax]
function samplePolar(rMin: number, rMax: number): { r: number; theta: number } {
  const u = Math.random();
  const r = Math.sqrt(u) * (rMax - rMin) + rMin;
  const theta = Math.random() * Math.PI * 2;
  return { r, theta };
}

interface Star {
  graphics: Graphics;
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

async function loadPlanetFrames(
  onVariantReady?: (type: PlanetType, variantIndex: number) => void
) {
  for (const type of PLANET_TYPES) {
    const variations: Texture[][] = [];
    // Expose partially-loaded type immediately so createPlanet can see ready variants
    planetFrames.set(type, variations);

    for (let v = 1; v <= VARIANTS_PER_TYPE; v++) {
      const jsonUrl = `/rotating-planet-spritesheets/${type}/${type}-${v}.json`;
      const pngUrl = `/rotating-planet-spritesheets/${type}/${type}-${v}.png`;

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
  sprite.play();

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
function animatePlanets(planets: Planet[], app: Application, deltaMS: number) {
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

    // Fade-in once the bounding circle intersects the viewport
    if (p.sprite.alpha < 1) {
      const sx = p.sprite.x;
      const sy = p.sprite.y;
      const r  = p.boundRadius;
      const insideX = sx > -r && sx < app.screen.width + r;
      const insideY = sy > -r && sy < app.screen.height + r;
      if (insideX && insideY) {
        p.sprite.alpha = Math.min(1, p.sprite.alpha + 0.06);
      }
    }
  }
}

const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const mountedRef = useRef(true);
  // Track the enclosing-circle radius used at last layout
  const rMaxRef = useRef<number>(0);

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
    let app: Application;
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

        // Track current enclosing radius for resize scaling
        rMaxRef.current = getRMax(app);

        // Create star container
        const starContainer = new Container();
        app.stage.addChild(starContainer);

        // Create planet container
        const planetContainer = new Container();
        app.stage.addChild(planetContainer);

        // === Initial counts from area ===
        const R_MAX0 = getRMax(app);
        const areaCircle0 = Math.PI * R_MAX0 * R_MAX0;
        const rMinPlanet = Math.max(PLANET_EXCLUSION_RADIUS + 1, 1);
        const areaRing0   = Math.PI * (R_MAX0 * R_MAX0 - rMinPlanet * rMinPlanet);
        const numStars0   = Math.round(NUM_STARS_PER_UNIT   * areaCircle0);
        const numPlanets0 = Math.round(NUM_PLANETS_PER_UNIT * areaRing0);

        // No radius jitter needed without recycling (keep helpers if used elsewhere)



        const colors = [0xffffff, 0xa8a8b3, 0x7d7d87, 0x6c6f7a, 0x5a6a85];
        const stars: Star[] = [];

        // Helper to create a star sampled uniformly in ring [rMin, rMax]
        const createStar = (rMin = 0, rMax = getRMax(app)): Star => {
          const size = Math.random() * 2 + 1;
          const color = colors[Math.floor(Math.random() * colors.length)];
          
          const graphics = new Graphics();
          graphics.rect(0, 0, size, size);
          graphics.fill(color);

          // Initial spawn anywhere inside the given ring (uniform-area)
          const { r, theta } = samplePolar(rMin, rMax);
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);

          graphics.x = x;
          graphics.y = y;
          
          // Set initial rotation so the star's edge is tangential to its circular path
          // For a square, we want the edge perpendicular to the radius vector
          // The tangential direction is perpendicular to the radial direction
          const tangentialAngle = theta + Math.PI / 2; // Add 90 degrees (π/2 radians)
          graphics.rotation = tangentialAngle;
          
          // No extents or TTL needed in no-deletion mode
          return { graphics, x, y, size, color, radius: r, angle: theta };
        };

        // (old recycling helpers removed)

        // Initialize stars
        for (let i = 0; i < numStars0; i++) {
          const star = createStar(0, R_MAX0);
          stars.push(star);
          starContainer.addChild(star.graphics);
        }

        // Prepare planets array up-front
        const planets: Planet[] = [];
        
        // === Start animating immediately (stars only for now) ===
        const animateRef = { current: (ticker: any) => {
          if (!mountedRef.current || !starContainer) return;
          const deltaMS = ticker?.deltaMS ?? 16.67;
          const clampedDeltaMS = Math.min(deltaMS, 100);
          const step = ANGULAR_SPEED_RAD_PER_MS * clampedDeltaMS;
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            star.angle += step;
            const newX = star.radius * Math.cos(star.angle);
            const newY = star.radius * Math.sin(star.angle);
            star.graphics.x = newX;
            star.graphics.y = newY;
            star.x = newX; star.y = newY;
            star.graphics.rotation += step;
          }
          animatePlanets(planets, app, clampedDeltaMS);
        }};
        app.ticker.add(animateRef.current);

        // === Progressive planet creation as spritesheets become available ===
        const VARIANTS_EXPECTED = PLANET_TYPES.length * VARIANTS_PER_TYPE; // 60
        const perVariantQuota = Math.max(1, Math.ceil(numPlanets0 / VARIANTS_EXPECTED));
        let createdInitialPlanets = 0;

        const onVariantReady = (type: PlanetType, variantIndex: number) => {
          if (!mountedRef.current) return;
          if (createdInitialPlanets >= numPlanets0) return;
          const remaining = numPlanets0 - createdInitialPlanets;
          const toSpawn = Math.min(perVariantQuota, remaining);
          for (let i = 0; i < toSpawn; i++) {
            const p = createPlanet(app, rMinPlanet, R_MAX0, type, variantIndex);
            if (p) {
              planets.push(p);
              planetContainer.addChild(p.sprite);
              createdInitialPlanets++;
            }
          }
        };

        // Kick off loading (do NOT await); planets will flow in per variant
        loadPlanetFrames(onVariantReady);

        // No proportional scaling; we add/remove to maintain density

        // (animateRef already added above)

        // Handle window resize: recompute R_MAX and add/remove to keep density constant
        const handleResize = () => {
          if (!app || !mountedRef.current) return;
          app.renderer.resize(window.innerWidth, window.innerHeight);
          const prevRMax = rMaxRef.current || getRMax(app);
          const newRMax = getRMax(app);

          if (newRMax === prevRMax) return;

          const rMinPlanet = Math.max(PLANET_EXCLUSION_RADIUS + 1, 1);

          if (newRMax < prevRMax) {
            // ==== SHRINK: remove objects with radius > newRMax ====
            // Stars
            for (let i = stars.length - 1; i >= 0; i--) {
              if (stars[i].radius > newRMax) {
                starContainer.removeChild(stars[i].graphics);
                stars[i].graphics.destroy();
                stars.splice(i, 1);
              }
            }
            // Planets
            for (let i = planets.length - 1; i >= 0; i--) {
              if (planets[i].radius > newRMax) {
                planetContainer.removeChild(planets[i].sprite);
                planets[i].sprite.destroy();
                planets.splice(i, 1);
              }
            }
          } else {
            // ==== EXPAND: add objects to fill the annulus (prevRMax, newRMax] ====
            const areaDeltaCircle = Math.PI * (newRMax * newRMax - prevRMax * prevRMax);
            const addStars = Math.max(0, Math.round(NUM_STARS_PER_UNIT * areaDeltaCircle));

            // For planets, honor the exclusion radius; only the part of the annulus outside rMin counts
            const ringLow = Math.max(prevRMax, rMinPlanet);
            const ringHigh = Math.max(newRMax, ringLow);
            const areaDeltaRing = Math.PI * Math.max(0, (ringHigh * ringHigh - ringLow * ringLow));
            const addPlanets = Math.max(0, Math.round(NUM_PLANETS_PER_UNIT * areaDeltaRing));

            for (let i = 0; i < addStars; i++) {
              const s = createStar(prevRMax, newRMax);
              stars.push(s);
              starContainer.addChild(s.graphics);
            }
            for (let i = 0; i < addPlanets; i++) {
              const p = createPlanet(app, ringLow, ringHigh);
              if (p) {
                planets.push(p);
                planetContainer.addChild(p.sprite);
              }
            }
          }

          rMaxRef.current = newRMax;
        };

        window.addEventListener('resize', handleResize);

        // Store cleanup references
        (app as any)._cleanup = () => {
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
      if (app && (app as any)._cleanup) {
        (app as any)._cleanup();
      }
      cleanup();
    };
  }, [cleanup]);

  // Return null since we're appending to body
  return null;
};

export default Starfield;
