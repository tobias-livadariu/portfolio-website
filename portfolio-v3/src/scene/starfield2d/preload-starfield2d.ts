/* Single shared dynamic import so React.lazy (in PortfolioCanvas) and the
   transition preload (in BackgroundModeProvider) resolve the same chunk. */
export function preloadStarfield2D() {
  return import("./Starfield2D");
}
