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

export const RESUME_DIVIDER = ["8888888", "8888888"] as const;

export const RESUME_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/resume",
  branch: "main",
  gitState: ["modified"],
};

export const RESUME_SPRITE = {
  atlasKey: "astroid-5",
  imagePath: "/rotating-planet-spritesheets/astroid/astroid-5.png",
  jsonPath: "/rotating-planet-spritesheets/astroid/astroid-5.json",
  columns: 34,
  rows: 18,
} as const;

export const RESUME_DRIVE_ID = "1J4pOm1PnVdsCDL9Tp-9v2_JQKk7rNE_m";

export const RESUME_PREVIEW_MARGIN = "clamp(0.85rem, 1.35vw, 1.45rem)";
