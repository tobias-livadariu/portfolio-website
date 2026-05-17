import type { TerminalContext } from "../modal.types";

export const RESUME_ASCII_TITLE_PIECES = [
  [
    "::::    ::::  :::   :::",
    "+:+:+: :+:+:+ :+:   :+:",
    "+:+ +:+:+ +:+  +:+ +:+ ",
    "+#+  +:+  +#+   +#++:  ",
    "+#+       +#+    +#+   ",
    "#+#       #+#    #+#   ",
    "###       ###    ###   ",
  ],
  [
    ":::::::::  :::::::::: ::::::::  :::    ::: ::::    ::::  ::::::::::",
    ":+:    :+: :+:       :+:    :+: :+:    :+: +:+:+: :+:+:+ :+:       ",
    "+:+    +:+ +:+       +:+        +:+    +:+ +:+ +:+:+ +:+ +:+       ",
    "+#++:++#:  +#++:++#  +#++:++#++ +#+    +:+ +#+  +:+  +#+ +#++:++#  ",
    "+#+    +#+ +#+              +#+ +#+    +#+ +#+       +#+ +#+       ",
    "#+#    #+# #+#       #+#    #+# #+#    #+# #+#       #+# #+#       ",
    "###    ### ########## ########   ########  ###       ### ##########",
  ],
] as const;

export const RESUME_DIVIDER = ["88888888", "88888888"] as const;

export const RESUME_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/resume",
  branch: "main",
  gitState: ["modified"],
};

export const RESUME_SPRITE = {
  atlasKey: "gas-giant-1-1",
  imagePath: "/rotating-planet-spritesheets/gas-giant-1/gas-giant-1-1.png",
  jsonPath: "/rotating-planet-spritesheets/gas-giant-1/gas-giant-1-1.json",
  columns: 34,
  rows: 18,
} as const;

export const RESUME_DRIVE_ID = "1J4pOm1PnVdsCDL9Tp-9v2_JQKk7rNE_m";
