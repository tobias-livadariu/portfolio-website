import { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics, Assets, Spritesheet, AnimatedSprite, Texture, Ticker } from "pixi.js";

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
}

// Map type -> [ variation0Frames[], variation1Frames[], ... ]
const planetFrames = new Map<PlanetType, Texture[][]>();

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

function screenCenter(app: Application) {
  return { cx: app.screen.width / 2, cy: app.screen.height / 2 };
}

function createPlanet(app: Application, ensureVisible = false, activeTypes: Set<PlanetType>): Planet | null {
  // uniqueness: pick a type not yet active
  const candidates = Array.from(planetFrames.keys()).filter(t => !activeTypes.has(t));
  if (candidates.length === 0) return null;
  const type = candidates[(Math.random() * candidates.length) | 0];

  const variations = planetFrames.get(type);
  if (!variations || variations.length === 0) return null;

  const variantIndex = (Math.random() * variations.length) | 0; // 0..4
  const frames = variations[variantIndex];

  const sprite = new AnimatedSprite(frames);
  sprite.anchor.set(0.5);
  sprite.animationSpeed = 5 / 60; // 5 FPS
  sprite.play();

  // placement
  const border = 1000; // extended region, consistent with stars logic
  let x: number, y: number;
  if (ensureVisible) {
    const { cx, cy } = screenCenter(app);
    const spread = 200;
    x = cx + (Math.random() - 0.5) * spread * 2;
    y = cy + (Math.random() - 0.5) * spread * 2;
  } else {
    const w = app.screen.width, h = app.screen.height;
    const minDist = 300; // exclusion around origin
    let tries = 0;
    do {
      x = Math.random() * (w + 2 * border) - border;
      y = Math.random() * (h + 2 * border) - border;
      tries++;
    } while (Math.hypot(x, y) < minDist && tries < 50);
  }

  const radius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  const speed = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 0.0009 + 0.00025);

  sprite.x = x; sprite.y = y; // initial position

  return { sprite, type, variant: variantIndex + 1, radius, angle, speed };
}

// ensure the ticker callback matches v8: (ticker: Ticker) => void
function animatePlanets(ticker: Ticker, planets: Planet[]) {
  const dt = ticker.deltaTime; // ~1 at 60fps
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    p.angle += p.speed * dt;
    p.sprite.x = p.radius * Math.cos(p.angle);
    p.sprite.y = p.radius * Math.sin(p.angle);
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
          
          return { graphics, x, y, size, color, radius, angle };
        };

        // Initialize stars
        for (let i = 0; i < numStars; i++) {
          const star = createStar();
          stars.push(star);
          starContainer.addChild(star.graphics);
        }

        // Load planet frames and initialize planets
        await loadPlanetFrames();

        const activeTypes = new Set<PlanetType>();
        const planets: Planet[] = [];
        const NUM_PLANETS = 6;

        const p0 = createPlanet(app, true, activeTypes);
        if (p0) {
          activeTypes.add(p0.type);
          planets.push(p0);
          planetContainer.addChild(p0.sprite);
        }

        while (planets.length < NUM_PLANETS) {
          const p = createPlanet(app, false, activeTypes);
          if (!p) break;
          activeTypes.add(p.type);
          planets.push(p);
          planetContainer.addChild(p.sprite);
        }

        // Animation and recycling loop with proper Pixi v8 ticker signature
        const animateRef = { current: (ticker: Ticker) => {
          if (!mountedRef.current || !starContainer) return;
          
          // Move each star in circular motion around top-left corner (0,0)
          // 1.8 degrees per second = 1.8 * (Math.PI / 180) radians per second
          const angularSpeed = 1.8 * (Math.PI / 180) / 60; // Convert to radians per frame (assuming 60fps)
          
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            
            // Update angle
            star.angle += angularSpeed;
            
            // Calculate new position based on circular motion
            const newX = star.radius * Math.cos(star.angle);
            const newY = star.radius * Math.sin(star.angle);
            
            // Update star position
            star.graphics.x = newX;
            star.graphics.y = newY;
            star.x = newX;
            star.y = newY;
            
            // Rotate the star around its own center at the same rate
            star.graphics.rotation += angularSpeed;
          }
          
          // Animate planets using the new function
          animatePlanets(ticker, planets);
          
          // Check for stars that have left the extended region and recycle them
          for (let i = stars.length - 1; i >= 0; i--) {
            const star = stars[i];
            
            // Check if star is outside the extended region using current position
            if (star.x < -borderSize || 
                star.x > app.screen.width + borderSize ||
                star.y < -borderSize || 
                star.y > app.screen.height + borderSize) {
              
              // Remove old star
              starContainer.removeChild(star.graphics);
              star.graphics.destroy();
              stars.splice(i, 1);
              
              // Create new star in border region
              const newStar = createStar(true);
              stars.push(newStar);
              starContainer.addChild(newStar.graphics);
            }
          }
          
          // Check for planets that have left the extended region and recycle them
          for (let i = planets.length - 1; i >= 0; i--) {
            const planet = planets[i];
            
            // Check if planet is outside the extended region using current position
            if (planet.sprite.x < -borderSize || 
                planet.sprite.x > app.screen.width + borderSize ||
                planet.sprite.y < -borderSize || 
                planet.sprite.y > app.screen.height + borderSize) {
              
              // Remove old planet
              planetContainer.removeChild(planet.sprite);
              planet.sprite.destroy();
              activeTypes.delete(planet.type);
              planets.splice(i, 1);
              
              // Create new planet in border region
              const newPlanet = createPlanet(app, false, activeTypes);
              if (newPlanet) {
                activeTypes.add(newPlanet.type);
                planets.push(newPlanet);
                planetContainer.addChild(newPlanet.sprite);
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
