import useNotifyStartupSurface from "../../background/use-notify-startup-surface";
import { UI_HALO } from "./main-menu.constants";

/**
 * Reports that the 3D UI has been painted, which is half of what the startup
 * cover waits for.
 *
 * This must sit inside the same Suspense boundary as the menu, so it cannot
 * report while the menu is still suspended on its typeface, and it must run
 * behind the halo pass, because that pass owns the composite the menu is
 * actually drawn by.
 */
export default function StartupUiSignal() {
  useNotifyStartupSurface("ui", UI_HALO.renderPriority + 1);

  return null;
}
