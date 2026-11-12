import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ModalSectionKey } from "./modal.types";

export interface OpenSectionOptions {
  /* Also move keyboard focus into the section's toolbar. Used when the
     section is opened from the keyboard, so the next Tab continues inside
     the document that just opened. */
  moveFocus?: boolean;
}

export interface ModalContextValue {
  close: () => void;
  isOpen: boolean;
  navigationRequest: {
    id: number;
    moveFocus?: boolean;
    section: ModalSectionKey | null;
  } | null;
  openSection: (section: ModalSectionKey, options?: OpenSectionOptions) => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModalController() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModalController must be used within ModalProvider");
  }

  return context;
}
