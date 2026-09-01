import { useEffect, useRef, useState } from "react";

/* Creating a Canvas allocates a WebGL context even when its frame loop is set
   to demand. Mount off-screen modal scenes once, shortly before they approach
   the viewport, then retain them so scrolling never recreates GPU resources. */
export default function useProgressiveCanvasMount<
  TElement extends HTMLElement,
>() {
  const elementRef = useRef<TElement>(null);
  const hasIntersectionObserver = typeof IntersectionObserver !== "undefined";
  const [isNearViewport, setIsNearViewport] = useState(
    () => !hasIntersectionObserver,
  );
  const [shouldMountCanvas, setShouldMountCanvas] = useState(
    () => !hasIntersectionObserver,
  );

  useEffect(() => {
    const element = elementRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isNear = entry?.isIntersecting ?? false;

        setIsNearViewport(isNear);
        if (isNear) {
          setShouldMountCanvas(true);
        }
      },
      { rootMargin: "100% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { elementRef, isNearViewport, shouldMountCanvas };
}
