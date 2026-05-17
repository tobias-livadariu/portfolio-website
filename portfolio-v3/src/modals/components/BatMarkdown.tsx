import { memo } from "react";
import type { ReactNode } from "react";

interface Props {
  content: string;
  fileName: string;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-${token}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);

      if (linkMatch) {
        const [, label, href] = linkMatch;
        nodes.push(
          <a
            href={href}
            key={`${match.index}-${href}`}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            target={href.startsWith("http") ? "_blank" : undefined}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <code key={`${match.index}-${token}`}>{token.slice(1, -1)}</code>,
      );
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function getLineClass(line: string) {
  if (line.startsWith("# ")) {
    return "modal-bat-heading modal-bat-heading-1";
  }

  if (line.startsWith("## ")) {
    return "modal-bat-heading modal-bat-heading-2";
  }

  if (line.startsWith("- ")) {
    return "modal-bat-list-item";
  }

  if (line.startsWith("|")) {
    return "modal-bat-table";
  }

  if (line.startsWith(">")) {
    return "modal-bat-quote";
  }

  return "";
}

function renderLine(line: string) {
  if (line.startsWith("# ")) {
    return renderInline(line.slice(2));
  }

  if (line.startsWith("## ")) {
    return renderInline(line.slice(3));
  }

  if (line.startsWith("- ")) {
    return (
      <>
        <span className="modal-bat-bullet">-</span>{" "}
        {renderInline(line.slice(2))}
      </>
    );
  }

  return renderInline(line);
}

function BatMarkdown({ content, fileName }: Props) {
  const lines = content.trim().split("\n");

  return (
    <div className="modal-bat" aria-label={`${fileName} rendered by bat`}>
      <div className="modal-bat-header">
        <span>File:</span>
        <span>{fileName}</span>
      </div>
      <div className="modal-bat-body">
        {lines.map((line, index) => (
          <div className="modal-bat-line" key={`${index}-${line}`}>
            <span className="modal-bat-line-number">{index + 1}</span>
            <span className={`modal-bat-line-content ${getLineClass(line)}`}>
              {renderLine(line)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BatMarkdown);
