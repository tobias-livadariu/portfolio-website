import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type ModalKey = "about" | "resume" | "portfolio" | "contact" | null;

interface ModalState {
  key: ModalKey;
  open: (key: Exclude<ModalKey, null>) => void;
  close: () => void;
  lastActive: HTMLElement | null;
}

const Ctx = createContext<ModalState | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<ModalKey>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  const open = (next: Exclude<ModalKey, null>) => {
    lastActiveRef.current = (document.activeElement as HTMLElement) ?? null;
    setKey(next);
    // lock body scroll
    document.documentElement.style.overflow = "hidden";
  };

  const close = () => {
    setKey(null);
    document.documentElement.style.overflow = "";
    // restore focus
    lastActiveRef.current?.focus?.();
  };

  return (
    <Ctx.Provider value={{ key, open, close, lastActive: lastActiveRef.current }}>
      {children}
    </Ctx.Provider>
  );
}

export function useModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}
