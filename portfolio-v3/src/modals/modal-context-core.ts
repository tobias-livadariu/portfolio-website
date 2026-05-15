import { createContext, useContext } from "react";
import type { ModalSectionKey } from "./modal.types";

export interface ModalContextValue {
  activeIndex: number;
  activeSection: ModalSectionKey | null;
  close: () => void;
  dragOffsetPx: number;
  openSection: (section: ModalSectionKey) => void;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModalController() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModalController must be used within ModalProvider");
  }

  return context;
}
