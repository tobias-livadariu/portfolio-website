import { useDeferredValue, useMemo } from "react";
import { TerminalTranscriptLine } from "./Terminal";
import { useTerminalContentColumns } from "./use-terminal-content-columns";

export interface LsRow {
  date: string;
  href?: string;
  name: string;
  permissions?: string;
  size?: string;
  type?: "dir" | "file" | "link";
  user?: string;
}

const CAT_CLASSES = [
  "modal-cat-c0",
  "modal-cat-c1",
  "modal-cat-c2",
  "modal-cat-c3",
  "modal-cat-c4",
  "modal-cat-c5",
] as const;

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

export function Permissions({ value }: { value: string }) {
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

export function LsOutputLine({ row }: { row: LsRow }) {
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

export function WrappedTextOutput({
  firstLineNumber,
  text,
}: {
  firstLineNumber: number;
  text: string;
}) {
  const { columns, measureRef, wrapperRef } = useTerminalContentColumns({
    fallback: 72,
    min: 22,
    step: 2,
  });
  /* Defer the wrap recomputation off the high-priority resize render so the
     window resize stays smooth — the wrap (and its ~2,000 colorized spans)
     re-resolves on a follow-up render once React is idle. */
  const deferredColumns = useDeferredValue(columns);
  const lines = useMemo(() => {
    const paragraphs = normalizeWrappedText(text);
    const wrapped: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      if (index > 0) {
        wrapped.push("");
      }

      wrapped.push(...wrapParagraph(paragraph, deferredColumns));
    });

    return wrapped;
  }, [deferredColumns, text]);

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
            {line ? colorizeCatLine(line, lineNumber) : " "}
          </TerminalTranscriptLine>
        );
      })}
    </div>
  );
}
