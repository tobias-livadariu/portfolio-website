import useNotifyFirstFrame from "../../background/use-notify-first-frame";
import Planets from "./Planets";
import Stars from "./Stars";
import type { BackgroundMode } from "../../background/background-mode-core";
import {
  VOLUMETRIC_STARFIELD_TUNING,
  type VolumetricStarfieldMode,
} from "./starfield.constants";

export default function Starfield({
  readyMode = "3d",
}: {
  readyMode?: BackgroundMode;
}) {
  useNotifyFirstFrame(readyMode);
  const mode: VolumetricStarfieldMode = readyMode === "ascii" ? "ascii" : "3d";
  const tuning = VOLUMETRIC_STARFIELD_TUNING[mode];

  return (
    <group>
      <Stars fieldTuning={tuning} mode={mode} />
      <Planets fieldTuning={tuning} mode={mode} />
    </group>
  );
}
