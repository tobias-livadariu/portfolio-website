import type { TerminalContext } from "../modal.types";

export const ABOUT_ASCII_TITLE_PIECES = [
  [
    "      .o.        .o8                                 .  ",
    '     .888.      "888                               .o8  ',
    '    .8"888.      888oooo.   .ooooo.  oooo  oooo  .o888oo',
    "   .8' `888.     d88' `88b d88' `88b `888  `888    888  ",
    "  .88ooo8888.    888   888 888   888  888   888    888  ",
    " .8'     `888.   888   888 888   888  888   888    888 .",
    "o88o     o8888o  `Y8bod8P' `Y8bod8P'  `V88V\"V8P'   \"888\"",
  ],
  [
    "ooo        ooooo          ",
    "`88.       .888'          ",
    " 888b     d'888   .ooooo. ",
    " 8 Y88. .P  888  d88' `88b",
    " 8  `888'   888  888ooo888",
    " 8    Y     888  888    .o",
    "o8o        o888o `Y8bod8P'",
  ],
] as const;

export const ABOUT_DIVIDER = [
  "---------------",
  "-:::::::::::::-",
  "---------------",
] as const;

export const ABOUT_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/all-about-me",
  branch: "main",
  gitState: ["modified", "untracked"],
};

export const ABOUT_SPRITE = {
  atlasKey: "islands-1",
  imagePath: "/rotating-planet-spritesheets/islands/islands-1.png",
  jsonPath: "/rotating-planet-spritesheets/islands/islands-1.json",
  columns: 34,
  rows: 18,
} as const;
