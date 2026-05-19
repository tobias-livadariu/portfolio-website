import { memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { GIT_STATE_LABELS } from "../modals.constants";
import type {
  GitStateToken,
  TerminalCommand,
  TerminalContext,
  TerminalOutput,
  TerminalOutputBlock,
  TerminalOutputLine,
} from "../modal.types";

interface Props {
  commands: readonly TerminalCommand[];
  context: TerminalContext;
}

interface RenderedTerminalLine {
  className?: string;
  content: ReactNode;
  isEntryStart?: boolean;
}

function getGitTokenClass(token: GitStateToken) {
  return `modal-git-state modal-git-state-${token}`;
}

function getPromptDirectory(directory: string) {
  const segments = directory.split("/").filter(Boolean);
  const visibleSegments =
    segments[0] === "repos" ? segments.slice(1) : segments.slice();

  if (visibleSegments.length <= 2) {
    return visibleSegments.join("/");
  }

  return visibleSegments.slice(-2).join("/");
}

const GUTTER_COLORS = [
  "var(--dragon-yellow)",
  "var(--dragon-orange)",
  "var(--dragon-pink)",
  "var(--dragon-lavender)",
  "var(--dragon-cyan)",
  "var(--dragon-mint)",
] as const;

function getGutterStyle(lineNumber: number) {
  return {
    "--modal-terminal-gutter-color":
      GUTTER_COLORS[(lineNumber - 1) % GUTTER_COLORS.length],
  } as CSSProperties;
}

function isOutputBlock(output: TerminalOutput): output is TerminalOutputBlock {
  return "kind" in output && output.kind === "block";
}

export function TerminalTranscriptLine({
  children,
  className,
  isEntryStart = false,
  lineNumber,
}: {
  children: ReactNode;
  className?: string;
  isEntryStart?: boolean;
  lineNumber: number;
}) {
  return (
    <div
      className={`modal-terminal-line ${
        isEntryStart ? "modal-terminal-line-entry-start" : ""
      } ${className ?? ""}`.trim()}
      style={getGutterStyle(lineNumber)}
    >
      <span className="modal-terminal-gutter" aria-hidden="true">
        <span>#</span>
        <span>{lineNumber}</span>
        <span>|</span>
      </span>
      <span className="modal-terminal-line-content">{children}</span>
    </div>
  );
}

function PromptContext({ context }: { context: TerminalContext }) {
  const branch = context.branch ?? "main";
  const gitState = context.gitState ?? [];
  const directory = getPromptDirectory(context.directory);

  return (
    <span className="modal-terminal-prompt">
      <span className="modal-prompt-at">@</span>
      <span className="modal-prompt-dir">{directory}</span>
      <span className="modal-prompt-separator"> | </span>
      <span className="modal-prompt-branch">{branch}</span>
      {gitState.length > 0 && <span> </span>}
      {gitState.map((token) => (
        <span className={getGitTokenClass(token)} key={token}>
          {GIT_STATE_LABELS[token]}
        </span>
      ))}
    </span>
  );
}

function CommandLine({ command }: { command: string }) {
  return (
    <span className="modal-terminal-command">
      <span className="modal-terminal-cursor">%</span>{" "}
      <span className="modal-command-text">{command}</span>
    </span>
  );
}

export function TerminalNote({ children }: { children: ReactNode }) {
  return <span className="modal-terminal-note">{children}</span>;
}

function Terminal({ commands, context }: Props) {
  const rows: Array<
    | {
        kind: "line";
        line: RenderedTerminalLine;
        lineNumber: number;
      }
    | {
        firstLineNumber: number;
        kind: "block";
        render: (firstLineNumber: number) => ReactNode;
      }
  > = [];
  let lineNumber = 1;

  commands.forEach((entry) => {
    const commandContext = {
      ...context,
      ...entry.context,
    };

    rows.push({
      kind: "line",
      line: {
        className: "modal-terminal-line-prompt",
        content: <PromptContext context={commandContext} />,
        isEntryStart: true,
      },
      lineNumber,
    });
    lineNumber += 1;

    rows.push({
      kind: "line",
      line: {
        className: "modal-terminal-line-command",
        content: <CommandLine command={entry.command} />,
      },
      lineNumber,
    });
    lineNumber += 1;

    entry.output?.forEach((output: TerminalOutput) => {
      if (isOutputBlock(output)) {
        rows.push({
          firstLineNumber: lineNumber,
          kind: "block",
          render: output.render,
        });
        lineNumber += output.lineCount;
        return;
      }

      rows.push({
        kind: "line",
        line: output as TerminalOutputLine,
        lineNumber,
      });
      lineNumber += 1;
    });
  });

  return (
    <div className="modal-terminal" aria-label="terminal transcript">
      <div className="modal-terminal-body">
        {rows.map((row, index) =>
          row.kind === "block" ? (
            <div className="modal-terminal-block" key={`block-${index}`}>
              {row.render(row.firstLineNumber)}
            </div>
          ) : (
            <TerminalTranscriptLine
              className={row.line.className}
              isEntryStart={row.line.isEntryStart}
              key={`line-${row.lineNumber}-${index}`}
              lineNumber={row.lineNumber}
            >
              {row.line.content}
            </TerminalTranscriptLine>
          ),
        )}
      </div>
    </div>
  );
}

export default memo(Terminal);
