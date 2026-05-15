import type { TerminalContext } from "../modal.types";

export const CONTACT_ASCII_TITLE = String.raw`
                             dP                       dP                          
                             88                       88                          
.d8888b. .d8888b. 88d888b. d8888P .d8888b. .d8888b. d8888P    88d8b.d8b. .d8888b. 
88'  '"" 88'  '88 88'  '88   88   88'  '88 88'  '""   88      88''88''88 88ooood8 
88.  ... 88.  .88 88    88   88   88.  .88 88.  ...   88      88  88  88 88.  ... 
'88888P' '88888P' dP    dP   dP   '88888P8 '88888P'   dP      dP  dP  dP '88888P' 
`.trim();

export const CONTACT_DIVIDER = [
  "         ",
  "         ",
  "         ",
  "88888888 ",
] as const;

export const CONTACT_TERMINAL_CONTEXT: TerminalContext = {
  directory: "repos/contact-tobi",
  branch: "main",
};

export const CONTACT_SPRITE = {
  atlasKey: "no-atmosphere-1",
  imagePath: "/rotating-planet-spritesheets/no-atmosphere/no-atmosphere-1.png",
  jsonPath: "/rotating-planet-spritesheets/no-atmosphere/no-atmosphere-1.json",
  columns: 22,
  rows: 12,
} as const;
