import type { BackgroundMode } from "./background-mode-core";

export interface RenderModeOption {
  /** One-word expansion of the label, shown where there is room for it. */
  blurb: string;
  label: string;
  mode: BackgroundMode;
  /** Terminal sigil shown before the label, matching the shell theme. */
  sigil: string;
}

export const RENDER_MODE_OPTIONS: readonly RenderModeOption[] = [
  { blurb: "volumetric", label: "DEEP", mode: "3d", sigil: "$" },
  { blurb: "orthographic", label: "FLAT", mode: "2d", sigil: "#" },
  { blurb: "character", label: "CHAR", mode: "ascii", sigil: "@" },
];
