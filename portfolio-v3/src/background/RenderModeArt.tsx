import type { BackgroundMode } from "./background-mode-core";
import { VAULT_SIGILS } from "./vault-sigils";

/* Outer Wilds vault locks: the number of sources is the mode index, so the
   marks stay abstract but still count 1, 2, 3 at a glance. Everything else on
   the site is quantised — pixel sprites, the ASCII portrait, the CHAR
   renderer — so these are glyphs too rather than smooth CSS shapes. The tiny
   analytic fields are rendered at module load and update directly through HMR. */
const SIGIL_BY_MODE: Record<BackgroundMode, readonly string[]> = {
  "2d": VAULT_SIGILS.flat,
  "3d": VAULT_SIGILS.deep,
  ascii: VAULT_SIGILS.char,
};

/**
 * Pure text: no canvas, no images, and nothing that animates on its own, so
 * adding it beside the WebGL scene costs no per-frame work.
 */
export default function RenderModeArt({ mode }: { mode: BackgroundMode }) {
  return (
    <span aria-hidden="true" className="rm-art">
      {SIGIL_BY_MODE[mode].join("\n")}
    </span>
  );
}
