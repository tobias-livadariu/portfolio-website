import type {
  GitStateToken,
  ModalSectionDefinition,
  ModalSectionKey,
} from "./modal.types";

export const MODAL_SECTIONS = [
  { key: "about", label: "ABOUT", shortLabel: "about" },
  { key: "resume", label: "RESUME", shortLabel: "resume" },
  { key: "portfolio", label: "PORTFOLIO", shortLabel: "portfolio" },
  { key: "contactMe", label: "CONTACT ME", shortLabel: "contact" },
] as const satisfies readonly ModalSectionDefinition[];

export const MODAL_SECTION_KEYS = MODAL_SECTIONS.map(({ key }) => key);

export const MODAL_NAVIGATION = {
  homeOpenThresholdPx: 520,
  panelSwitchThresholdPx: 430,
  touchSwitchThresholdPx: 150,
  maxWheelDeltaPx: 96,
  maxTouchDeltaPx: 72,
  minWheelEventsBeforeCommit: 3,
  boundaryGateMs: 420,
  maxDragPx: 132,
  bottomBouncePx: 68,
  releaseDelayMs: 180,
  gestureQuietMs: 520,
  inertiaQuietMs: 220,
  openAnimationMs: 460,
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

export const MODAL_ASSETS = [
  "/rotating-planet-spritesheets/black-hole/black-hole-1.json",
  "/rotating-planet-spritesheets/black-hole/black-hole-1.png",
  "/rotating-planet-spritesheets/star/star-1.json",
  "/rotating-planet-spritesheets/star/star-1.png",
  "/rotating-planet-spritesheets/islands/islands-1.json",
  "/rotating-planet-spritesheets/islands/islands-1.png",
  "/rotating-planet-spritesheets/no-atmosphere/no-atmosphere-1.json",
  "/rotating-planet-spritesheets/no-atmosphere/no-atmosphere-1.png",
  "/images/me.png",
] as const;

export function getModalIndex(section: ModalSectionKey | null) {
  return section === null ? -1 : MODAL_SECTION_KEYS.indexOf(section);
}
