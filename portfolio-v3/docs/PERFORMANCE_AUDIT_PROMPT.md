# Portfolio v3 performance audit prompt

Use the following prompt for an independent audit:

> Audit this entire `portfolio-v3` codebase for production performance, then
> implement every safe, evidence-backed improvement you find. Reduce both the
> client work needed to load and run the site and the data transferred over the
> network. Preserve the site's visuals, interactions, timing, responsiveness,
> accessibility, and behavior. Only accept a minor behavior change when its
> performance benefit is substantial and the risk to the reader experience is
> demonstrably small.
>
> Before inspecting the implementation, use web search to review current,
> authoritative guidance relevant to the technologies you discover in the
> repository. Prefer primary documentation. Do not assume where the bottlenecks
> are: establish a production baseline, inspect the full codebase independently,
> measure likely hot paths and payloads, and let evidence determine what to
> change.
>
> Preserve unrelated work in the repository. Make changes in reviewable units,
> validate their actual effect, and avoid speculative complexity. Finish by
> running the project's complete lint, build, formatting, and test checks and by
> exercising its important interactions, render modes, and responsive viewport
> sizes in a production build. Report the before/after measurements, the changes
> made, any remaining limits you intentionally left alone, and the exact
> verification performed.
