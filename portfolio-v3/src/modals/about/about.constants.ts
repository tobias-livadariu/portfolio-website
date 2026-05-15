import type { TerminalContext } from "../modal.types";

export const ABOUT_ASCII_TITLE = String.raw`
 __ __ __   ___   ___   ______       ________   ___ __ __       ________     
/_//_//_/\ /__/\ /__/\ /_____/\     /_______/\ /__//_//_/\     /_______/\    
\:\\:\\:\ \\::\ \\  \ \\:::_ \ \    \::: _  \ \\::\| \| \ \    \__.::._\/    
 \:\\:\\:\ \\::\/_\ .\ \\:\ \ \ \    \::(_)  \ \\:.      \ \      \::\ \     
  \:\\:\\:\ \\:: ___::\ \\:\ \ \ \    \:: __  \ \\:.\-/\  \ \     _\::\ \__  
   \:\\:\\:\ \\: \ \\::\ \\:\_\ \ \    \:.\ \  \ \\. \  \  \ \   /__\::\__/\ 
    \_______\/ \__\/ \::\/ \_____\/     \__\/\__\/ \__\/ \__\/   \________\/ 
`.trim();

export const ABOUT_DIVIDER = [
  " _______  ",
  "/______/\\ ",
  "\\__::::\\/ ",
  "          ",
] as const;

export const ABOUT_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/all-about-me",
  branch: "main",
  gitState: ["modified", "untracked"],
};

export const ABOUT_SPRITE = {
  atlasKey: "black-hole-1",
  imagePath: "/rotating-planet-spritesheets/black-hole/black-hole-1.png",
  jsonPath: "/rotating-planet-spritesheets/black-hole/black-hole-1.json",
  columns: 24,
  rows: 12,
} as const;
