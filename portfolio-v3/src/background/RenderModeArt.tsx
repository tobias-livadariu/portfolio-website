import type { BackgroundMode } from "./background-mode-core";

/* Every mode previews the same ringed planet so the options read as one
   subject rendered three ways rather than three unrelated icons.

   These rows are a Lambert-shaded sphere quantised into glyphs drawn from the
   site's own ASCII ramp (" .,:;irsXA253hMHGS#9B&@"), lit from the upper left
   to match the modal artwork, with a schematic ring on the equator row. */
const ASCII_SPHERE_ROWS = [
  "    &&B9H    ",
  "  &@@&B9HAi  ",
  "-=BBB9#Hhsi=-",
  "  MHHMhXrii  ",
  "    iiiii    ",
] as const;

/**
 * Pure CSS/text artwork: no canvas, no images, and nothing that animates on
 * its own, so adding it beside the WebGL scene costs no per-frame work.
 */
export default function RenderModeArt({ mode }: { mode: BackgroundMode }) {
  if (mode === "ascii") {
    return (
      <span aria-hidden="true" className="rm-art rm-art-char">
        <span className="rm-art-glyphs">{ASCII_SPHERE_ROWS.join("\n")}</span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`rm-art ${mode === "3d" ? "rm-art-deep" : "rm-art-flat"}`}
    >
      <span className="rm-art-ring" />
      <span className="rm-art-body" />
    </span>
  );
}
