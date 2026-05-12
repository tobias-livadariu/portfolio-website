import { COLOR_PALETTE_STR } from "../../theme/colors";

export const TITLE_TEXT = {
  intro: "Hey, I'm",
  firstName: "Tobias",
  lastName: "Livadariu",
} as const;

export const NAV_ITEMS = [
  { key: "about", label: "About" },
  { key: "resume", label: "Resume" },
  { key: "portfolio", label: "Portfolio" },
  { key: "contactMe", label: "Contact Me" },
] as const;

export const LAYOUT = {
  z: 0,
  mainMenuRotation: [0, -0.22, 0],
  marginX: 0.28,
  marginY: 0.42,
  introOffset: [0, 0, 0],
  firstNameOffset: [0, -0.2, 0],
  lastNameOffset: [0, -0.43, 0],
  upperSeparatorStartOffset: [0, -0.68, 0],
  upperSeparatorEndOffset: [1.78, -0.68, 0],
  navItemOffsets: [
    [0, -0.82, 0],
    [0, -1.04, 0],
    [0, -1.26, 0],
    [0, -1.48, 0],
  ],
  lowerSeparatorStartOffset: [0, -1.72, 0],
  lowerSeparatorEndOffset: [1.78, -1.72, 0],
  separatorSegmentSize: [0.018, 0.018, 0.045],
  separatorSegmentCount: 48,
  navArrowOffsetX: 0.08,
  navTextOffsetX: 0.22,
  navRightArrowOffsetX: 1.52,
} as const;

export const RESPONSIVE_SCALE = {
  referenceWidth: 1440,
  min: 0.54,
  max: 1,
} as const;

export const TEXT_GEOMETRY = {
  introSize: 0.095,
  nameSize: 0.135,
  navItemSize: 0.12,
  height: 0.045,
  bevelSize: 0.002,
  bevelThickness: 0.003,
} as const;

export const ARROW_GEOMETRY = {
  blockSize: 0.045,
  depth: 0.045,
  color: COLOR_PALETTE_STR.campfireAsh,
  emissiveIntensity: 0.2,
} as const;

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
