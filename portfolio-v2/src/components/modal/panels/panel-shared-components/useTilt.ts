import { useEffect, useRef } from "react";

type Options = {
  maxDeg?: number;   // default 8
  scale?: number;    // default 1.02
};

export function useTilt<T extends HTMLElement>({ maxDeg = 8, scale = 1.02 }: Options = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // disable tilt

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rx = (dy * maxDeg) * -1; // invert for intuitive tilt
      const ry = dx * maxDeg;
      el.style.setProperty('--tx', String(rx));
      el.style.setProperty('--ty', String(ry));
      el.style.setProperty('--tilt-scale', String(scale));
      // for glare
      const sx = (dx + 1) / 2; // 0..1
      const sy = (dy + 1) / 2; // 0..1
      el.style.setProperty('--sx', String(sx));
      el.style.setProperty('--sy', String(sy));
    };

    const onLeave = () => {
      el.style.setProperty('--tx', '0');
      el.style.setProperty('--ty', '0');
      el.style.setProperty('--sx', '0.5');
      el.style.setProperty('--sy', '0.5');
      el.style.setProperty('--tilt-scale', '1');
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [maxDeg, scale]);

  return ref;
}