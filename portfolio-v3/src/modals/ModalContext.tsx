import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ModalContext, type OpenSectionOptions } from "./modal-context-core";
import type { ModalSectionKey } from "./modal.types";

export interface ModalNavigationRequest {
  id: number;
  moveFocus?: boolean;
  section: ModalSectionKey | null;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] =
    useState<ModalNavigationRequest | null>(null);

  const openSection = useCallback(
    (section: ModalSectionKey, options?: OpenSectionOptions) => {
      setIsOpen(true);
      setNavigationRequest((previousRequest) => ({
        id: (previousRequest?.id ?? 0) + 1,
        moveFocus: options?.moveFocus,
        section,
      }));
    },
    [],
  );

  const close = useCallback(() => {
    setNavigationRequest((previousRequest) => ({
      id: (previousRequest?.id ?? 0) + 1,
      section: null,
    }));
  }, []);

  const value = useMemo(
    () => ({
      close,
      isOpen,
      navigationRequest,
      openSection,
      setIsOpen,
    }),
    [close, isOpen, navigationRequest, openSection, setIsOpen],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
