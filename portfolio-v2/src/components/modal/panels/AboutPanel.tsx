export default function AboutPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 items-start">
      <img
        src="/images/me.png" /* replace with your path */
        alt="Tobias portrait"
        className="img-pixelated w-[180px] h-[180px] mx-auto md:mx-0 object-cover"
      />

      <div className="space-y-3 leading-relaxed text-[15px]">
        <p>
          Hi! I'm Tobias, a Waterloo SE student. I've built things across React/TS, Redux, .NET/C#, CosmosDB, and more. I love performance‑minded UI and playful pixel aesthetics.
        </p>
        <ul className="list-disc pl-5">
          <li>IdeaNotion — DealerAI Admin Portal (React/Redux), FBC Exchange</li>
          <li>RL/AB‑testing explorations for pricing & loyalty</li>
          <li>Hobby: graphics & starfields (Pixi)</li>
        </ul>
      </div>
    </div>
  );
}
