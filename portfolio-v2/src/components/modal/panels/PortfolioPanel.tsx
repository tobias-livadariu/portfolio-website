import ImageTextCaption from "./panel-shared-components/ImageTextCaption";
import HorizontalHashedLine from "./panel-shared-components/HorizontalHashedLine";

export default function PortfolioPanel() {
  return (
    <div>
      <ImageTextCaption
        imageUrl="/images/ideanotion-banner.png"
        imageAlt="IdeaNotion's banner"
        imageCaption="The sign of my last employer!"
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># DEALERAI</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - MAIN WEBSITE</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># FOOD BANKS CANADA - THE EXCHANGE</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CODESPEAK</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># BINTHERE.AI</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># LIGHTS ON</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
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
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># CALCIUM CLICKER</p>
        <p className="text-[16px]">## PROJECT DESCRIPTION</p>
        <p>
          TODO
        </p>
        <p className="text-[16px]">## MY CONTRIBUTIONS</p>
        <p>
          TODO
        </p>
      </ImageTextCaption>
    </div>
  );
}
