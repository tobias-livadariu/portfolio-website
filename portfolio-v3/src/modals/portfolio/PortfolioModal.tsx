import { memo } from "react";
import AsciiDivider from "../components/AsciiDivider";
import ModalHeader from "../components/ModalHeader";
import Terminal, {
  lsOutputRows,
  wrappedTextOutput,
} from "../components/Terminal";
import ideaNotionSummary from "./ideanotion-summary.txt?raw";
import {
  PORTFOLIO_ASCII_TITLE_PIECES,
  PORTFOLIO_DIVIDER,
  PORTFOLIO_SPRITE,
  PORTFOLIO_TERMINAL_CONTEXT,
} from "./portfolio.constants";
import shopifySummary from "./shopify-summary.txt?raw";

const PORTFOLIO_LEFT_SPRITE = {
  ...PORTFOLIO_SPRITE,
  alt: "Mirrored ASCII terran planet",
  flipX: true,
} as const;

const PORTFOLIO_RIGHT_SPRITE = {
  ...PORTFOLIO_SPRITE,
  alt: "ASCII terran planet",
} as const;

const shopifyRows = [
  {
    name: "marketing-analytics/",
    type: "dir",
    size: "-",
    date: "Apr 30 18:22",
  },
  {
    name: "data-correctness/",
    type: "dir",
    size: "-",
    date: "Apr 26 15:40",
  },
  {
    name: "internal-tools/",
    type: "dir",
    size: "-",
    date: "Apr 18 09:35",
  },
  {
    name: "summary.txt",
    type: "file",
    size: "2.2k",
    date: "May 14 22:10",
  },
] as const;

const ideaNotionRows = [
  {
    name: "dealerai/",
    type: "dir",
    size: "-",
    date: "Aug 29 18:10",
  },
  {
    name: "food-banks-canada/",
    type: "dir",
    size: "-",
    date: "Aug 28 17:42",
  },
  {
    name: "summary.txt",
    type: "file",
    size: "2.0k",
    date: "May 14 22:12",
  },
] as const;

const personalRows = [
  {
    name: "portfolio-website -> github.com/tobias-livadariu/portfolio-website",
    href: "https://github.com/tobias-livadariu/portfolio-website",
    type: "link",
    size: "128",
    date: "May 14 22:20",
  },
  {
    name: "langsketch -> devpost.com/software/langsketch",
    href: "https://devpost.com/software/langsketch",
    type: "link",
    size: "128",
    date: "Sep 15 23:58",
  },
  {
    name: "codespeak -> devpost.com/software/codespeak",
    href: "https://devpost.com/software/codespeak",
    type: "link",
    size: "128",
    date: "Jan 19 19:44",
  },
  {
    name: "bin-there-ai -> devpost.com/software/bin-there-ai",
    href: "https://devpost.com/software/bin-there-ai",
    type: "link",
    size: "128",
    date: "Nov 17 20:05",
  },
  {
    name: "lights-on -> github.com/tobias-livadariu/lights-on",
    href: "https://github.com/tobias-livadariu/lights-on",
    type: "link",
    size: "128",
    date: "Aug 09 14:32",
  },
  {
    name: "calcium-clicker -> tobiliv.pythonanywhere.com/login",
    href: "https://tobiliv.pythonanywhere.com/login",
    type: "link",
    size: "128",
    date: "Apr 22 11:21",
  },
] as const;

const shopifyContext = {
  ...PORTFOLIO_TERMINAL_CONTEXT,
  directory: "repos/my-portfolio/work/shopify",
} as const;

const ideaNotionContext = {
  ...PORTFOLIO_TERMINAL_CONTEXT,
  directory: "repos/my-portfolio/work/idea-notion",
  gitState: ["modified"],
} as const;

const personalContext = {
  ...PORTFOLIO_TERMINAL_CONTEXT,
  directory: "repos/my-portfolio/personal/projects",
  gitState: ["untracked"],
} as const;

function PortfolioModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        dividerBlock={PORTFOLIO_DIVIDER}
        leftSprite={PORTFOLIO_LEFT_SPRITE}
        rightSprite={PORTFOLIO_RIGHT_SPRITE}
        titleGapFirstCh={1}
        titleGapSecondCh={-4}
        titlePieces={PORTFOLIO_ASCII_TITLE_PIECES}
      />

      <Terminal
        context={shopifyContext}
        commands={[
          {
            command: "ls -l",
            output: lsOutputRows(shopifyRows),
          },
          {
            command: "cat summary.txt",
            output: [wrappedTextOutput(shopifySummary)],
          },
        ]}
      />

      <AsciiDivider block={PORTFOLIO_DIVIDER} />

      <Terminal
        context={ideaNotionContext}
        commands={[
          {
            command: "ls -l",
            output: lsOutputRows(ideaNotionRows),
          },
          {
            command: "cat summary.txt",
            output: [wrappedTextOutput(ideaNotionSummary)],
          },
        ]}
      />

      <AsciiDivider block={PORTFOLIO_DIVIDER} />

      <Terminal
        context={personalContext}
        commands={[
          {
            command: "ls -l",
            output: lsOutputRows(personalRows),
          },
        ]}
      />
    </article>
  );
}

export default memo(PortfolioModal);
