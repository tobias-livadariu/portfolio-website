import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics, Assets, Spritesheet, AnimatedSprite, Texture } from "pixi.js";

// Constant: 1.8 degrees per second, expressed as radians per millisecond
const ANGULAR_SPEED_RAD_PER_MS = (1.8 * Math.PI / 180) / 1000;

interface Star {
  graphics: Graphics;
  x: number;
  y: number;
  size: number;
  color: number;
  radius: number;
  angle: number;
  ageMS: number;     // lifetime accumulator in milliseconds
  ttlMS: number;     // time to live (ms) before forced recycle
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
  ageMS: number;     // lifetime accumulator in milliseconds
  ttlMS: number;     // time to live (ms) before forced recycle
}

// Map type -> [ variation0Frames[], variation1Frames[], ... ]
const planetFrames = new Map<PlanetType, Texture[][]>();

// Spawn band depth (measured perpendicular to edge) for recycled planets
const MIN_SPAWN_DEPTH = 500;
const MAX_SPAWN_DEPTH = 1000;
const randRange = (min: number, max: number) => min + Math.random() * (max - min);

// Planet exclusion zone around origin (configurable)
const PLANET_EXCLUSION_RADIUS = 395; // pixels - planets cannot spawn within this distance of origin (0,0)

async function loadPlanetFrames() {
  const types: PlanetType[] = [
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

  for (const type of types) {
    const variations: Texture[][] = [];

    for (let v = 1; v <= 5; v++) {
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
      } catch (error) {
        console.warn(`Failed to load ${type}-${v}:`, error);
      }
    }

    if (variations.length) planetFrames.set(type, variations);
  }
}

function createPlanet(app: Application, inBorderOnly = false): Planet | null {
  // Pick any planet type randomly (no uniqueness constraint)
  const planetTypes = Array.from(planetFrames.keys());
  const type = planetTypes[(Math.random() * planetTypes.length) | 0];

  const variations = planetFrames.get(type);
  if (!variations || variations.length === 0) return null;

  const variantIndex = (Math.random() * variations.length) | 0; // 0..4
  const frames = variations[variantIndex];

  const sprite = new AnimatedSprite(frames);
  sprite.anchor.set(0.5);
  sprite.animationSpeed = 2 / 60; // 2 FPS
  sprite.play();

  // Precompute half-diagonal (includes current scale) and start transparent
  const halfDiag = 0.5 * Math.hypot(sprite.width, sprite.height);
  sprite.alpha = 0;

  // placement - following the same methodology as stars
  const border = 1000; // extended region, consistent with stars logic
  let x: number = 0, y: number = 0; // Initialize with default values
  
  // Retry loop to avoid spawning too close to origin
  for (let attempts = 0; attempts < 20; attempts++) {
    if (inBorderOnly) {
      // Recycle: spawn only in TOP or LEFT size-aware strips, depth in [500, 1000]
      const side = Math.random() < 0.5 ? "top" : "left";
      const depth = randRange(MIN_SPAWN_DEPTH, MAX_SPAWN_DEPTH);

      if (side === "top") {
        // full-width with slight overhang to avoid corner pops
        x = Math.random() * (app.screen.width + 2 * MAX_SPAWN_DEPTH) - MAX_SPAWN_DEPTH;
        // place center safely above the top by its bound radius + depth
        y = -(halfDiag + depth);
      } else {
        // place center safely left of the screen by its bound radius + depth
        x = -(halfDiag + depth);
        y = Math.random() * (app.screen.height + 2 * MAX_SPAWN_DEPTH) - MAX_SPAWN_DEPTH;
      }
    } else {
      // Initial spawn anywhere in extended region (like stars)
      x = Math.random() * (app.screen.width + 2 * border) - border;
      y = Math.random() * (app.screen.height + 2 * border) - border;
    }

    // Check if planet is far enough from origin
    const distanceFromOrigin = Math.sqrt(x * x + y * y);
    if (distanceFromOrigin >= PLANET_EXCLUSION_RADIUS) {
      // If initially inside (or touching) the viewport, make it visible immediately
      const insideX = x > -halfDiag && x < app.screen.width + halfDiag;
      const insideY = y > -halfDiag && y < app.screen.height + halfDiag;
      if (insideX && insideY) sprite.alpha = 1;
      break; // Found a valid position
    }
    // If too close to origin, continue loop to retry
  }

  const radius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  // All planets use the same orbital speed as stars: 1.8 degrees per second
  // Store as radians per millisecond so motion is FPS-independent
  const speed = ANGULAR_SPEED_RAD_PER_MS;

  sprite.x = x; 
  sprite.y = y; 
  
  // Rotate so the top-left corner of the square faces the origin
  sprite.rotation = angle - Math.PI / 4;

  return { sprite, type, variant: variantIndex + 1, radius, angle, speed, boundRadius: halfDiag, ageMS: 0, ttlMS: 0 };
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

        // Create star recycling system
        const starContainer = new Container();
        app.stage.addChild(starContainer);

        // Create planet container
        const planetContainer = new Container();
        app.stage.addChild(planetContainer);

        const numStars = 8000;
        const borderSize = 1000;

        // ----------------------------
        // Radial Balancer configuration
        // ----------------------------
        const R_MIN = 50; // optional: small hole near origin; set to 1 if you want coverage at center
        const R_MAX = Math.hypot(app.screen.width, app.screen.height) + borderSize;
        const N_BINS = 64;

        // Bin edges [R_MIN, R_MAX] split evenly in radius (target uses area weighting)
        const edges: number[] = Array.from({ length: N_BINS + 1 }, (_, i) =>
          R_MIN + (i * (R_MAX - R_MIN)) / N_BINS
        );
        const targetWeight: number[] = edges.slice(0, -1).map((r1, i) => {
          const r2 = edges[i + 1];
          return r2 * r2 - r1 * r1; // ∝ area of annulus
        });
        let counts: number[] = new Array(N_BINS).fill(0);

        const binOf = (r: number) => {
          const t = (r - R_MIN) / (R_MAX - R_MIN);
          return Math.max(0, Math.min(N_BINS - 1, Math.floor(t * N_BINS)));
        };
        const noteAdd = (r: number) => { counts[binOf(r)]++; };
        const noteRemove = (r: number) => { counts[binOf(r)]--; };

        function sampleRadiusBalanced(): number {
          // deficit = (targetWeight - currentCount), clipped to >= 0
          const deficits = targetWeight.map((w, i) => Math.max(0, w - counts[i]));
          let sum = 0;
          for (let i = 0; i < deficits.length; i++) sum += deficits[i];
          if (sum <= 0) {
            // fallback: uniform-in-area
            const u = Math.random();
            return Math.sqrt(u * (R_MAX * R_MAX - R_MIN * R_MIN) + R_MIN * R_MIN);
          }
          let pick = Math.random() * sum;
          let idx = 0;
          for (; idx < deficits.length; idx++) {
            pick -= deficits[idx];
            if (pick <= 0) break;
          }
          const iBin = Math.max(0, Math.min(idx, N_BINS - 1));
          const r1 = edges[iBin];
          const r2 = edges[iBin + 1];
          return r1 + Math.random() * (r2 - r1);
        }

        // ----------------------------
        // TTL configuration
        // ----------------------------
        const TTL_MIN_MS = 20000;  // 20s
        const TTL_MAX_MS = 40000;  // 40s
        const FADE_RATE_PER_SEC = 2.0; // alpha per second when expiring
        const randRange = (min: number, max: number) => min + Math.random() * (max - min);



        const colors = [0xffffff, 0xa8a8b3, 0x7d7d87, 0x6c6f7a, 0x5a6a85];
        const stars: Star[] = [];

        // Helper function to create a star in the extended region
        const createStar = (inBorderOnly = false): Star => {
          const size = Math.random() * 2 + 1;
          const color = colors[Math.floor(Math.random() * colors.length)];
          
          const graphics = new Graphics();
          graphics.rect(0, 0, size, size);
          graphics.fill(color);

          let x, y;
          
          if (inBorderOnly) {
            // Spawn in the outer border regions (not on main screen)
            // Ensure stars are placed far enough outside to be invisible
            const side = Math.floor(Math.random() * 4);
            switch (side) {
              case 0: // Top border
                x = Math.random() * (app.screen.width + 2 * borderSize) - borderSize;
                y = Math.random() * borderSize - borderSize; // -borderSize to -borderSize/2
                break;
              case 1: // Right border
                x = Math.random() * borderSize + app.screen.width; // screen.width to screen.width + borderSize
                y = Math.random() * (app.screen.height + 2 * borderSize) - borderSize;
                break;
              case 2: // Bottom border
                x = Math.random() * (app.screen.width + 2 * borderSize) - borderSize;
                y = Math.random() * borderSize + app.screen.height; // screen.height to screen.height + borderSize
                break;
              default: // Left border
                x = Math.random() * borderSize - borderSize; // -borderSize to 0
                y = Math.random() * (app.screen.height + 2 * borderSize) - borderSize;
                break;
            }
          } else {
            // Initial spawn anywhere in extended region
            x = Math.random() * (app.screen.width + 2 * borderSize) - borderSize;
            y = Math.random() * (app.screen.height + 2 * borderSize) - borderSize;
          }

          // Calculate radius and angle from top-left corner (0,0)
          const radius = Math.sqrt(x * x + y * y);
          const angle = Math.atan2(y, x);

          graphics.x = x;
          graphics.y = y;
          
          // Set initial rotation so the star's edge is tangential to its circular path
          // For a square, we want the edge perpendicular to the radius vector
          // The tangential direction is perpendicular to the radial direction
          const tangentialAngle = angle + Math.PI / 2; // Add 90 degrees (π/2 radians)
          graphics.rotation = tangentialAngle;
          
          const star: Star = {
            graphics, x, y, size, color, radius, angle,
            ageMS: 0,
            ttlMS: randRange(TTL_MIN_MS, TTL_MAX_MS),
          };
          noteAdd(radius);
          return star;
        };


        // Initialize stars
        for (let i = 0; i < numStars; i++) {
          const star = createStar();
          stars.push(star);
          starContainer.addChild(star.graphics);
        }

        // Load planet frames and initialize planets
        await loadPlanetFrames();

        const planets: Planet[] = [];
        const NUM_PLANETS = 1000;

        // Create planets following the same methodology as stars
        for (let i = 0; i < NUM_PLANETS; i++) {
          const planet = createPlanet(app);
          if (planet) {
            // attach TTL fields (since createPlanet is module-scoped)
            (planet as any).ageMS = 0;
            (planet as any).ttlMS = randRange(TTL_MIN_MS, TTL_MAX_MS);
            planets.push(planet);
            planetContainer.addChild(planet.sprite);
            noteAdd(planet.radius);
          }
        }

        // Animation and recycling loop with proper Pixi v8 ticker signature
        const animateRef = { current: (ticker: any) => {
          if (!mountedRef.current || !starContainer) return;
          
          // Elapsed real time this tick (ms). Limit step size for smooth motion.
          const deltaMS = ticker?.deltaMS ?? 16.67;
          // Limit only very large pauses; still honor most real time so speed stays ~1.8°/s
          const clampedDeltaMS = Math.min(deltaMS, 100);
          const step = ANGULAR_SPEED_RAD_PER_MS * clampedDeltaMS;
          
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            
            // Update angle using time-based step
            star.angle += step;
            
            // Calculate new position based on circular motion
            const newX = star.radius * Math.cos(star.angle);
            const newY = star.radius * Math.sin(star.angle);
            
            // Update star position
            star.graphics.x = newX;
            star.graphics.y = newY;
            star.x = newX;
            star.y = newY;
            
            // Rotate the star around its own center at the same time-based rate
            star.graphics.rotation += step;

            // --- TTL update ---
            star.ageMS += deltaMS;
            if (star.ageMS > star.ttlMS) {
              star.graphics.alpha -= FADE_RATE_PER_SEC * (deltaMS / 1000);
              if (star.graphics.alpha <= 0) {
                // recycle like the extended-region path
                noteRemove(star.radius);
                starContainer.removeChild(star.graphics);
                star.graphics.destroy();
                stars.splice(i, 1);

                const newRadius = sampleRadiusBalanced();
                const newStar = createStar(true);
                const theta = (() => {
                  for (let tries = 0; tries < 64; tries++) {
                    const t = Math.random() * Math.PI * 2;
                    const nx = newRadius * Math.cos(t);
                    const ny = newRadius * Math.sin(t);
                    const insideExt = nx >= -borderSize && nx <= app.screen.width + borderSize && ny >= -borderSize && ny <= app.screen.height + borderSize;
                    const offscreen = nx < 0 || nx > app.screen.width || ny < 0 || ny > app.screen.height;
                    if (insideExt && offscreen) return t;
                  }
                  return (5 * Math.PI) / 4;
                })();
                const nx = newRadius * Math.cos(theta);
                const ny = newRadius * Math.sin(theta);
                newStar.graphics.x = nx;
                newStar.graphics.y = ny;
                newStar.x = nx;
                newStar.y = ny;
                newStar.radius = newRadius;
                newStar.angle = theta;
                newStar.ageMS = 0;
                newStar.ttlMS = randRange(TTL_MIN_MS, TTL_MAX_MS);
                newStar.graphics.alpha = 1;
                newStar.graphics.rotation = theta + Math.PI / 2;
                noteAdd(newRadius);
                stars.push(newStar);
                starContainer.addChild(newStar.graphics);
              }
            }
          }
          
          // Animate planets using clamped delta time
          animatePlanets(planets, app, clampedDeltaMS);
          
          // Check for stars that have left the extended region and recycle them
          let recycleBudget = 200; // safety cap per frame
          for (let i = stars.length - 1; i >= 0; i--) {
            if (recycleBudget-- <= 0) break;
            const star = stars[i];
            
            // Check if star is outside the extended region using current position
            if (star.x < -borderSize || 
                star.x > app.screen.width + borderSize ||
                star.y < -borderSize || 
                star.y > app.screen.height + borderSize) {
              
              // Remove old star (decrement counts)
              noteRemove(star.radius);
              starContainer.removeChild(star.graphics);
              star.graphics.destroy();
              stars.splice(i, 1);

              // Respawn using radial balancer
              const newRadius = sampleRadiusBalanced();
              const newStar = createStar(true);
              // place on the circle at an off-screen angle inside extended region
              {
                const theta = (() => {
                  // prefer top/left for consistency with planets, but any offscreen strip is fine
                  for (let tries = 0; tries < 64; tries++) {
                    const t = Math.random() * Math.PI * 2;
                    const nx = newRadius * Math.cos(t);
                    const ny = newRadius * Math.sin(t);
                    const insideExt = nx >= -borderSize && nx <= app.screen.width + borderSize && ny >= -borderSize && ny <= app.screen.height + borderSize;
                    const offscreen = nx < 0 || nx > app.screen.width || ny < 0 || ny > app.screen.height;
                    if (insideExt && offscreen) return t;
                  }
                  return (5 * Math.PI) / 4; // fallback
                })();
                const nx = newRadius * Math.cos(theta);
                const ny = newRadius * Math.sin(theta);
                newStar.graphics.x = nx;
                newStar.graphics.y = ny;
                newStar.x = nx;
                newStar.y = ny;
                newStar.radius = newRadius;
                newStar.angle = theta;
                newStar.ageMS = 0;
                newStar.ttlMS = randRange(TTL_MIN_MS, TTL_MAX_MS);
                newStar.graphics.alpha = 1;
                newStar.graphics.rotation = theta + Math.PI / 2;
              }
              noteAdd(newRadius);
              stars.push(newStar);
              starContainer.addChild(newStar.graphics);
            }
          }
          
          // Check for planets that have left the extended region and recycle them
          for (let i = planets.length - 1; i >= 0; i--) {
            if (recycleBudget-- <= 0) break;
            const planet = planets[i];
            
            // Check if planet is outside the extended region using current position
            // Delete planets when they exit the lower-right section (same as stars)
            if (planet.sprite.x < -borderSize || 
                planet.sprite.x > app.screen.width + borderSize ||
                planet.sprite.y < -borderSize || 
                planet.sprite.y > app.screen.height + borderSize) {
              
              // Remove old planet (decrement counts)
              noteRemove(planet.radius);
              planetContainer.removeChild(planet.sprite);
              planet.sprite.destroy();
              planets.splice(i, 1);

              // Respawn using radial balancer
              const newRadius = sampleRadiusBalanced();
              const newPlanet = createPlanet(app, true);
              if (newPlanet) {
                const theta = (() => {
                  for (let tries = 0; tries < 64; tries++) {
                    const t = Math.random() * Math.PI * 2;
                    const nx = newRadius * Math.cos(t);
                    const ny = newRadius * Math.sin(t);
                    const insideExt = nx >= -borderSize && nx <= app.screen.width + borderSize && ny >= -borderSize && ny <= app.screen.height + borderSize;
                    const offscreen = nx < 0 || nx > app.screen.width || ny < 0 || ny > app.screen.height;
                    // for planets, prefer top/left strips
                    if (insideExt && offscreen && (nx < 0 || ny < 0)) return t;
                  }
                  return (5 * Math.PI) / 4; // fallback
                })();
                const nx = newRadius * Math.cos(theta);
                const ny = newRadius * Math.sin(theta);
                newPlanet.sprite.x = nx;
                newPlanet.sprite.y = ny;
                newPlanet.radius = newRadius;
                newPlanet.angle = theta;
                (newPlanet as any).ageMS = 0;
                (newPlanet as any).ttlMS = randRange(TTL_MIN_MS, TTL_MAX_MS);
                newPlanet.sprite.alpha = 1;
                // keep your existing orientation rule (top-left corner points to origin)
                newPlanet.sprite.rotation = theta - (3 * Math.PI) / 4;
                noteAdd(newRadius);
                planets.push(newPlanet);
                planetContainer.addChild(newPlanet.sprite);
              }
            }
          }

          // TTL for planets (fade-out & recycle via balancer)
          for (let i = planets.length - 1; i >= 0; i--) {
            const p = planets[i];
            (p as any).ageMS = ((p as any).ageMS ?? 0) + deltaMS;
            if ((p as any).ageMS > (p as any).ttlMS) {
              p.sprite.alpha -= FADE_RATE_PER_SEC * (deltaMS / 1000);
              if (p.sprite.alpha <= 0) {
                noteRemove(p.radius);
                planetContainer.removeChild(p.sprite);
                p.sprite.destroy();
                planets.splice(i, 1);

                const newRadius = sampleRadiusBalanced();
                const newPlanet = createPlanet(app, true);
                if (newPlanet) {
                  const theta = (() => {
                    for (let tries = 0; tries < 64; tries++) {
                      const t = Math.random() * Math.PI * 2;
                      const nx = newRadius * Math.cos(t);
                      const ny = newRadius * Math.sin(t);
                      const insideExt = nx >= -borderSize && nx <= app.screen.width + borderSize && ny >= -borderSize && ny <= app.screen.height + borderSize;
                      const offscreen = nx < 0 || nx > app.screen.width || ny < 0 || ny > app.screen.height;
                      if (insideExt && offscreen && (nx < 0 || ny < 0)) return t; // prefer top/left
                    }
                    return (5 * Math.PI) / 4;
                  })();
                  const nx = newRadius * Math.cos(theta);
                  const ny = newRadius * Math.sin(theta);
                  newPlanet.sprite.x = nx;
                  newPlanet.sprite.y = ny;
                  newPlanet.radius = newRadius;
                  newPlanet.angle = theta;
                  (newPlanet as any).ageMS = 0;
                  (newPlanet as any).ttlMS = randRange(TTL_MIN_MS, TTL_MAX_MS);
                  newPlanet.sprite.alpha = 1;
                  newPlanet.sprite.rotation = theta - (3 * Math.PI) / 4;
                  noteAdd(newRadius);
                  planets.push(newPlanet);
                  planetContainer.addChild(newPlanet.sprite);
                }
              }
            }
          }
        }};

        app.ticker.add(animateRef.current);

        // Handle window resize
        const handleResize = () => {
          if (app && mountedRef.current) {
            app.renderer.resize(window.innerWidth, window.innerHeight);
          }
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
