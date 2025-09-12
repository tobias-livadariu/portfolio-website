import ImageTextCaption from "./panel-shared-components/ImageTextCaption";
import HorizontalHashedLine from "./panel-shared-components/HorizontalHashedLine";

export default function PortfolioPanel() {
  return (
    <div>
      <ImageTextCaption
        imageUrl="/images/ideanotion-banner.png"
        imageAlt="IdeaNotion's banner"
        imageCaption="The sign of my last employer!"
        href="https://ideanotion.net/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># IDEANOTION DEVELOPMENT INC.</p>
        <p className="mb-2">My last internship was an incredible experience.</p>
        <p className="mb-5"><span></span>I had the opportunity to work on three major projects:</p>
        <ul className="list-disc pixel-list pl-5">
          <li>DealerAI Admin Portal - <span className="italic">React, TypeScript, Tailwind, Redux, C#, .NET, OpenAI API, SQL, CosmosDB</span></li>
          <li>Food Banks Canada Main Website - <span className="italic">PHP, Laravel, Sage, WordPress, SCSS, Bootstrap</span></li>
          <li>Food Banks Canada Admin Portal - <span className="italic">React, TypeScript, Tailwind, RTK Query, C#, .NET, EF Core, SQL</span></li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/dealerai-website-social-preview-graphic.png"
        imageAlt="Logo of DealerAI"
        imageCaption="DealerAI's logo, IdeaNotion's main product"
        href="https://dealerai.com/"
        newTab
        tilt
        tiltMaxDeg={8}
        tiltScale={1.02}
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># DEALERAI</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          AI platform helping dealerships convert online traffic into booked appointments via a customizable, multi-agent chatbot and an admin portal for training, knowledge, conversation review, and reporting.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          - Built a conversation summarization tool (React + OpenAI + .NET) to speed manual review across high-volume chats<br />
          - Revamped the RAG knowledge base page (React/Redux) with a responsive table of contents and reliable saving<br />
          - Added C#/.NET controllers with Azure CosmosDB to persist user settings beyond the session lifecycle<br />
          - Implemented a lightweight Markdown editor adopted internally for faster prompt authoring<br />
          - Closed numerous frontend defects and triaged client support items across the admin portal
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/foodbankscanada-image-cropped.png"
        imageAlt="Food Banks Canada's Logo"
        imageCaption="Food Banks Canada's logo"
        href="https://foodbankscanada.ca/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - MAIN WEBSITE</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          Public-facing WordPress site for Food Banks Canada with bilingual pages, campaign content, custom ACF blocks, and tailored components consistent with Figma designs.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          - Built reusable ACF blocks (PHP/Laravel/Sage) to standardize page assembly and styling<br />
          - Reworked many English/French pages to match Figma: responsive layout, typography, and consistent design<br />
          - Upgraded legacy sliders to SwiperJS, fixed maps, and refined Gravity Forms styling for stability and polish
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/foodbankscanada-theexchange.png"
        imageAlt="The Exchange's Landing Page"
        imageCaption="The Exchange's landing page"
        href="https://theexchange.foodbankscanada.ca/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - THE EXCHANGE</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          Member/admin portal used across the FBC network for data management, content, and operations — modernized with Material React Table UIs and a typed API layer.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          - Replaced legacy admin tables with Material React Table, adding responsive layouts and persistent state<br />
          - Migrated/refactored C#/.NET controllers, endpoints, and DTOs; optimized queries via EF Core<br />
          - Created RTK Query APIs for cached, type-safe data access between frontend and .NET backend<br />
          - Implemented server-side filtering and drag-and-drop reordering in multi-tab forms to reduce user friction<br />
          - Updated backend file uploads to latest Azure SDK for long-term maintainability
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/codespeak-logo.png"
        imageAlt="CodeSpeak Logo"
        imageCaption="CodeSpeak's logo"
        href="https://devpost.com/software/codespeak"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CODESPEAK</p>
        <p className="text:[16px]">## PROJECT DESCRIPTION</p>
        <p>
          Browser-based, accessible IDE for low/vision-impaired coders — keyboard-first UI, audio feedback via Google TTS, and AI assistance using Gemini with a verifier.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          - Built the React frontend with focus order, ARIA-friendly controls, and concise info density<br />
          - Implemented Flask + Express APIs; wired SQLAlchemy models and Google Cloud Text-to-Speech delivery<br />
          - Prototyped a classification-based verifier to improve the reliability of AI suggestions<br />
          - Solved storage/streaming hurdles by proxying GCS audio through a Node/Express endpoint
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/binthereai-thumbnail.png"
        imageAlt="BinThere.ai's Logo"
        imageCaption="BinThere.ai's logo"
        href="https://devpost.com/software/bin-there-ai"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># BINTHERE.AI</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          Camera-based waste sorting helper that classifies materials (YOLO/Roboflow) and suggests proper disposal or reuse, with a friendly React UI and a Streamlit-powered control plane.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          - Integrated YOLO/Roboflow image detection and wired prompts to OpenAI for actionable guidance<br />
          - Built the React frontend and embedded a themed Streamlit view for AI tooling<br />
          - Orchestrated Flask + Streamlit concurrently and cleaned up CSS to blend the UIs
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/lights-on-thumbnail.png"
        imageAlt="Lights On Photo"
        imageCaption="An image of Lights On's landing page"
        href="https://github.com/tobias-livadariu/lights-on"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># LIGHTS ON</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          A fast puzzle game with a global leaderboard built on a modern MERN-style stack.
        </p>
        <p>
          - Implemented game logic and leaderboard APIs with React + Node/Express + MongoDB Atlas<br />
          - Deployed on an Azure Ubuntu VM with systemd services, hardened ports, and firewall rules
        </p>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/images/calciumclicker-thumbnail.png"
        imageAlt="Calcium Clicker Photo"
        imageCaption="An image of Calcium Clicker's landing page"
        href="https://tobiliv.pythonanywhere.com"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CALCIUM CLICKER</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          A browser-based incremental game where you harvest and automate "skeleton" production. Built with Flask, SQL, and AJAX for smooth DOM updates and persistent progress.
        </p>
        <p>
          - Built Flask routes and SQL schema for login, upgrades, and timed automation<br />
          - Implemented AJAX-driven DOM syncing and number-suffix formatting for large values<br />
          - Added a lightweight client state to avoid race conditions and reduce DB calls
        </p>
      </ImageTextCaption>
    </div>
  );
}
