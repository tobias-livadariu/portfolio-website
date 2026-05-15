import type { ReactNode } from "react";

export type ModalSectionKey = "about" | "resume" | "portfolio" | "contactMe";

export type GitStateToken =
  | "conflict"
  | "deleted"
  | "renamed"
  | "modified"
  | "stagedDeleted"
  | "staged"
  | "untracked";

export interface TerminalContext {
  branch?: string;
  directory: string;
  gitState?: GitStateToken[];
}

export interface TerminalCommand {
  command: string;
  context?: Partial<TerminalContext>;
  output?: ReactNode;
}

export interface ModalSectionDefinition {
  key: ModalSectionKey;
  label: string;
  shortLabel: string;
}
