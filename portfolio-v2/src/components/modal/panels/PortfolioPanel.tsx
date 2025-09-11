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
          <li>Frontend: React, TypeScript, Tailwind, Pixi.js</li>
          <li>Backend: C#, .NET, SQL, CosmosDB, Azure</li>
          <li>Interests: Full-stack design (React + .NET) + scalable APIs & databases</li>
          <li>Hobbies: Reading fantasy novels, lifting weights</li>
        </ul>
      </ImageTextCaption>

      {/* ASCII divider: & - # - # - … - & */}
      <HorizontalHashedLine
        color="#f7d8c0"
        fontSize={18}
        gap={2}
        className="my-6"
      />

      <ImageTextCaption
        imageUrl="/images/me.png"
        imageAlt="Portrait of me!"
        imageCaption="A drawing of my face made by a friend"
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># ABOUT ME</p>
        <p className="text-[16px]">## TOBIAS LIVADARIU</p>

        <p>
          I’m a 2nd-year Software Engineering student at the University of Waterloo, 
          passionate about building tools at the intersection of frontend design and 
          backend systems. I’ve worked on projects like DealerAI’s Admin Portal and 
          Food Banks Canada’s Exchange platform.
        </p>

        <p>
          Outside of coding, I enjoy getting lost in books and challenging myself in 
          the gym. Reading keeps my imagination sharp, and lifting keeps me grounded.
        </p>

        <p className="text-[16px]">## SKILLS & INTERESTS</p>

        <ul className="list-disc pixel-list pl-5">
          <li>Frontend: React, TypeScript, Tailwind, Pixi.js</li>
          <li>Backend: C#, .NET, SQL, CosmosDB, Azure</li>
          <li>Interests: Full-stack design (React + .NET) + scalable APIs & databases</li>
          <li>Hobbies: Reading fantasy novels, lifting weights</li>
        </ul>
      </ImageTextCaption>

      <ImageTextCaption
        imageUrl="/images/me.png"
        imageAlt="Portrait of me!"
        imageCaption="A drawing of my face made by a friend"
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># ABOUT ME</p>
        <p className="text-[16px]">## TOBIAS LIVADARIU</p>

        <p>
          I’m a 2nd-year Software Engineering student at the University of Waterloo, 
          passionate about building tools at the intersection of frontend design and 
          backend systems. I’ve worked on projects like DealerAI’s Admin Portal and 
          Food Banks Canada’s Exchange platform.
        </p>

        <p>
          Outside of coding, I enjoy getting lost in books and challenging myself in 
          the gym. Reading keeps my imagination sharp, and lifting keeps me grounded.
        </p>

        <p className="text-[16px]">## SKILLS & INTERESTS</p>

        <ul className="list-disc pixel-list pl-5">
          <li>Frontend: React, TypeScript, Tailwind, Pixi.js</li>
          <li>Backend: C#, .NET, SQL, CosmosDB, Azure</li>
          <li>Interests: Full-stack design (React + .NET) + scalable APIs & databases</li>
          <li>Hobbies: Reading fantasy novels, lifting weights</li>
        </ul>
      </ImageTextCaption>

      <ImageTextCaption
        imageUrl="/images/me.png"
        imageAlt="Portrait of me!"
        imageCaption="A drawing of my face made by a friend"
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># ABOUT ME</p>
        <p className="text-[16px]">## TOBIAS LIVADARIU</p>

        <p>
          I’m a 2nd-year Software Engineering student at the University of Waterloo, 
          passionate about building tools at the intersection of frontend design and 
          backend systems. I’ve worked on projects like DealerAI’s Admin Portal and 
          Food Banks Canada’s Exchange platform.
        </p>

        <p>
          Outside of coding, I enjoy getting lost in books and challenging myself in 
          the gym. Reading keeps my imagination sharp, and lifting keeps me grounded.
        </p>

        <p className="text-[16px]">## SKILLS & INTERESTS</p>

        <ul className="list-disc pixel-list pl-5">
          <li>Frontend: React, TypeScript, Tailwind, Pixi.js</li>
          <li>Backend: C#, .NET, SQL, CosmosDB, Azure</li>
          <li>Interests: Full-stack design (React + .NET) + scalable APIs & databases</li>
          <li>Hobbies: Reading fantasy novels, lifting weights</li>
        </ul>
      </ImageTextCaption>

      <ImageTextCaption
        imageUrl="/images/me.png"
        imageAlt="Portrait of me!"
        imageCaption="A drawing of my face made by a friend"
      >
        <p className="mt-2 md:mt-0 text-[20px] font-pressstart"># ABOUT ME</p>
        <p className="text-[16px]">## TOBIAS LIVADARIU</p>

        <p>
          I’m a 2nd-year Software Engineering student at the University of Waterloo, 
          passionate about building tools at the intersection of frontend design and 
          backend systems. I’ve worked on projects like DealerAI’s Admin Portal and 
          Food Banks Canada’s Exchange platform.
        </p>

        <p>
          Outside of coding, I enjoy getting lost in books and challenging myself in 
          the gym. Reading keeps my imagination sharp, and lifting keeps me grounded.
        </p>

        <p className="text-[16px]">## SKILLS & INTERESTS</p>

        <ul className="list-disc pixel-list pl-5">
          <li>Frontend: React, TypeScript, Tailwind, Pixi.js</li>
          <li>Backend: C#, .NET, SQL, CosmosDB, Azure</li>
          <li>Interests: Full-stack design (React + .NET) + scalable APIs & databases</li>
          <li>Hobbies: Reading fantasy novels, lifting weights</li>
        </ul>
      </ImageTextCaption>
    </div>
  );
}
