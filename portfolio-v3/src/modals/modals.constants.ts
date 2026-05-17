import { ABOUT_SPRITE } from "./about/about.constants";
import { CONTACT_SPRITE } from "./contact/contact.constants";
import type {
  GitStateToken,
  ModalSectionDefinition,
  ModalSectionKey,
} from "./modal.types";
import { PORTFOLIO_SPRITE } from "./portfolio/portfolio.constants";
import { RESUME_SPRITE } from "./resume/resume.constants";

export const MODAL_SECTIONS = [
  { key: "about", label: "ABOUT", shortLabel: "about" },
  { key: "resume", label: "RESUME", shortLabel: "resume" },
  { key: "portfolio", label: "PORTFOLIO", shortLabel: "portfolio" },
  { key: "contactMe", label: "CONTACT ME", shortLabel: "contact" },
] as const satisfies readonly ModalSectionDefinition[];

export const MODAL_SECTION_KEYS = MODAL_SECTIONS.map(({ key }) => key);

export const MODAL_SCROLL = {
  homeOffsetVh: 0,
  sectionGapVh: 18,
  maxBackdropOpacity: 0.72,
  wheelOpenMultiplier: 1,
} as const;

export const DRAGON_LUCY = {
  bg: "#181616",
  bgDim: "#121111",
  bgAlt: "#1f1d1d",
  bgFloat: "#211f1f",
  bgHighlight: "#2a2626",
  bgVisual: "#393433",
  fg: "#c5c9c5",
  fgBright: "#dcd7ba",
  fgDim: "#a6a69c",
  comment: "#727169",
  border: "#2a2626",
  pink: "#fb7da7",
  mint: "#76c5a4",
  yellow: "#e3cf65",
  orange: "#fdad5d",
  lavender: "#af98e6",
  cyan: "#51c7da",
} as const;

export const GIT_STATE_LABELS: Record<GitStateToken, string> = {
  conflict: "!",
  deleted: "d",
  renamed: "r",
  modified: "m",
  stagedDeleted: "d",
  staged: "s",
  untracked: "u",
};

const MODAL_HEADER_SPRITES = [
  ABOUT_SPRITE,
  RESUME_SPRITE,
  PORTFOLIO_SPRITE,
  CONTACT_SPRITE,
] as const;

export const MODAL_ASSETS = [
  ...MODAL_HEADER_SPRITES.flatMap(({ imagePath, jsonPath }) => [
    jsonPath,
    imagePath,
  ]),
  "/images/me.png",
] as const;

export function getModalIndex(section: ModalSectionKey | null) {
  return section === null ? -1 : MODAL_SECTION_KEYS.indexOf(section);
}
