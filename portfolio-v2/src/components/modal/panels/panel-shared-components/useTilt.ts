import { useEffect, useRef, useCallback } from "react";

type Options = {
  maxDeg?: number;   // default 8
  scale?: number;    // default 1.02
};

export function useTilt<T extends HTMLElement>({ maxDeg = 8, scale = 1.02 }: Options = {}) {
  const ref = useRef<T | null>(null);

  // Public reset function that can be called externally
  const resetTilt = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    el.style.setProperty('--tx', '0');
    el.style.setProperty('--ty', '0');
    el.style.setProperty('--sx', '0.5');
    el.style.setProperty('--sy', '0.5');
    el.style.setProperty('--tilt-scale', '1');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // disable tilt

    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const applyTilt = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (clientX - cx) / (rect.width / 2);
      const dy = (clientY - cy) / (rect.height / 2);
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

    const onMouseMove = (e: MouseEvent) => {
      if (isTouchDevice) return; // Don't handle mouse events on touch devices
      applyTilt(e.clientX, e.clientY);
    };

    const onMouseLeave = () => {
      if (isTouchDevice) return; // Don't handle mouse events on touch devices
      resetTilt();
    };

    // Touch event handlers for mobile
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        applyTilt(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        applyTilt(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = () => {
      resetTilt();
    };

    if (isTouchDevice) {
      // Touch device: use touch events
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    } else {
      // Desktop: use mouse events
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      if (isTouchDevice) {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      } else {
        el.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [maxDeg, scale, resetTilt]);

  return { ref, resetTilt };
}