/** Development-only switch used by the poster generator's browser session. */
export function isModalScenePosterCapture() {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get(
      "captureModalScenePosters",
    ) === "1"
  );
}
