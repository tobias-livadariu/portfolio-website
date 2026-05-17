import type { TerminalContext } from "../modal.types";

export const CONTACT_ASCII_TITLE_PIECES = [
  [
    " .d8888b.                    888                      888   ",
    "d88P  Y88b                   888                      888   ",
    "888    888                   888                      888   ",
    "888         .d88b.  88888b.  888888  8888b.   .d8888b 888888",
    '888        d88""88b 888 "88b 888        "88b d88P"    888   ',
    "888    888 888  888 888  888 888    .d888888 888      888   ",
    "Y88b  d88P Y88..88P 888  888 Y88b.  888  888 Y88b.    Y88b. ",
    ' "Y8888P"   "Y88P"  888  888  "Y888 "Y888888  "Y8888P  "Y888',
  ],
  [
    "888b     d888         ",
    "8888b   d8888         ",
    "88888b.d88888         ",
    "888Y88888P888  .d88b. ",
    "888 Y888P 888 d8P  Y8b",
    "888  Y8P  888 88888888",
    '888   "   888 Y8b.    ',
    '888       888  "Y8888 ',
  ],
] as const;

export const CONTACT_DIVIDER = ["dBBBBBP"] as const;

export const CONTACT_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/contact-tobi",
  branch: "main",
};

export const CONTACT_SPRITE = {
  atlasKey: "ice-world-1",
  imagePath: "/rotating-planet-spritesheets/ice-world/ice-world-1.png",
  jsonPath: "/rotating-planet-spritesheets/ice-world/ice-world-1.json",
  columns: 34,
  rows: 18,
} as const;
