import type { TerminalContext } from "../modal.types";

export const RESUME_ASCII_TITLE_PIECES = [
  [
    "MMMMMMMM               MMMMMMMM                                             ",
    "M:::::::M             M:::::::M                                             ",
    "M::::::::M           M::::::::M                                             ",
    "M:::::::::M         M:::::::::M                                             ",
    "M::::::::::M       M::::::::::Myyyyyyy           yyyyyyy                    ",
    "M:::::::::::M     M:::::::::::M y:::::y         y:::::y                     ",
    "M:::::::M::::M   M::::M:::::::M  y:::::y       y:::::y                      ",
    "M::::::M M::::M M::::M M::::::M   y:::::y     y:::::y                       ",
    "M::::::M  M::::M::::M  M::::::M    y:::::y   y:::::y                        ",
    "M::::::M   M:::::::M   M::::::M     y:::::y y:::::y                         ",
    "M::::::M    M:::::M    M::::::M      y:::::y:::::y                          ",
    "M::::::M     MMMMM     M::::::M       y:::::::::y                           ",
    "M::::::M               M::::::M        y:::::::y                            ",
    "M::::::M               M::::::M         y:::::y                             ",
    "M::::::M               M::::::M        y:::::y                              ",
    "MMMMMMMM               MMMMMMMM       y:::::y                               ",
    "                                     y:::::y                                ",
    "                                    y:::::y                                 ",
    "                                   y:::::y                                  ",
    "                                  y:::::y                                   ",
    "                                 yyyyyyy                                    ",
  ],
  [
    "RRRRRRRRRRRRRRRRR                                                          ",
    "R::::::::::::::::R                                                         ",
    "R::::::RRRRRR:::::R                                                        ",
    "RR:::::R     R:::::R                                                       ",
    "  R::::R     R:::::R    eeeeeeeeeeee        ssssssssss   uuuuuu    uuuuuu  ",
    "  R::::R     R:::::R  ee::::::::::::ee    ss::::::::::s  u::::u    u::::u  ",
    "  R::::RRRRRR:::::R  e::::::eeeee:::::eess:::::::::::::s u::::u    u::::u  ",
    "  R:::::::::::::RR  e::::::e     e:::::es::::::ssss:::::su::::u    u::::u  ",
    "  R::::RRRRRR:::::R e:::::::eeeee::::::e s:::::s  ssssss u::::u    u::::u  ",
    "  R::::R     R:::::Re:::::::::::::::::e    s::::::s      u::::u    u::::u  ",
    "  R::::R     R:::::Re::::::eeeeeeeeeee        s::::::s   u::::u    u::::u  ",
    "  R::::R     R:::::Re:::::::e           ssssss   s:::::s u:::::uuuu:::::u  ",
    "RR:::::R     R:::::Re::::::::e          s:::::ssss::::::su:::::::::::::::uu",
    "R::::::R     R:::::R e::::::::eeeeeeee  s::::::::::::::s  u:::::::::::::::u",
    "R::::::R     R:::::R  ee:::::::::::::e   s:::::::::::ss    uu::::::::uu:::u",
    "RRRRRRRR     RRRRRRR    eeeeeeeeeeeeee    sssssssssss        uuuuuuuu  uuuu",
  ],
  [
    "   mmmmmmm    mmmmmmm       eeeeeeeeeeee     ",
    " mm:::::::m  m:::::::mm   ee::::::::::::ee   ",
    "m::::::::::mm::::::::::m e::::::eeeee:::::ee ",
    "m::::::::::::::::::::::me::::::e     e:::::e ",
    "m:::::mmm::::::mmm:::::me:::::::eeeee::::::e ",
    "m::::m   m::::m   m::::me:::::::::::::::::e  ",
    "m::::m   m::::m   m::::me::::::eeeeeeeeeee   ",
    "m::::m   m::::m   m::::me:::::::e            ",
    "m::::m   m::::m   m::::me::::::::e           ",
    "m::::m   m::::m   m::::m e::::::::eeeeeeee   ",
    "m::::m   m::::m   m::::m  ee:::::::::::::e   ",
    "mmmmmm   mmmmmm   mmmmmm    eeeeeeeeeeeeee   ",
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
