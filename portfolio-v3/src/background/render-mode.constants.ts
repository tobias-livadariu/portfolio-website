import type { BackgroundMode } from "./background-mode-core";

export interface RenderModeOption {
  label: string;
  mode: BackgroundMode;
  /** Terminal sigil shown before the label, matching the shell theme. */
  sigil: string;
}

export const RENDER_MODE_OPTIONS: readonly RenderModeOption[] = [
  { label: "DEEP", mode: "3d", sigil: "$" },
  { label: "FLAT", mode: "2d", sigil: "#" },
  { label: "CHAR", mode: "ascii", sigil: "@" },
];
