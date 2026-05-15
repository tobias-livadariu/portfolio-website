import type { TerminalContext } from "../modal.types";

export const RESUME_ASCII_TITLE = String.raw`
 _____ ______       ___    ___      ________  _______   ________  ___  ___  _____ ______   _______      
|\   _ \  _   \    |\  \  /  /|    |\   __  \|\  ___ \ |\   ____\|\  \|\  \|\   _ \  _   \|\  ___ \     
\ \  \\\__\ \  \   \ \  \/  / /    \ \  \|\  \ \   __/|\ \  \___|\ \  \\\  \ \  \\\__\ \  \ \   __/|    
 \ \  \\|__| \  \   \ \    / /      \ \   _  _\ \  \_|/_\ \_____  \ \  \\\  \ \  \\|__| \  \ \  \_|/__  
  \ \  \    \ \  \   \/  /  /        \ \  \\  \\ \  \_|\ \|____|\  \ \  \\\  \ \  \    \ \  \ \  \_|\ \ 
   \ \__\    \ \__\__/  / /           \ \__\\ _\\ \_______\____\_\  \ \_______\ \__\    \ \__\ \_______\
    \|__|     \|__|\___/ /             \|__|\|__|\|_______|\_________\|_______|\|__|     \|__|\|_______|
                  \|___|/                                 \|_________|                                  
`.trim();

export const RESUME_DIVIDER = [
  "               ",
  "               ",
  " ____________  ",
  "|\\____________\\",
  "\\|____________|",
  "               ",
] as const;

export const RESUME_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/resume",
  branch: "main",
  gitState: ["modified"],
};

export const RESUME_SPRITE = {
  atlasKey: "star-1",
  imagePath: "/rotating-planet-spritesheets/star/star-1.png",
  jsonPath: "/rotating-planet-spritesheets/star/star-1.json",
  columns: 22,
  rows: 12,
} as const;

export const RESUME_DRIVE_ID = "1J4pOm1PnVdsCDL9Tp-9v2_JQKk7rNE_m";
export const RESUME_CACHE_BUSTER = "?v=2025-09-10";
