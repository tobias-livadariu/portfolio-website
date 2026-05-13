import { COLOR_PALETTE_STR } from "../../theme/colors";

// Copy shown in the stacked title above the navigation menu.
export const TITLE_TEXT = {
  intro: "Hey, I'm",
  firstName: "Tobias",
  lastName: "Livadariu",
} as const;

// Navigation entries rendered in order. The key is the stable programmatic id;
// the label is the visible text in the 3D menu.
export const NAV_ITEMS = [
  { key: "about", label: "About" },
  { key: "resume", label: "Resume" },
  { key: "portfolio", label: "Portfolio" },
  { key: "contactMe", label: "Contact Me" },
] as const;

// Horizontal bounds for the separator rows. Keeping this separate from vertical
// spacing means you can widen/narrow the menu without touching row positions.
const LAYOUT_WIDTH = {
  leftX: 0,
  rightX: 1.78,
  centerX: 0.89,
} as const;

// Geometry and material values for the block-built nav arrows. columnCount must
// match the arrow pattern width in BlockyArrow so offsets use the visual center.
export const ARROW_GEOMETRY = {
  blockSize: 0.018,
  columnCount: 8,
  depth: 0.045,
  leftArrowMargin: 0.0635,
  rightArrowMargin: 0.042,
  color: COLOR_PALETTE_STR.campfireAsh,
  emissiveIntensity: 0.2,
} as const;

// Shared material settings for title and nav text. The front material is the
// brighter face color; the side material is darker/emissive so extrusion reads
// as dimensional instead of flat.
export const TEXT_MATERIAL = {
  frontColor: COLOR_PALETTE_STR.campfire,
  frontEmissive: COLOR_PALETTE_STR.campfire,
  frontEmissiveIntensity: 0.34,
  frontRoughness: 0.9,
  sideColor: COLOR_PALETTE_STR.campfireDark,
  sideEmissive: COLOR_PALETTE_STR.campfireDark,
  sideEmissiveIntensity: 0.8,
  sideRoughness: 0.95,
  metalness: 0,
} as const;

// Geometry dimensions for all 3D text meshes. Size controls glyph height in
// world units, height controls extrusion depth, and bevel values create the
// small blocky side highlight without rounding the pixel forms too much.
export const TEXT_GEOMETRY = {
  introSize: 0.11,
  nameSize: 0.135,
  navItemSize: 0.12,
  height: 0.045,
  bevelSize: 0.002,
  bevelThickness: 0.003,
} as const;

// Vertical spacing model for the menu. Each value is the downward distance from
// one element's center line to the next element's center line. Adjusting one gap
// automatically pushes every following offset down/up when LAYOUT is computed.
const LAYOUT_MARGINS = {
  introToFirstName: 0.232,
  firstNameToLastName: 0.21,
  lastNameToUpperSeparator: 0.0775,
  upperSeparatorToFirstNavItem: 0.163,
  navItemGap: 0.195,
  lastNavItemToLowerSeparator: 0.163,
} as const;

// Stable animation indices for every vertically stacked menu element. These are
// used by the animation hook to decide how many spring-like gaps are above an
// element and therefore how much accumulated Y movement that element receives.
export const MENU_ELEMENT_INDEX = {
  intro: 0,
  firstName: 1,
  lastName: 2,
  upperSeparator: 3,
  about: 4,
  resume: 5,
  portfolio: 6,
  contactMe: 7,
  lowerSeparator: 8,
} as const;

// Periodic idle animation for the menu. The math uses a sine wave, which is the
// idealized motion of a Hooke's-law spring: it starts slow, speeds up around the
// middle, slows at the far end, and repeats smoothly. The static LAYOUT values
// remain the resting pose; these values only add motion around that pose.
export const MENU_ANIMATION = {
  // Master switch for the menu idle motion. Set false when tuning the resting
  // layout so the animated offsets do not influence what you see.
  enabled: true,
  // Seconds for one full out-and-back oscillation. Larger values feel slower
  // and heavier; smaller values feel more energetic.
  periodSeconds: 6.8,
  // Radians in one full sine-wave cycle. This usually should not change; it is
  // exposed here so the oscillator math has no hidden numeric constants.
  fullTurnRadians: Math.PI * 2,
  // The normalized animation range used by clamp/easing math. These usually
  // stay 0 and 1 because they mean "not started" and "fully active".
  normalizedMin: 0,
  normalizedMax: 1,
  // Fades the animation in after page load so the first rendered pose is still
  // the exact static layout. Larger values make the motion appear more gently.
  startupFadeSeconds: 1.2,
  // Startup easing uses progress * progress * (a - b * progress). With a=3 and
  // b=2 it starts gently, reaches full strength smoothly, and avoids a sudden
  // jump when the idle motion first appears.
  startupEaseA: 3,
  startupEaseB: 2,
  // Delay added per gap as the vertical pull travels upward from the bottom.
  // Larger values create a more obvious accordion/tension wave; smaller values
  // make the stack move more like one rigid object.
  verticalPropagationDelaySeconds: 0.055,
  // Uniform vertical spacing multipliers. The first value scales the static
  // LAYOUT_MARGINS center-line gaps; the second value scales the animated
  // verticalMarginAmplitudes. Use this to preserve all ratios while changing
  // either the resting menu height or the accordion intensity.
  verticalMarginScales: [1.05, 1.25],
  // Maximum signed change for each center-line gap. Positive oscillator values
  // expand the gap; negative values compress it. These keys intentionally match
  // LAYOUT_MARGINS so each resting gap has a matching animated amplitude.
  verticalMarginAmplitudes: {
    introToFirstName: 0.008,
    firstNameToLastName: 0.008,
    lastNameToUpperSeparator: 0.01225,
    upperSeparatorToFirstNavItem: 0.015,
    navItem1ToNavItem2: 0.014,
    navItem2ToNavItem3: 0.014,
    navItem3ToNavItem4: 0.014,
    lastNavItemToLowerSeparator: 0.018,
  },
  // Added/subtracted from LAYOUT.mainMenuRotation[1]. This uses the same master
  // oscillator as the vertical motion, so the twist and accordion motion feel
  // like one hanging object rather than separate effects.
  rotationAmplitudeY: 0.035,
  // Extra Y movement for individual separator cubes. This sits on top of the
  // whole-separator vertical motion and creates the local wave through the dots.
  separatorWaveAmplitude: 0.012,
  // Total center-to-edge delay for separator dots. The middle dot has no extra
  // delay; the far left/right dots receive this full delay.
  separatorWavePropagationDelaySeconds: 0.16,
  // Progress value for the center of a dotted separator. Dots measure distance
  // from this point so the wave starts in the middle and travels outward.
  separatorWaveCenterProgress: 0.5,
} as const;

function nextY(currentY: number, margin: number) {
  return currentY - margin * MENU_ANIMATION.verticalMarginScales[0];
}

const introY = 0;
const firstNameY = nextY(introY, LAYOUT_MARGINS.introToFirstName);
const lastNameY = nextY(firstNameY, LAYOUT_MARGINS.firstNameToLastName);
const upperSeparatorY = nextY(
  lastNameY,
  LAYOUT_MARGINS.lastNameToUpperSeparator,
);
const firstNavItemY = nextY(
  upperSeparatorY,
  LAYOUT_MARGINS.upperSeparatorToFirstNavItem,
);
const secondNavItemY = nextY(firstNavItemY, LAYOUT_MARGINS.navItemGap);
const thirdNavItemY = nextY(secondNavItemY, LAYOUT_MARGINS.navItemGap);
const fourthNavItemY = nextY(thirdNavItemY, LAYOUT_MARGINS.navItemGap);
const lowerSeparatorY = nextY(
  fourthNavItemY,
  LAYOUT_MARGINS.lastNavItemToLowerSeparator,
);

// World-space layout for the complete 3D menu. These values are authored in the
// menu group's local coordinate system, then MainMenu anchors and scales the
// entire group relative to the camera's top-left visible plane.
export const LAYOUT = {
  // Depth plane where the menu lives. This is passed to useTopLeftPosition, so
  // changing it also changes the visible world size used for top-left anchoring.
  z: 0,
  // Base rotation for the whole menu. The negative Y value lets the extruded
  // text and boxes reveal their 3D sides instead of looking flat.
  mainMenuRotation: [0, -0.05, 0],
  // Top-left inset from the camera's visible bounds before responsive scaling.
  // Larger values push the menu farther down/right from the viewport edge.
  marginX: 0.12,
  marginY: 0.32,
  // Shared horizontal center line for title and nav text. Separators span from
  // x=0 to x=1.78, so 0.89 is the visual center of the menu column.
  contentCenterX: LAYOUT_WIDTH.centerX,
  // Title line origins. TitleText horizontally centers each Text3D mesh around
  // these x positions, so text length changes do not require manual offsets.
  introOffset: [LAYOUT_WIDTH.centerX, introY, 0],
  firstNameOffset: [LAYOUT_WIDTH.centerX, firstNameY, 0],
  lastNameOffset: [LAYOUT_WIDTH.centerX, lastNameY, 0],
  // Separator endpoints. The dotted-line component interpolates every dot's
  // center between these points, so all dot centers sit on one straight line.
  upperSeparatorStartOffset: [LAYOUT_WIDTH.leftX, upperSeparatorY, 0],
  upperSeparatorEndOffset: [LAYOUT_WIDTH.rightX, upperSeparatorY, 0],
  // Animation index used by the separator component to receive the same
  // accordion Y motion as the rest of the vertically stacked menu.
  upperSeparatorAnimationIndex: MENU_ELEMENT_INDEX.upperSeparator,
  // Row origins for the nav entries. Each row then measures its own text bounds
  // and positions arrows around that measured text.
  navItemOffsets: [
    [LAYOUT_WIDTH.leftX, firstNavItemY, 0],
    [LAYOUT_WIDTH.leftX, secondNavItemY, 0],
    [LAYOUT_WIDTH.leftX, thirdNavItemY, 0],
    [LAYOUT_WIDTH.leftX, fourthNavItemY, 0],
  ],
  lowerSeparatorStartOffset: [LAYOUT_WIDTH.leftX, lowerSeparatorY, 0],
  lowerSeparatorEndOffset: [LAYOUT_WIDTH.rightX, lowerSeparatorY, 0],
  lowerSeparatorAnimationIndex: MENU_ELEMENT_INDEX.lowerSeparator,
  // Smallest cube size at the far left and right ends of each separator.
  separatorMinSegmentSize: 0.007,
  // Largest cube size used through the middle plateau of each separator.
  separatorMaxSegmentSize: 0.018,
  // Number of cubes distributed between the start/end separator points.
  separatorSegmentCount: 48,
  // Fraction of the separator that stays at max size in the center. Increase it
  // for a longer constant middle section; decrease it for a longer taper.
  separatorPlateauRatio: 0.28,
  // Controls how quickly dots grow from the tiny edge size toward max size.
  // Lower than 1 means fast early growth that gently slows down; closer to 1 is
  // more linear and even; higher than 1 starts subtle and grows later.
  separatorGrowthPower: 0.42,
  // Horizontal center for nav labels. MenuText reports real Text3D bounds, and
  // NavItem places arrows around those measured bounds.
  navTextCenterX: LAYOUT_WIDTH.centerX,
} as const;

// Width-based scale for the whole menu group. At referenceWidth and above the
// menu uses full size; below that it shrinks by viewport ratio but never below
// min, which keeps it readable on narrow screens.
export const RESPONSIVE_SCALE = {
  referenceWidth: 1440,
  min: 0.54,
  max: 1,
} as const;
