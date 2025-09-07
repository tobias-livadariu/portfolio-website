import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics, Assets, Spritesheet, AnimatedSprite, Texture } from "pixi.js";

// Constant: 1.8 degrees per second, expressed as radians per millisecond
const ANGULAR_SPEED_RAD_PER_MS = (1.8 * Math.PI / 180) / 1000;

// Enclosing circle margin so all radii stay <= R_MAX
const R_MAX_MARGIN = 500;

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
  // Conservative maximum rightward extent from the star's transform origin
  // (Graphics pivots at top-left). Used for left-exit culling.
  rightExtent: number;
  // Conservative maximum upward extent from the star's transform origin
  // Used for bottom-exit culling.
  topExtent: number;
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

function createPlanet(app: Application): Planet | null {
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

  // Initial placement: uniform-area polar sampling in [rMin, R_MAX]
  const R_MAX = getRMax(app);
  const rMin = Math.max(PLANET_EXCLUSION_RADIUS + 1, 1);
  const { r, theta } = samplePolar(rMin, R_MAX);
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);

  // If initially inside (or touching) the viewport, make it visible immediately
  const insideX = x > -halfDiag && x < app.screen.width + halfDiag;
  const insideY = y > -halfDiag && y < app.screen.height + halfDiag;
  if (insideX && insideY) sprite.alpha = 1;

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
  return { sprite, type, variant: variantIndex + 1, radius, angle, speed, boundRadius: halfDiag };
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

        // No radius jitter needed without recycling (keep helpers if used elsewhere)



        const colors = [0xffffff, 0xa8a8b3, 0x7d7d87, 0x6c6f7a, 0x5a6a85];
        const stars: Star[] = [];

        // Helper function to create a star sampled uniformly inside enclosing circle
        const createStar = (): Star => {
          const size = Math.random() * 2 + 1;
          const color = colors[Math.floor(Math.random() * colors.length)];
          
          const graphics = new Graphics();
          graphics.rect(0, 0, size, size);
          graphics.fill(color);

          // Initial spawn anywhere inside the enclosing circle (uniform-area)
          const R_MAX = getRMax(app);
          const { r, theta } = samplePolar(0, R_MAX);
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);

          graphics.x = x;
          graphics.y = y;
          
          // Set initial rotation so the star's edge is tangential to its circular path
          // For a square, we want the edge perpendicular to the radius vector
          // The tangential direction is perpendicular to the radial direction
          const tangentialAngle = theta + Math.PI / 2; // Add 90 degrees (π/2 radians)
          graphics.rotation = tangentialAngle;
          
          // Worst-case rightward extent from transform origin (top-left pivot)
          const rightExtent = size * Math.SQRT2;
          // Worst-case upward extent from transform origin (top-left pivot)
          const topExtent = size * Math.SQRT2;
          // No TTL needed without deletions
          return { graphics, x, y, size, color, radius: r, angle: theta, rightExtent, topExtent };
        };

        // Recycling helpers no longer needed (no deletions)

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
            planets.push(planet);
            planetContainer.addChild(planet.sprite);
          }
        }

        // Animation loop with proper Pixi v8 ticker signature (no recycling)
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

            // No TTL updates needed without deletions
          }
          
          // Animate planets using clamped delta time
          animatePlanets(planets, app, clampedDeltaMS);
          
          // No culling / recycling — objects persist forever
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
