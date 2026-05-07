export const MAIN_TITLE_TEXT = {
  intro: "Hey, I'm",
  firstName: "Tobias",
  lastName: "Livadariu",
} as const;

export const MAIN_MENU_ITEMS = [
  { key: "about", label: "About" },
  { key: "resume", label: "Resume" },
  { key: "portfolio", label: "Portfolio" },
  { key: "contactMe", label: "Contact Me" },
] as const;

export const MAIN_MENU_LAYOUT = {
  marginX: 0.12,
  marginY: 0.16,
  titleLineGap: 0.24,
  menuTopGap: 0.16,
  menuItemGap: 0.3,
  separatorGap: 0.08,
} as const;

export const MAIN_MENU_TEXT_GEOMETRY = {
  introSize: 0.17,
  nameSize: 0.21,
  menuSize: 0.22,
  depth: 0.025,
  bevelSize: 0.002,
  bevelThickness: 0.003,
} as const;
