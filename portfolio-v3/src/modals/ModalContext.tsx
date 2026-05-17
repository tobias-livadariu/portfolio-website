import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ModalContext } from "./modal-context-core";
import { getModalIndex } from "./modals.constants";
import type { ModalSectionKey } from "./modal.types";

export interface ModalNavigationRequest {
  id: number;
  section: ModalSectionKey | null;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<ModalSectionKey | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] =
    useState<ModalNavigationRequest | null>(null);

  const openSection = useCallback((section: ModalSectionKey) => {
    setIsOpen(true);
    setActiveSection(section);
    setNavigationRequest((previousRequest) => ({
      id: (previousRequest?.id ?? 0) + 1,
      section,
    }));
  }, []);

  const close = useCallback(() => {
    setNavigationRequest((previousRequest) => ({
      id: (previousRequest?.id ?? 0) + 1,
      section: null,
    }));
  }, []);

  const value = useMemo(
    () => ({
      activeIndex: getModalIndex(activeSection),
      activeSection,
      close,
      isOpen,
      navigationRequest,
      openSection,
      setActiveSection,
      setIsOpen,
    }),
    [
      activeSection,
      close,
      isOpen,
      navigationRequest,
      openSection,
      setActiveSection,
      setIsOpen,
    ],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
