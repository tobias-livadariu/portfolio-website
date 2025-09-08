import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useModal } from "../modal/ModalContext";

export default function PixelModal({ children, title }: { children: React.ReactNode; title: string }) {
  const { key, close } = useModal();
  const panelRef = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      {key && (
        <motion.div
          aria-hidden={false}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
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
            className="relative pixel-frame w-[70vw] h-[80vh] bg-[#070B14] text-campfire overflow-hidden grid grid-rows-[auto,1fr] transform-gpu [will-change:transform]"
            style={{ contain: 'layout paint size' }}
            initial={{ y: "100vh" }}
            animate={{ y: 0 }}
            exit={{ y: "100vh" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-campfire-ash/10">
              <h2 className="font-pixelemu text-[18px]">{title}</h2>
              <button
                data-autofocus
                onClick={close}
                className="pixel-btn font-pixelemu text-[14px] px-3 py-1 bg-campfire-ash/20 hover:bg-campfire-ash/30"
              >
                CLOSE
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
