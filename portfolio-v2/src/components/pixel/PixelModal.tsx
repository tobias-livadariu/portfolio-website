import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useModal } from "../modal/ModalContext";

export default function PixelModal({ children, title }: { children: React.ReactNode; title: string }) {
  const { key, close } = useModal();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // Escape to close
  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, close]);

  // Auto‑focus the close button or first focusable
  useEffect(() => {
    if (!key) return;
    const el = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")
           ?? panelRef.current?.querySelector<HTMLElement>("button, a, input, textarea, select");
    el?.focus?.();
  }, [key]);

  // Recalculate modal height = min(contentHeight, 80vh)
  useLayoutEffect(() => {
    if (!key) return; // only when open

    const recalc = () => {
      const bodyEl = bodyRef.current;
      if (!bodyEl) return;
      // header height is body.offsetTop relative to panel
      const headerBottom = bodyEl.offsetTop;
      const bodyScroll = bodyEl.scrollHeight; // full body content height
      const total = headerBottom + bodyScroll;
      const cap = Math.floor(Math.min(total, window.innerHeight * 0.9));
      setHeight(cap);
    };

    // Initial calc on open
    requestAnimationFrame(recalc);

    // Observe content growth/shrink
    const ro = new ResizeObserver(() => recalc());
    if (bodyRef.current) ro.observe(bodyRef.current);

    // Recalc on window resize
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [key, children]);

  return (
    <AnimatePresence>
      {key && (
        <motion.div
          aria-hidden={false}
          className="fixed inset-0 z-[60] flex items-start pt-8 sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop: remove backdrop-blur to avoid expensive sampling over WebGL */}
          <div
            className="absolute inset-0 bg-black/65"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            ref={panelRef}
            className="relative pixel-frame w-[70vw] bg-[#070B14] text-campfire overflow-hidden flex flex-col transform-gpu [will-change:transform]"
            style={{ contain: 'layout paint size', height }}
            initial={{ y: "100vh" }}
            animate={{ y: 0 }}
            exit={{ y: "100vh" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-campfire-ash/10 pt-[16px] pb-[18px]">
              <h2 className="font-pixelemu lg:text-[24px]">{title}</h2>
              <button
                data-autofocus
                onClick={close}
                className="pixel-btn font-pixelemu text-[14px] px-3 py-1 bg-campfire-ash/20 hover:bg-campfire-ash/30"
              >
                CLOSE
              </button>
            </div>

            {/* Body */}
            <div ref={bodyRef} className="p-4 overflow-y-auto pm-scrollbar flex flex-col items-start">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
