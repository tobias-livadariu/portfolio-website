import { useEffect, useRef } from "react";

export default function TouchShield({ enableOnMobileOnly = true }: { enableOnMobileOnly?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Optional: enable only on mobile (≤ 600px)
    const mql = window.matchMedia("(max-width: 600px)");
    const enabled = enableOnMobileOnly ? mql.matches : true;
    if (!enabled) return;

    const cancelTouch = (e: TouchEvent) => {
      // Cancel any touch that starts/moves on background area
      e.preventDefault();
      (e as any).stopImmediatePropagation?.();
      e.stopPropagation();
    };

    const cancelPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        e.preventDefault();
        (e as any).stopImmediatePropagation?.();
        e.stopPropagation();
      }
    };

    el.addEventListener("touchstart", cancelTouch, { passive: false });
    el.addEventListener("touchmove", cancelTouch, { passive: false });
    el.addEventListener("pointerdown", cancelPointer, { passive: false });
    el.addEventListener("pointermove", cancelPointer, { passive: false });

    return () => {
      el.removeEventListener("touchstart", cancelTouch as any);
      el.removeEventListener("touchmove", cancelTouch as any);
      el.removeEventListener("pointerdown", cancelPointer as any);
      el.removeEventListener("pointermove", cancelPointer as any);
    };
  }, [enableOnMobileOnly]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0, // between canvas (-1) and UI (+1)
        pointerEvents: "auto", // must receive events to cancel them
        touchAction: "none",   // disable browser gestures on shield itself
        background: "transparent",
      }}
    />
  );
}