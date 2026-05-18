import { memo, useEffect, useMemo, useRef, useState } from "react";
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

export interface LsRow {
  date: string;
  href?: string;
  name: string;
  permissions?: string;
  size?: string;
  type?: "dir" | "file" | "link";
  user?: string;
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

function getPermissionClassName(character: string) {
  if (character === ".") {
    return "dot";
  }

  if (character === "-") {
    return "dash";
  }

  if (character === "@") {
    return "attr";
  }

  return character;
}

function Permissions({ value }: { value: string }) {
  return (
    <span className="modal-ls-perms">
      {Array.from(value).map((character, index) => (
        <span
          className={`modal-ls-perm modal-ls-perm-${getPermissionClassName(
            character,
          )}`}
          key={index}
        >
          {character}
        </span>
      ))}
    </span>
  );
}

const GUTTER_COLORS = [
  "var(--dragon-yellow)",
  "var(--dragon-orange)",
  "var(--dragon-pink)",
  "var(--dragon-lavender)",
  "var(--dragon-cyan)",
  "var(--dragon-mint)",
] as const;

const CAT_CLASSES = [
  "modal-cat-c0",
  "modal-cat-c1",
  "modal-cat-c2",
  "modal-cat-c3",
  "modal-cat-c4",
  "modal-cat-c5",
] as const;

function getGutterStyle(lineNumber: number) {
  return {
    "--modal-terminal-gutter-color":
      GUTTER_COLORS[(lineNumber - 1) % GUTTER_COLORS.length],
  } as CSSProperties;
}

function colorizeCatLine(text: string, lineNumber: number) {
  const baseOffset = (lineNumber - 1) % CAT_CLASSES.length;
  return Array.from(text, (character, index) => (
    <span
      className={CAT_CLASSES[(baseOffset + index) % CAT_CLASSES.length]}
      key={index}
    >
      {character}
    </span>
  ));
}

function isOutputBlock(output: TerminalOutput): output is TerminalOutputBlock {
  return "kind" in output && output.kind === "block";
}

function normalizeOutputLine(output: TerminalOutputLine) {
  return output;
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

function CommandLine({
  command,
  context,
}: {
  command: string;
  context: TerminalContext;
}) {
  return (
    <span className="modal-terminal-command">
      <span className="modal-terminal-cursor">%</span>{" "}
      <span className="modal-command-text">{command}</span>
    </span>
  );
}

function LsOutputLine({ row }: { row: LsRow }) {
  const content = row.href ? (
    <a href={row.href} target="_blank" rel="noreferrer">
      {row.name}
    </a>
  ) : (
    row.name
  );

  return (
    <span className="modal-ls-row" role="listitem">
      <Permissions
        value={
          row.permissions ??
          (row.type === "dir" ? "drwxr-xr-x@" : ".rw-r--r--@")
        }
      />
      <span className="modal-ls-size">{row.size ?? "128"}</span>
      <span className="modal-ls-user">{row.user ?? "tobias"}</span>
      <span className="modal-ls-date">{row.date}</span>
      <span className={`modal-ls-name modal-ls-name-${row.type ?? "file"}`}>
        {content}
      </span>
    </span>
  );
}

export function lsOutputRows(rows: readonly LsRow[]): TerminalOutputLine[] {
  return rows.map((row) => ({
    className: "modal-terminal-line-ls",
    content: <LsOutputLine row={row} />,
  }));
}

export function TerminalNote({ children }: { children: ReactNode }) {
  return <span className="modal-terminal-note">{children}</span>;
}

export function plainTextRows(
  lines: readonly ReactNode[],
  className?: string,
): TerminalOutputLine[] {
  return lines.map((line) => ({
    className: className ?? "modal-terminal-line-text",
    content: line === "" ? "\u00a0" : line,
  }));
}

function normalizeWrappedText(text: string) {
  return text
    .trimEnd()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split(/\n+/).join(" ").replace(/\s+/g, " "))
    .filter(Boolean);
}

function wrapParagraph(paragraph: string, maxCharacters: number) {
  const words = paragraph.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= maxCharacters) {
      current = `${current} ${word}`;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function useTerminalCharacterCapacity() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [maxCharacters, setMaxCharacters] = useState(72);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    const terminalBody = wrapper?.closest(".modal-terminal-body");

    if (!wrapper || !measure || !(terminalBody instanceof HTMLElement)) {
      return;
    }

    const update = () => {
      const contentColumn = terminalBody.querySelector(
        ".modal-terminal-line-content",
      );
      const contentWidth =
        contentColumn instanceof HTMLElement
          ? contentColumn.getBoundingClientRect().width
          : terminalBody.clientWidth;
      const characterWidth = measure.getBoundingClientRect().width / 24;

      if (contentWidth <= 0 || characterWidth <= 0) {
        return;
      }

      setMaxCharacters(Math.max(22, Math.floor(contentWidth / characterWidth)));
    };

    update();
    void document.fonts?.ready.then(update);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(terminalBody);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { maxCharacters, measureRef, wrapperRef };
}

function WrappedTextOutput({
  firstLineNumber,
  text,
}: {
  firstLineNumber: number;
  text: string;
}) {
  const { maxCharacters, measureRef, wrapperRef } =
    useTerminalCharacterCapacity();
  const lines = useMemo(() => {
    const paragraphs = normalizeWrappedText(text);
    const wrapped: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      if (index > 0) {
        wrapped.push("");
      }

      wrapped.push(...wrapParagraph(paragraph, maxCharacters));
    });

    return wrapped;
  }, [maxCharacters, text]);

  return (
    <div className="modal-terminal-wrapped-output" ref={wrapperRef}>
      <span className="modal-terminal-ch-measure" ref={measureRef}>
        000000000000000000000000
      </span>
      {lines.map((line, index) => {
        const lineNumber = firstLineNumber + index;
        return (
          <TerminalTranscriptLine
            className="modal-terminal-line-text"
            key={`${index}-${line}`}
            lineNumber={lineNumber}
          >
            {line ? colorizeCatLine(line, lineNumber) : "\u00a0"}
          </TerminalTranscriptLine>
        );
      })}
    </div>
  );
}

export function wrappedTextOutput(text: string): TerminalOutputBlock {
  return {
    kind: "block",
    lineCount: 0,
    render: (firstLineNumber) => (
      <WrappedTextOutput firstLineNumber={firstLineNumber} text={text} />
    ),
  };
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
        content: (
          <CommandLine command={entry.command} context={commandContext} />
        ),
      },
      lineNumber,
    });
    lineNumber += 1;

    entry.output?.forEach((output) => {
      if (isOutputBlock(output)) {
        rows.push({
          firstLineNumber: lineNumber,
          kind: "block",
          render: output.render,
        });
        lineNumber += output.lineCount;
        return;
      }

      const outputLine = normalizeOutputLine(output);
      rows.push({
        kind: "line",
        line: outputLine,
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
