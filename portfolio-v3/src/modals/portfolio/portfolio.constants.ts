import type { TerminalContext } from "../modal.types";

export const PORTFOLIO_ASCII_TITLE = String.raw`
     e    e      Y88b    /       888~-_     ,88~-_   888~-_   ~~~888~~~ 888~~    ,88~-_   888     888   ,88~-_   
    d8b  d8b      Y88b  /        888   \   d888   \  888   \     888    888___  d888   \  888     888  d888   \  
   d888bdY88b      Y88b/         888    | 88888    | 888    |    888    888    88888    | 888     888 88888    | 
  / Y88Y Y888b      Y8Y          888   /  88888    | 888   /     888    888    88888    | 888     888 88888    | 
 /   YY   Y888b      Y           888_-~    Y888   /  888_-~      888    888     Y888   /  888     888  Y888   /  
/          Y888b    /            888        '88_-~   888 ~-_     888    888      '88_-~   888____ 888   '88_-~   
`.trim();

export const PORTFOLIO_DIVIDER = [
  "              ",
  "              ",
  "              ",
  "+#++:++#++:++ ",
  "              ",
] as const;

export const PORTFOLIO_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/my-portfolio",
  branch: "main",
  gitState: ["staged"],
};

export const PORTFOLIO_SPRITE = {
  atlasKey: "islands-1",
  imagePath: "/rotating-planet-spritesheets/islands/islands-1.png",
  jsonPath: "/rotating-planet-spritesheets/islands/islands-1.json",
  columns: 24,
  rows: 12,
} as const;
