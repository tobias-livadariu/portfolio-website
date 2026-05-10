import { COLOR_PALETTE_STR } from "../../../theme/colors";

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
  mainMenuRotation: [0, -0.07, 0],
  marginX: 0.12,
  marginY: 0.16,
  introOffset: [0, 0, 0],
  firstNameOffset: [0, -0.255, 0],
  lastNameOffset: [0, -0.57, 0],
  upperSeperatorStartOffset: [0, -0.885, 0],
  upperSeperatorEndOffset: [2.32, -0.885, 0],
  navItemOffsets: [
    [0, -0.925, 0],
    [0, -1.255, 0],
    [0, -1.585, 0],
    [0, -1.915, 0],
  ],
  lowerSeperatorStartOffset: [0, 2.245, 0],
  lowerSeperatorEndOffset: [2.32, 2.245, 0],
  seperatorSegmentSize: 0.01,
  seperatorSegmentCount: 116,
} as const;

export const TEXT_GEOMETRY = {
  introSize: 0.255,
  nameSize: 0.315,
  navItemSize: 0.33,
  height: 0.4,
  bevelSize: 0.002,
  bevelThickness: 0.003,
} as const;

export const TEXT_MATERIAL = {
  frontColor: COLOR_PALETTE_STR.campfire,
  frontEmissive: COLOR_PALETTE_STR.campfire,
  frontEmissiveIntensity: 0.28,
  frontRoughness: 0.88,
  sideColor: COLOR_PALETTE_STR.campfireDark,
  sideEmissive: COLOR_PALETTE_STR.black,
  sideEmissiveIntensity: 0,
  sideRoughness: 0.95,
} as const;
