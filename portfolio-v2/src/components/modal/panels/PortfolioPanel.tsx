import ImageTextCaption from "./panel-shared-components/ImageTextCaption";
import HorizontalHashedLine from "./panel-shared-components/HorizontalHashedLine";

export default function PortfolioPanel() {
  return (
    <div>
      <ImageTextCaption
        imageUrl="/portfolio/images/ideanotion-banner.png"
        imageAlt="IdeaNotion's banner"
        imageCaption="The sign of my last employer!"
        href="https://ideanotion.net/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># IDEANOTION DEVELOPMENT INC.</p>
        <p className="mb-2">My last internship was an incredible experience.</p>
        <p className="mb-5">I had the opportunity to work on three major projects:</p>
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
        imageUrl="/portfolio/images/dealerai-website-social-preview-graphic.png"
        imageAlt="Logo of DealerAI"
        imageCaption="DealerAI's logo, IdeaNotion's main product"
        href="https://dealerai.com/"
        newTab
        tilt
        tiltMaxDeg={8}
        tiltScale={1.02}
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># DEALERAI</p>
        <p className="text-[16px]">## PRODUCT DESCRIPTION</p>
        <p>
          DealerAI's offers AI for car dealerships through its Multi-Agent Generative System to streamline operations and boost lead efficiency.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <ul className="list-disc pixel-list pl-5">
          <li>Developed an AI-powered conversation summarization tool using React, OpenAI API, and a .NET backend,
          reducing manual review from 6 – 10 mins per chat to less than 40 secs across 4500+ daily conversations</li>
          <li>Revamped the RAG knowledge base page in React/Redux with a responsive table of contents and data-saving
          fixes, cutting reported save errors to 0% and speeding workflows for 150+ client dealerships in Canada</li>
          <li>Built backend controllers in C#/.NET with Azure CosmosDB to persist user settings beyond session storage, saving
          400+ dealership staff 1–2 mins per login across thousands of sessions by eliminating repeated reconfiguration</li>
          <li>Developed a Markdown editor, adopted by the lead AI developer, enabling 30% faster prompt formatting</li>
          <li>Resolved 35+ frontend bugs and 4 client support requests, contributing to an 18% drop in reported issues</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/foodbankscanada-image-cropped.png"
        imageAlt="Food Banks Canada's Logo"
        imageCaption="Food Banks Canada's logo"
        href="https://foodbankscanada.ca/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - MAIN WEBSITE</p>
        <p className="text-[16px]">## PRODUCT DESCRIPTION</p>
        <p>
          Public-facing WordPress site for Food Banks Canada with bilingual pages, campaign content, custom ACF blocks, and tailored components consistent with Figma designs.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <ul className="list-disc pixel-list pl-5">
          <li>Transitioned 5 legacy admin data tables into a modern Material React Table UI, replacing outdated rigid table
          structures with responsive designs and persistent state, reducing workflow steps for client administrators by 30%</li>
          <li>Migrated and refactored 5 C#/.NET controllers, 62 endpoints, and 55 DTO classes, using EF Core to build
          optimized SQL database queries and serve structured data via API endpoints for safe and consistent data transfer</li>
          <li>Developed 5 RTK Query APIs in TypeScript providing cached, type-safe data access between frontend and backend</li>
          <li>Implemented robust server-side filtering and drag-and-drop reordering in multi-tab forms, reducing data fetch
          delays and decreasing manual data entry errors, resulting in greater operational efficiency</li>
          <li>Refactored backend file upload services to use the latest Azure SDK, increasing maintainability</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/foodbankscanada-theexchange.png"
        imageAlt="The Exchange's Landing Page"
        imageCaption="The Exchange's landing page"
        href="https://theexchange.foodbankscanada.ca/"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - THE EXCHANGE</p>
        <p className="text-[16px]">## PRODUCT DESCRIPTION</p>
        <p>
          Admin portal used across the Food Banks Canada network to manage data, content, and operations, with integrated real-time chat for member collaboration.
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <ul className="list-disc pixel-list pl-5">
          <li>Built 15+ reusable ACF blocks with PHP/Laravel/WordPress, simplifying creation of consistent page layouts</li>
          <li>Overhauled over 20 pages across English and French to match Figma designs, implementing responsive layouts,
          refined typography, and consistent styling to ensure a polished and accessible cross-language user experience</li>
          <li>Upgraded sliders to SwiperJS, fixed maps, and refined form styling, enhancing site stability and performance</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/codespeak-logo.png"
        imageAlt="CodeSpeak Logo"
        imageCaption="CodeSpeak's logo"
        href="https://devpost.com/software/codespeak"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CODESPEAK</p>
        <p className="text:[16px]">## PROJECT DESCRIPTION</p>
        <p className="italic">
          "Modern IDEs are cluttered and visual-heavy, leaving blind users behind. CodeSpeak is a voice-powered, AI-assisted grid IDE with clear layouts and audio feedback—helping blind coders build freely."
        </p>
        <p className="text-[16px]">## TECHNICAL DETAILS</p>
        <ul className="list-disc pixel-list pl-5">
          <li>Created an intelligent IDE for visually impaired users leveraging Gemini API and a neural network verifier</li>
          <li>Built a React frontend with keyboard navigation and audio feedback via Google TTS and Flask+Express</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/binthereai-thumbnail.png"
        imageAlt="BinThere.ai's Logo"
        imageCaption="BinThere.ai's logo"
        href="https://devpost.com/software/bin-there-ai"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># BINTHERE.AI</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p className="italic">
          "BinThere.Ai uses AI to instantly scan your trash and guide you on recycling, composting, or discarding. Make eco-friendly choices, track your impact, and help create a sustainable future—effortlessly!"
        </p>
        <p className="text-[16px]">## TECHNICAL DETAILS</p>
        <ul className="list-disc pixel-list pl-5">
          <li>Built waste-sorting tool with YOLO+Roboflow image detection and OpenAI API disposal suggestions</li>
          <li>Embedded Streamlit/Flask services for real-time analysis, impact tracking, and gamified stats</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/lights-on-thumbnail.png"
        imageAlt="Lights On Photo"
        imageCaption="An image of Lights On's landing page"
        href="https://github.com/tobias-livadariu/lights-on"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># LIGHTS ON</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p className="italic">
          "A simple web-based puzzle game inspired by the famous 'Lights Out!' toy."
        </p>
        <ul className="list-disc pixel-list pl-5">
          <li>Built a timed puzzle game with leaderboards using React, Node.js/Express and MongoDB Atlas</li>
          <li>Deployed on Azure Ubuntu VM as systemd services, configuring ports and security groups for reliable hosting</li>
        </ul>
      </ImageTextCaption>

      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="mt-6 mb-8 md:mt-8 md:mb-10"
      />

      <ImageTextCaption
        imageUrl="/portfolio/images/calciumclicker-thumbnail.png"
        imageAlt="Calcium Clicker Photo"
        imageCaption="An image of Calcium Clicker's landing page"
        href="https://tobiliv.pythonanywhere.com"
        newTab
        tilt
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CALCIUM CLICKER</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p className="italic">
          "An incremental web game inspired by classics like Cookie Clicker and Swarm Simulator where players, as necromancers, grow their undead skeleton army."
        </p>
        <ul className="list-disc pixel-list pl-5">
          <li>Developed an incremental game in Flask, using SQL and AJAX for persistence and dynamic DOM updates</li>
        </ul>
      </ImageTextCaption>
    </div>
  );
}
