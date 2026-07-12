/**
 * Blurbs for the ink story scenes. Each string lands inside one ink splotch,
 * in order along the scene's path.
 */

export const SHOPIFY_STORY_BLURBS = [
  "My first weeks on Shopify's marketing analytics team, I started " +
    "small: fixed marketing report pages crashing for about 150 shops a " +
    "day, then picked up smaller frontend fixes across admin while I " +
    "learned how the team's data actually flowed.",
  "By the end, I was leading a bigger rebuild: pulling marketing report " +
    "pages off a legacy pipeline and having them query sales data live " +
    "instead, cutting infrastructure costs and clearing out a source of " +
    "frequent on-call incidents for the team.",
] as const;

export const IDEANOTION_STORY_BLURBS = [
  "I built a tiny settings toggle in .NET and CosmosDB so dealership " +
    "staff would not have to reconfigure it every login. It only saved a " +
    "minute or two each time, but multiplied across 400+ staff, I learned " +
    "how much scale changes what counts as small.",
  "I built the chat summarizer for our AI dealership platform, wiring " +
    "React to a .NET endpoint that called OpenAI. Cutting the prompt by " +
    "90% without losing accuracy taught me that better AI features come " +
    "from editing down, not adding more instructions.",
  "Migrating 5 old .NET controllers, 62 endpoints, and 55 DTOs to EF " +
    "Core was my first real legacy codebase. Doing it in pieces instead " +
    "of all at once taught me that a big rewrite is really just a lot of " +
    "small, careful ones.",
] as const;
