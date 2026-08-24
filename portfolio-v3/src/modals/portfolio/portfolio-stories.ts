import type { HolographicStoryDefinition } from "../components/HolographicStoryScene";

export const SHOPIFY_STORY = {
  company: "SHOPIFY",
  highlights: [
    {
      body: "Fixed crashes across three marketing reports by handling shops without access to the underlying analytics context.",
      frame: "double",
      impact: "roughly 150 shops affected each day",
      stack: "React / TypeScript",
      title: "REPORT RELIABILITY",
    },
    {
      body: "Moved marketing reports off a legacy data pipeline and onto request-time sales queries behind a beta flag.",
      frame: "bracket",
      impact:
        "enabled retirement of infrastructure tied to 15% of team on-call incidents and 50% of monthly costs",
      stack: "React / TypeScript / Ruby / Rails",
      title: "PIPELINE DEPRECATION",
    },
    {
      body: "Found a case-sensitive collation risk, resolved cross-database test failures, and reviewed proposed keys for ten production tables.",
      frame: "circuit",
      impact: "flagged risk across more than 60 billion rows",
      stack: "Ruby / Rails / MySQL / PostgreSQL",
      title: "DATABASE MIGRATION",
    },
    {
      body: "Detected a silent GCP permissions failure that blocked new analytics pipeline jobs before automated monitoring caught it.",
      frame: "bracket",
      impact: "prevented days of stale merchant data",
      stack: "GCP / ETL",
      title: "INCIDENT RESPONSE",
    },
    {
      body: "Built a hack-days tool that turned Slack messages into tickets, then presented it to Shopify executives.",
      frame: "double",
      impact: "estimated to save more than 30 minutes per user each day",
      stack: "React / Vite / TypeScript / internal LLM API",
      title: "STICKIFY",
    },
  ],
  logoPath: "/logos/shopify-rmbg.png",
  motionPhase: 0,
  subtitle: ["MARKETING", "ANALYTICS"],
  theme: "mint",
} as const satisfies HolographicStoryDefinition;

export const IDEANOTION_STORY = {
  company: "IDEANOTION",
  highlights: [
    {
      body: "Built a conversation summarizer across React, .NET, and OpenAI, with saved results and on-demand regeneration.",
      frame: "circuit",
      impact:
        "cut review time from 6 to 10 minutes to under 40 seconds across 4,500+ daily chats",
      stack: "React / .NET / OpenAI API / CosmosDB",
      title: "CONVERSATION SUMMARY",
    },
    {
      body: "Rebuilt agent configuration, persisted user settings, and replaced repeated local setup for dealership staff.",
      frame: "bracket",
      impact:
        "eliminated save errors for 150+ dealerships and saved 400+ staff 1 to 2 minutes per login",
      stack: "React / Redux / .NET / CosmosDB",
      title: "DEALER WORKFLOWS",
    },
    {
      body: "Resolved more than 35 frontend bugs and four client support requests across inventory, leads, email, navigation, and mobile layouts.",
      frame: "double",
      impact: "reported issues fell 18%",
      stack: "React / TypeScript / Tailwind",
      title: "PRODUCT QUALITY",
    },
    {
      body: "Migrated five .NET controllers and 62 endpoints from a legacy project to EF Core, with 55 DTOs and five typed client APIs.",
      frame: "bracket",
      impact:
        "gave Food Banks Canada staff type-safe access to rebuilt admin workflows",
      stack: ".NET / EF Core / SQL / RTK Query",
      title: "DATA PLATFORM",
    },
    {
      body: "Built more than 15 reusable WordPress content blocks and updated more than 20 English and French pages from Figma designs.",
      frame: "circuit",
      impact:
        "shipped responsive layouts and repaired sliders across three pages",
      stack: "PHP / WordPress / ACF / Figma",
      title: "BILINGUAL WEB",
    },
  ],
  logoPath: "/logos/dealerai-modified-rmbg.png",
  motionPhase: 1.9,
  subtitle: ["FULL STACK", "AI + WEB"],
  theme: "cyan",
} as const satisfies HolographicStoryDefinition;
