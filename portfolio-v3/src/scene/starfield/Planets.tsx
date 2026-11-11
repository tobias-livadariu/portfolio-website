import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { Color, PlaneGeometry, Quaternion, Vector3 } from "three";
import { CAMERA_PROPS } from "../canvas.constants";
import getCameraFacingRotation from "../ui3d/utils/getCameraFacingRotation";
import {
  type PlanetType,
  type VolumetricPlanetTuning,
  type VolumetricStarfieldMode,
  type VolumetricStarfieldTuning,
} from "./starfield.constants";
import {
  clamp,
  createEntropySeed,
  createVisibleBounds,
  getCinematicOrbitalAngularSpeed,
  getFieldRadius,
  getOrbitCenter,
  getOrbitWellFieldDirection,
  getVisibleBoundsAtZForPosition,
  lerp,
  mulberry32,
  pickWeightedIndex,
  sampleNormal,
  solveKeplerEquation,
  type Vec3Tuple,
} from "./starfield.math";
import { getPlanetAtlasKeys, type PlanetAtlas } from "./planet-atlas";
import {
  ensurePlanetAtlasesLoading,
  subscribePlanetAtlases,
} from "./planet-atlas-cache";
import { useBackgroundMode } from "../../background/background-mode-core";

const FULL_TURN_RADIANS = Math.PI * 2;
const DEGREES_TO_RADIANS = Math.PI / 180;
const TAN_HALF_CAMERA_FOV = Math.tan((CAMERA_PROPS.fov * Math.PI) / 360);
/* Orbit shapes and satellite systems draw from their own generator, salted
   from the layout seed. The original generator still produces exactly the
   depths, wells, sizes, and sprites it always has, so a deterministic profile
   keeps its composition while gaining the new motion. */
const ORBIT_SHAPE_SEED_SALT = 0x9e3779b9;

const PLANET_ROTATION: Vec3Tuple = [0, 0, 0];
const PLANET_SESSION_SEEDS: Record<VolumetricStarfieldMode, number> = {
  "3d": createEntropySeed(),
  ascii: createEntropySeed(),
};

// Every planet sprite is a declaratively scaled 1x1 plane, so all 300 sprites
// can share a single geometry instance.
const PLANET_PLANE_GEOMETRY = new PlaneGeometry(1, 1);

function normalizeRadians(radians: number) {
  return (
    ((((radians + Math.PI) % FULL_TURN_RADIANS) + FULL_TURN_RADIANS) %
      FULL_TURN_RADIANS) -
    Math.PI
  );
}

function dampRadians(
  current: number,
  target: number,
  damping: number,
  deltaSeconds: number,
) {
  const delta = normalizeRadians(target - current);
  const progress = 1 - Math.exp(-damping * deltaSeconds);

  return normalizeRadians(current + delta * progress);
}

/* The classical orbital elements beyond size and timing. Together with the
   semi-major axis (`orbitRadiusRatio`) and mean motion (`angularSpeed`) these
   fix one Kepler orbit in three dimensions. */
interface PlanetOrbitShape {
  eccentricity: number;
  /* Signed tilt requested for the orbital plane. The frame layout flattens it
     as far as the depth limits require. */
  inclination: number;
  // Offset of the line of nodes from the well-to-screen-centre direction.
  nodeOffset: number;
  // Argument of periapsis at time zero.
  periapsis: number;
  // Turns the ellipse makes per orbit.
  precessionPerOrbit: number;
}

/* A body in a circular orbit around another planet instead of a well. */
interface PlanetSatellite {
  /* Gap between the host's body and this moon's edge at closest approach on
     screen, in host radii. */
  clearanceInHostRadii: number;
  // +1 or -1; every moon of a system circles the same way.
  direction: number;
  host: VirtualPlanet;
  // Reach of the host's solid body, as a fraction of half its sprite width.
  hostBodyRadius: number;
  phase: number;
  // Rotation of the tilted system on screen.
  positionAngle: number;
  // Period of an orbit one host radius out.
  referencePeriodSeconds: number;
  // Tilt of the system's plane away from face-on.
  tilt: number;
}

interface VirtualPlanet {
  // Mean anomaly at time zero.
  angle: number;
  // Mean motion: the orbit-averaged angular rate, signed by direction.
  angularSpeed: number;
  assetKey: string;
  frameRate: number;
  frameTimeOffset: number;
  id: number;
  // Semi-major axis as a fraction of the field radius.
  orbitRadiusRatio: number;
  orbitShape: PlanetOrbitShape;
  orbitWellIndex: number;
  planetType: PlanetType;
  satellite: PlanetSatellite | null;
  sizeScale: number;
  // Depth of the orbit's focus; a tilted orbit swings either side of it.
  z: number;
}

/* Hands a few small bodies to a larger host. Systems are coplanar and share
   one direction, as real moon systems do. */
function assignSatellites(
  planets: VirtualPlanet[],
  tuning: VolumetricPlanetTuning,
  random: () => number,
) {
  const systems = tuning.satellites;
  const hostBodyRadii: Partial<Record<PlanetType, number>> =
    systems.hostBodyRadius;
  const satelliteTypes: readonly PlanetType[] = systems.satelliteTypes;
  const candidates = planets.filter((planet) =>
    satelliteTypes.includes(planet.planetType),
  );

  for (const host of planets) {
    const hostBodyRadius = hostBodyRadii[host.planetType];
    if (hostBodyRadius === undefined) {
      continue;
    }

    // Drawn for every host so one host's outcome never shifts another's.
    const systemRoll = random();
    const countRoll = random();
    const direction = random() < 0.5 ? -1 : 1;
    const tilt =
      lerp(systems.tiltDegrees.min, systems.tiltDegrees.max, random()) *
      DEGREES_TO_RADIANS;
    const positionAngle = random() * FULL_TURN_RADIANS;
    const referencePeriodSeconds = lerp(
      systems.referencePeriodSeconds.min,
      systems.referencePeriodSeconds.max,
      random(),
    );

    if (systemRoll >= systems.systemProbability) {
      continue;
    }

    const satelliteCount = Math.min(
      candidates.length,
      1 + Math.floor(countRoll * systems.maximumSatellitesPerHost),
    );
    let clearanceInHostRadii = lerp(
      systems.innerClearanceInHostRadii.min,
      systems.innerClearanceInHostRadii.max,
      random(),
    );

    for (let index = 0; index < satelliteCount; index++) {
      const [satellite] = candidates.splice(
        Math.floor(random() * candidates.length),
        1,
      );

      satellite.sizeScale *= systems.sizeMultiplier;
      satellite.satellite = {
        clearanceInHostRadii,
        direction,
        host,
        hostBodyRadius,
        phase: random() * FULL_TURN_RADIANS,
        positionAngle,
        referencePeriodSeconds,
        tilt,
      };
      clearanceInHostRadii += lerp(
        systems.orbitSpacingInHostRadii.min,
        systems.orbitSpacingInHostRadii.max,
        random(),
      );
    }
  }
}

function createVirtualPlanets(
  mode: VolumetricStarfieldMode,
  fieldTuning: VolumetricStarfieldTuning,
): VirtualPlanet[] {
  const tuning = fieldTuning.planets;
  const seed = fieldTuning.useDeterministicLayout
    ? tuning.seed
    : PLANET_SESSION_SEEDS[mode];
  const random = mulberry32(seed);
  const shapeRandom = mulberry32((seed ^ ORBIT_SHAPE_SEED_SALT) >>> 0);
  const shape = tuning.orbitShape;
  const cometTypes: readonly PlanetType[] = shape.cometTypes;
  const atlasKeys = getPlanetAtlasKeys();

  const planets = Array.from({ length: tuning.virtualCount }, (_, index) => {
    const depthProgress = sampleNormal(
      random,
      tuning.depthDistribution.mean,
      tuning.depthDistribution.stdDev,
      tuning.depthDistribution.min,
      tuning.depthDistribution.max,
    );
    const baseAngularSpeed = sampleNormal(
      random,
      tuning.angularSpeedRadiansPerSecond.mean,
      tuning.angularSpeedRadiansPerSecond.stdDev,
      tuning.angularSpeedRadiansPerSecond.min,
      tuning.angularSpeedRadiansPerSecond.max,
    );
    const directionRandom = random();
    const angle = random() * Math.PI * 2;
    const assetKey = atlasKeys[Math.floor(random() * atlasKeys.length)];
    const frameRate = sampleNormal(
      random,
      tuning.frameRate.mean,
      tuning.frameRate.stdDev,
      tuning.frameRate.min,
      tuning.frameRate.max,
    );
    const frameTimeOffset = random() * 100;
    const orbitRadiusRatio =
      tuning.minOrbitRadiusRatio +
      Math.sqrt(random()) * (1 - tuning.minOrbitRadiusRatio);
    const orbitWellIndex = pickWeightedIndex(random, fieldTuning.orbitWells);
    const sizeScale = sampleNormal(
      random,
      tuning.sizeScale.mean,
      tuning.sizeScale.stdDev,
      tuning.sizeScale.min,
      tuning.sizeScale.max,
    );
    const z = lerp(
      tuning.depthBand.nearestZ,
      tuning.depthBand.farthestZ,
      depthProgress,
    );
    const planetType = assetKey.slice(
      0,
      assetKey.lastIndexOf("-"),
    ) as PlanetType;
    /* Every draw below happens for every planet, whichever branch uses it,
       so one planet's type never shifts the values of the planets after it. */
    const planetEccentricity = Math.abs(
      sampleNormal(
        shapeRandom,
        0,
        shape.eccentricityStdDev,
        -shape.maximumEccentricity,
        shape.maximumEccentricity,
      ),
    );
    const cometEccentricity = lerp(
      shape.cometEccentricity.min,
      shape.cometEccentricity.max,
      shapeRandom(),
    );
    const inclination = sampleNormal(
      shapeRandom,
      0,
      shape.inclinationStdDevDegrees * DEGREES_TO_RADIANS,
      -shape.maximumInclinationDegrees * DEGREES_TO_RADIANS,
      shape.maximumInclinationDegrees * DEGREES_TO_RADIANS,
    );
    const nodeOffset =
      (shapeRandom() * 2 - 1) * Math.PI * (1 - shape.nodeAlignment);
    const periapsis = shapeRandom() * FULL_TURN_RADIANS;
    const precessionPerOrbit = lerp(
      shape.apsidalPrecessionPerOrbit.min,
      shape.apsidalPrecessionPerOrbit.max,
      shapeRandom(),
    );
    const planet: VirtualPlanet = {
      angle,
      angularSpeed: getCinematicOrbitalAngularSpeed({
        baseAngularSpeed,
        cameraZ: CAMERA_PROPS.position[2],
        directionRandom,
        orbitRadiusRatio,
        orbitWell: fieldTuning.orbitWells[orbitWellIndex],
        tuning: tuning.orbitalMotion,
        z,
      }),
      assetKey,
      frameRate,
      frameTimeOffset,
      id: index,
      orbitRadiusRatio,
      orbitShape: {
        eccentricity: cometTypes.includes(planetType)
          ? cometEccentricity
          : planetEccentricity,
        inclination,
        nodeOffset,
        periapsis,
        precessionPerOrbit,
      },
      orbitWellIndex,
      planetType,
      satellite: null,
      sizeScale,
      z,
    };

    return planet;
  });

  assignSatellites(planets, tuning, shapeRandom);

  return planets;
}

interface PlanetSpriteProps {
  atlas: PlanetAtlas;
  // Colour of a planet beyond the far end of the distance haze.
  farColor: Color;
  fieldTuning: VolumetricStarfieldTuning;
  // The host's atlas, which sets how wide a satellite's orbit is.
  hostAtlas?: PlanetAtlas;
  // Colour of a planet nearer than the start of the distance haze.
  nearColor: Color;
  planet: VirtualPlanet;
  tuning: VolumetricPlanetTuning;
}

type PlanetFrameLayout = ReturnType<typeof createPlanetFrameLayout>;

function createPlanetFrameLayout(
  camera: Parameters<typeof getVisibleBoundsAtZForPosition>[0],
  size: { width: number; height: number },
  fieldTuning: VolumetricStarfieldTuning,
  planet: VirtualPlanet,
  visibilityBuffer: number,
) {
  const referenceBounds = createVisibleBounds();
  getVisibleBoundsAtZForPosition(
    camera,
    size,
    planet.z,
    CAMERA_PROPS.position,
    visibilityBuffer,
    referenceBounds,
  );
  const fieldRadius = getFieldRadius(
    referenceBounds,
    fieldTuning.bounds.fieldRadiusMultiplier,
  );
  const orbitCenter: Vec3Tuple = [0, 0, 0];
  getOrbitCenter(
    planet.orbitWellIndex,
    referenceBounds,
    fieldRadius,
    fieldTuning.orbitWells,
    orbitCenter,
  );

  const shape = fieldTuning.planets.orbitShape;
  const { eccentricity } = planet.orbitShape;
  const semiMajorAxis = planet.orbitRadiusRatio * fieldRadius;
  /* Flatten the requested tilt until the far end of the orbit, a(1 + e) from
     the focus, still sits inside the depth limits on both sides. */
  const depthRoom = Math.max(
    0,
    Math.min(
      shape.depthLimits.nearestZ - planet.z,
      planet.z - shape.depthLimits.farthestZ,
    ),
  );
  const maximumInclination = Math.asin(
    clamp(depthRoom / (semiMajorAxis * (1 + eccentricity)), 0, 1),
  );
  const inclination = clamp(
    planet.orbitShape.inclination,
    -maximumInclination,
    maximumInclination,
  );
  const nodeAngle =
    Math.atan2(
      CAMERA_PROPS.position[1] - orbitCenter[1],
      CAMERA_PROPS.position[0] - orbitCenter[0],
    ) + planet.orbitShape.nodeOffset;

  return {
    centerX: orbitCenter[0],
    centerY: orbitCenter[1],
    fieldRadius,
    inclinationCos: Math.cos(inclination),
    inclinationSin: Math.sin(inclination),
    nodeCos: Math.cos(nodeAngle),
    nodeSin: Math.sin(nodeAngle),
    referenceBounds,
    semiMajorAxis,
    semiMinorAxis: semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity),
  };
}

/* Where a planet is on its Kepler orbit at a given time.

   The mean anomaly advances uniformly; Kepler's equation turns it into the
   eccentric anomaly E, and the position in the orbital plane, measured from
   the focus, is (a(cos E - e), b sin E). That point is then rotated by the
   argument of periapsis, tilted by the inclination, and swung to the line of
   nodes — the standard Rz(node)·Rx(inclination)·Rz(periapsis) sequence. The
   out-of-plane term is what moves the planet in depth. */
function setOrbitPosition(
  planet: VirtualPlanet,
  layout: PlanetFrameLayout,
  elapsedSeconds: number,
  target: Vector3,
) {
  const { eccentricity, periapsis, precessionPerOrbit } = planet.orbitShape;
  const orbitTurnRadians = elapsedSeconds * planet.angularSpeed;
  const eccentricAnomaly = solveKeplerEquation(
    planet.angle + orbitTurnRadians,
    eccentricity,
  );
  const planeX =
    layout.semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const planeY = layout.semiMinorAxis * Math.sin(eccentricAnomaly);
  const periapsisAngle = periapsis + orbitTurnRadians * precessionPerOrbit;
  const periapsisCos = Math.cos(periapsisAngle);
  const periapsisSin = Math.sin(periapsisAngle);
  const alongNode = planeX * periapsisCos - planeY * periapsisSin;
  const acrossNode = planeX * periapsisSin + planeY * periapsisCos;
  const acrossNodeOnScreen = acrossNode * layout.inclinationCos;

  return target.set(
    layout.centerX +
      alongNode * layout.nodeCos -
      acrossNodeOnScreen * layout.nodeSin,
    layout.centerY +
      alongNode * layout.nodeSin +
      acrossNodeOnScreen * layout.nodeCos,
    planet.z + acrossNode * layout.inclinationSin,
  );
}

function PlanetSpriteInner({
  atlas,
  farColor,
  fieldTuning,
  hostAtlas,
  nearColor,
  planet,
  tuning,
}: PlanetSpriteProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const lastFrameIndexRef = useRef(-1);
  const spriteRotationRef = useRef<number | null>(null);
  const inverseFacingQuaternion = useMemo(() => new Quaternion(), []);
  const localLightDirection = useMemo(() => new Vector3(), []);
  const position = useMemo(() => new Vector3(), []);
  const worldLightDirection = useMemo(() => new Vector3(), []);
  const { camera, size } = useThree();
  /* Every clone needs independent UV offsets for sprite animation, but clones
     share the atlas Source and therefore one WebGLTexture. Do not dispose a
     clone on a render-mode swap: the module-level atlas cache intentionally
     keeps that shared GPU allocation alive for the page lifetime. */
  const texture = useMemo(() => atlas.texture.clone(), [atlas]);
  const planetWidth =
    atlas.frameWidth *
    tuning.pixelsToWorldUnit *
    planet.sizeScale *
    tuning.visualScale;
  const planetHeight =
    atlas.frameHeight *
    tuning.pixelsToWorldUnit *
    planet.sizeScale *
    tuning.visualScale;
  const planetRadius = Math.hypot(planetWidth, planetHeight) * 0.5;
  const { satellite } = planet;
  /* A satellite rides its host's orbit and adds its own small circle to it. */
  const orbitingBody = satellite?.host ?? planet;
  const frameLayout = useMemo(
    () =>
      createPlanetFrameLayout(
        camera,
        size,
        fieldTuning,
        orbitingBody,
        tuning.visibilityBuffer,
      ),
    [camera, fieldTuning, orbitingBody, size, tuning.visibilityBuffer],
  );
  const satelliteOrbit = useMemo(() => {
    if (!satellite || !hostAtlas) {
      return null;
    }

    const hostRadius =
      hostAtlas.frameWidth *
      tuning.pixelsToWorldUnit *
      satellite.host.sizeScale *
      tuning.visualScale *
      0.5;
    /* The tilted circle is seen as an ellipse. Its short half-axis is set so
       the moon's near edge stays clear of the host's body all the way round,
       which fixes the circle's true radius for the chosen tilt. */
    const closestApproach =
      hostRadius * (satellite.hostBodyRadius + satellite.clearanceInHostRadii) +
      planetWidth * 0.5;
    const radius = closestApproach / Math.cos(satellite.tilt);

    return {
      // Kepler's third law: period grows with radius^1.5.
      meanMotion:
        (satellite.direction * FULL_TURN_RADIANS) /
        (satellite.referencePeriodSeconds * Math.pow(radius / hostRadius, 1.5)),
      positionAngleCos: Math.cos(satellite.positionAngle),
      positionAngleSin: Math.sin(satellite.positionAngle),
      radius,
      tiltCos: Math.cos(satellite.tilt),
      tiltSin: Math.sin(satellite.tilt),
    };
  }, [
    hostAtlas,
    planetWidth,
    satellite,
    tuning.pixelsToWorldUnit,
    tuning.visualScale,
  ]);
  const viewportAspect = size.width / Math.max(1, size.height);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;

    if (!mesh || !material) {
      return;
    }

    const elapsedSeconds = clock.getElapsedTime();
    setOrbitPosition(orbitingBody, frameLayout, elapsedSeconds, position);

    if (satellite && satelliteOrbit) {
      const phase =
        satellite.phase + elapsedSeconds * satelliteOrbit.meanMotion;
      const alongOrbit = Math.cos(phase) * satelliteOrbit.radius;
      const acrossOrbit = Math.sin(phase) * satelliteOrbit.radius;
      const acrossOrbitOnScreen = acrossOrbit * satelliteOrbit.tiltCos;
      /* The moon's depth swing is applied along the line of sight: its place
         on screen stays exactly on the ellipse that clears the host, and it
         only grows and shrinks a little as it comes round. */
      const hostDistance = CAMERA_PROPS.position[2] - position.z;
      const depthOffset = acrossOrbit * satelliteOrbit.tiltSin;
      const distanceRatio = (hostDistance - depthOffset) / hostDistance;

      position.set(
        CAMERA_PROPS.position[0] +
          (position.x +
            alongOrbit * satelliteOrbit.positionAngleCos -
            acrossOrbitOnScreen * satelliteOrbit.positionAngleSin -
            CAMERA_PROPS.position[0]) *
            distanceRatio,
        CAMERA_PROPS.position[1] +
          (position.y +
            alongOrbit * satelliteOrbit.positionAngleSin +
            acrossOrbitOnScreen * satelliteOrbit.positionAngleCos -
            CAMERA_PROPS.position[1]) *
            distanceRatio,
        position.z + depthOffset,
      );
    }

    /* Depth now changes along the orbit, so the visible rectangle is derived
       from the planet's current distance instead of a fixed per-orbit one.
       The buffer keeps a planet drawn a little beyond the edge, so its first
       fade-in finishes before it comes into view. */
    const { x, y } = position;
    const visibleHalfHeight =
      (CAMERA_PROPS.position[2] - position.z) * TAN_HALF_CAMERA_FOV;
    const visibleHalfWidth = visibleHalfHeight * viewportAspect;
    const cullMargin = tuning.visibilityBuffer + planetRadius;
    const isVisible =
      visibleHalfHeight > 0 &&
      x >= camera.position.x - visibleHalfWidth - cullMargin &&
      x <= camera.position.x + visibleHalfWidth + cullMargin &&
      y >= camera.position.y - visibleHalfHeight - cullMargin &&
      y <= camera.position.y + visibleHalfHeight + cullMargin;

    mesh.visible = isVisible;
    if (!isVisible) {
      spriteRotationRef.current = null;
      return;
    }

    const frameIndex =
      Math.floor((elapsedSeconds + planet.frameTimeOffset) * planet.frameRate) %
      atlas.frames.length;
    if (frameIndex !== lastFrameIndexRef.current) {
      const frame = atlas.frames[frameIndex];
      texture.repeat.set(
        frame.w / atlas.textureWidth,
        frame.h / atlas.textureHeight,
      );
      texture.offset.set(
        frame.x / atlas.textureWidth,
        1 - (frame.y + frame.h) / atlas.textureHeight,
      );
      lastFrameIndexRef.current = frameIndex;
    }

    mesh.position.copy(position);

    getCameraFacingRotation(position, camera.position, PLANET_ROTATION);
    mesh.rotation.set(
      PLANET_ROTATION[0],
      PLANET_ROTATION[1],
      PLANET_ROTATION[2],
    );

    getOrbitWellFieldDirection(
      position,
      frameLayout.referenceBounds,
      frameLayout.fieldRadius,
      fieldTuning.orbitWells,
      worldLightDirection,
    );
    localLightDirection
      .copy(worldLightDirection)
      .applyQuaternion(inverseFacingQuaternion.copy(mesh.quaternion).invert());

    const targetSpriteRotation =
      Math.atan2(localLightDirection.y, localLightDirection.x) -
      tuning.rotation.illuminatedDirectionRadians;
    const spriteRotation =
      spriteRotationRef.current === null
        ? normalizeRadians(targetSpriteRotation)
        : dampRadians(
            spriteRotationRef.current,
            targetSpriteRotation,
            tuning.rotation.damping,
            delta,
          );

    spriteRotationRef.current = spriteRotation;
    mesh.rotateZ(spriteRotation);

    material.opacity = Math.min(
      tuning.maxOpacity,
      material.opacity + delta / tuning.fadeInSeconds,
    );
    material.color
      .copy(nearColor)
      .lerp(
        farColor,
        clamp(
          (position.z - tuning.depthShading.startZ) /
            (tuning.depthShading.endZ - tuning.depthShading.startZ),
          0,
          1,
        ),
      );
  });

  return (
    <mesh
      ref={meshRef}
      geometry={PLANET_PLANE_GEOMETRY}
      frustumCulled={false}
      renderOrder={1}
      scale={[planetWidth, planetHeight, 1]}
    >
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        alphaTest={0.02}
        color={tuning.tint}
        /* Planets are painted back to front over the finished star layer and
           never tested against it: a planet that swings deeper than the
           nearest stars would otherwise have those stars drawn on top of it. */
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const PlanetSprite = memo(PlanetSpriteInner);

const EMPTY_ATLAS_MAP: ReadonlyMap<string, PlanetAtlas> = new Map();

/* Session populations are sampled once, then retained across 2D detours and
   repeat 3D/ASCII transitions. Atlas textures remain in their existing shared
   cache; changing modes never starts another fetch or decode queue. */
const PLANET_POPULATION_CACHE = new Map<
  VolumetricStarfieldMode,
  VirtualPlanet[]
>();

function getVirtualPlanets(
  mode: VolumetricStarfieldMode,
  tuning: VolumetricStarfieldTuning,
) {
  const cached = PLANET_POPULATION_CACHE.get(mode);
  if (cached) {
    return cached;
  }

  const planets = createVirtualPlanets(mode, tuning);
  PLANET_POPULATION_CACHE.set(mode, planets);
  return planets;
}

export default function Planets({
  fieldTuning,
  mode,
}: {
  fieldTuning: VolumetricStarfieldTuning;
  mode: VolumetricStarfieldMode;
}) {
  const { isInitialRevealComplete } = useBackgroundMode();
  const tuning = fieldTuning.planets;
  const planets = useMemo(
    () => getVirtualPlanets(mode, fieldTuning),
    [fieldTuning, mode],
  );
  const [atlasMap, setAtlasMap] =
    useState<ReadonlyMap<string, PlanetAtlas>>(EMPTY_ATLAS_MAP);
  const nearColor = useMemo(() => new Color(tuning.tint), [tuning.tint]);
  const farColor = useMemo(
    () =>
      new Color(tuning.tint).multiply(new Color(tuning.depthShading.farTint)),
    [tuning.depthShading.farTint, tuning.tint],
  );

  useEffect(() => {
    /* Stars are sufficient to compose and reveal the first real background
       frame. Admit oversized atlas decode/upload work only after that reveal;
       planets already fade in progressively as each atlas is published. */
    if (!isInitialRevealComplete) {
      return;
    }

    ensurePlanetAtlasesLoading();

    return subscribePlanetAtlases((atlas) => {
      setAtlasMap((previous) => {
        if (previous.has(atlas.key)) {
          return previous;
        }

        const next = new Map(previous);
        next.set(atlas.key, atlas);
        return next;
      });
    });
  }, [isInitialRevealComplete]);

  return (
    <group>
      {planets.map((planet) => {
        const atlas = atlasMap.get(planet.assetKey);

        const hostAtlas = planet.satellite
          ? atlasMap.get(planet.satellite.host.assetKey)
          : undefined;

        /* A satellite waits for its host's sheet as well as its own, so it
           never circles a planet that has not been drawn yet. */
        if (!atlas || (planet.satellite && !hostAtlas)) {
          return null;
        }

        return (
          <PlanetSprite
            key={planet.id}
            atlas={atlas}
            farColor={farColor}
            fieldTuning={fieldTuning}
            hostAtlas={hostAtlas}
            nearColor={nearColor}
            planet={planet}
            tuning={tuning}
          />
        );
      })}
    </group>
  );
}
