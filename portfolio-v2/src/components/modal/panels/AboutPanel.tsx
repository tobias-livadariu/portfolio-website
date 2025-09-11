export default function AboutPanel() {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <div className="flex flex-col items-center flex-shrink-0">
        <img
          src="/images/me.png" /* replace with your path */
          alt="Tobias portrait"
          className="md:w-[20vw] h-auto object-cover"
        />
        <p className="hidden md:block text-[14px] text-lightish-gray mt-2 text-center md:text-left">
          A drawing of my face made by a friend
        </p>
      </div>

      <div className="space-y-4 text-light-gray leading-relaxed text-[16px]">
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
      </div>
    </div>
  );
}
