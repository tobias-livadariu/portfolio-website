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
  gitState?: readonly GitStateToken[];
}

export interface TerminalOutputLine {
  className?: string;
  content: ReactNode;
}

export interface TerminalOutputBlock {
  kind: "block";
  lineCount: number;
  render: (firstLineNumber: number) => ReactNode;
}

export type TerminalOutput = TerminalOutputLine | TerminalOutputBlock;

export interface TerminalCommand {
  command: string;
  context?: Partial<TerminalContext>;
  output?: readonly TerminalOutput[];
}

export interface ModalSectionDefinition {
  key: ModalSectionKey;
  label: string;
  shortLabel: string;
}
