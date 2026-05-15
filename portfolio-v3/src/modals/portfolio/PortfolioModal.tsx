import BatMarkdown from "../components/BatMarkdown";
import ModalHeader from "../components/ModalHeader";
import Terminal, { LsOutput } from "../components/Terminal";
import ideaNotionSummary from "./ideanotion-summary.md?raw";
import {
  PORTFOLIO_ASCII_TITLE,
  PORTFOLIO_DIVIDER,
  PORTFOLIO_SPRITE,
  PORTFOLIO_TERMINAL_CONTEXT,
} from "./portfolio.constants";
import shopifySummary from "./shopify-summary.md?raw";

const rootRows = [
  {
    name: "shopify/",
    type: "dir",
    size: "192",
    date: "May 14 21:18",
  },
  {
    name: "idea-notion/",
    type: "dir",
    size: "224",
    date: "May 14 21:19",
  },
  {
    name: "projects/",
    type: "dir",
    size: "256",
    date: "May 14 21:20",
  },
] as const;

const shopifyRows = [
  {
    name: "marketing-analytics/",
    type: "dir",
    size: "224",
    date: "Apr 30 18:22",
  },
  {
    name: "data-correctness/",
    type: "dir",
    size: "192",
    date: "Apr 26 15:40",
  },
  {
    name: "internal-tools/",
    type: "dir",
    size: "160",
    date: "Apr 18 09:35",
  },
  {
    name: "summary.md",
    type: "file",
    size: "2.2K",
    date: "May 14 22:10",
  },
] as const;

const ideaNotionRows = [
  {
    name: "dealerai/",
    type: "dir",
    size: "256",
    date: "Aug 29 18:10",
  },
  {
    name: "food-banks-canada/",
    type: "dir",
    size: "224",
    date: "Aug 28 17:42",
  },
  {
    name: "summary.md",
    type: "file",
    size: "2.0K",
    date: "May 14 22:12",
  },
] as const;

const projectRows = [
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

export default function PortfolioModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        title={PORTFOLIO_ASCII_TITLE}
        dividerBlock={PORTFOLIO_DIVIDER}
        dividerRepeats={12}
        leftSprite={{ ...PORTFOLIO_SPRITE, alt: "ASCII island planet" }}
        rightSprite={{ ...PORTFOLIO_SPRITE, alt: "ASCII island planet" }}
      />

      <Terminal
        context={PORTFOLIO_TERMINAL_CONTEXT}
        commands={[
          {
            command: "ls -al",
            output: <LsOutput rows={rootRows} />,
          },
          {
            command: "cd shopify && ls -al",
            output: <LsOutput rows={shopifyRows} />,
          },
          {
            command: "bat summary.md",
            context: { directory: "repos/my-portfolio/shopify" },
            output: (
              <BatMarkdown content={shopifySummary} fileName="summary.md" />
            ),
          },
          {
            command: "cd ../idea-notion && ls -al",
            context: { directory: "repos/my-portfolio/shopify" },
            output: <LsOutput rows={ideaNotionRows} />,
          },
          {
            command: "bat summary.md",
            context: { directory: "repos/my-portfolio/idea-notion" },
            output: (
              <BatMarkdown content={ideaNotionSummary} fileName="summary.md" />
            ),
          },
          {
            command: "cd ../projects && ls -al",
            context: { directory: "repos/my-portfolio/idea-notion" },
            output: <LsOutput rows={projectRows} />,
          },
        ]}
      />
    </article>
  );
}
