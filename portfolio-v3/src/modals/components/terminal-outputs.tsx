import type { ReactNode } from "react";
import type { TerminalOutputBlock, TerminalOutputLine } from "../modal.types";
import HolographicStoryScene from "./HolographicStoryScene";
import type { HolographicStoryDefinition } from "./HolographicStoryScene";
import { LsOutputLine, type LsRow } from "./terminal-internals";

export type { LsRow };
export { useTerminalContentColumns } from "./use-terminal-content-columns";

export function lsOutputRows(rows: readonly LsRow[]): TerminalOutputLine[] {
  return rows.map((row) => ({
    className: "modal-terminal-line-ls",
    content: <LsOutputLine row={row} />,
  }));
}

export function plainTextRows(
  lines: readonly ReactNode[],
  className?: string,
): TerminalOutputLine[] {
  return lines.map((line) => ({
    className: className ?? "modal-terminal-line-text",
    content: line === "" ? " " : line,
  }));
}

export function holographicStoryOutput(
  definition: HolographicStoryDefinition,
): TerminalOutputBlock {
  return {
    kind: "block",
    lineCount: 0,
    render: (firstLineNumber) => (
      <HolographicStoryScene
        definition={definition}
        firstLineNumber={firstLineNumber}
      />
    ),
  };
}
