import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ModalSectionKey } from "./modal.types";

export interface ModalContextValue {
  close: () => void;
  isOpen: boolean;
  navigationRequest: {
    id: number;
    section: ModalSectionKey | null;
  } | null;
  openSection: (section: ModalSectionKey) => void;
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
