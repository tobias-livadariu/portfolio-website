import { memo } from "react";
import type { ReactNode } from "react";
import { GIT_STATE_LABELS, MODAL_SECTIONS } from "../modals.constants";
import type {
  GitStateToken,
  TerminalCommand,
  TerminalContext,
} from "../modal.types";

interface Props {
  commands: readonly TerminalCommand[];
  context: TerminalContext;
}

interface LsRow {
  date: string;
  href?: string;
  name: string;
  permissions?: string;
  size?: string;
  type?: "dir" | "file" | "link";
  user?: string;
}

interface LsOutputProps {
  rows: readonly LsRow[];
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

function PromptContext({ context }: { context: TerminalContext }) {
  const branch = context.branch ?? "main";
  const gitState = context.gitState ?? [];
  const directory = getPromptDirectory(context.directory);

  return (
    <div className="modal-terminal-prompt">
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
    </div>
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
    <div className="modal-terminal-command">
      <PromptContext context={context} />
      <div>
        <span className="modal-terminal-cursor">%</span>{" "}
        <span className="modal-command-text">{command}</span>
      </div>
    </div>
  );
}

export function LsOutput({ rows }: LsOutputProps) {
  return (
    <div className="modal-ls-output" role="list">
      {rows.map((row) => {
        const content = row.href ? (
          <a href={row.href} target="_blank" rel="noreferrer">
            {row.name}
          </a>
        ) : (
          row.name
        );

        return (
          <div className="modal-ls-row" key={row.name} role="listitem">
            <Permissions
              value={
                row.permissions ??
                (row.type === "dir" ? "drwxr-xr-x@" : ".rw-r--r--@")
              }
            />
            <span className="modal-ls-size">{row.size ?? "128"}</span>
            <span className="modal-ls-user">{row.user ?? "tobias"}</span>
            <span>{row.date}</span>
            <span
              className={`modal-ls-name modal-ls-name-${row.type ?? "file"}`}
            >
              {content}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TerminalNote({ children }: { children: ReactNode }) {
  return <div className="modal-terminal-note">{children}</div>;
}

function Terminal({ commands, context }: Props) {
  return (
    <div className="modal-terminal" aria-label="terminal transcript">
      <div className="modal-terminal-topbar">
        <span>zsh</span>
        <span className="modal-terminal-topbar-path">
          {getPromptDirectory(context.directory)}
        </span>
        <span>
          {MODAL_SECTIONS.find((section) =>
            context.directory.toLowerCase().includes(section.shortLabel),
          )?.label ?? "portfolio"}
        </span>
      </div>
      <div className="modal-terminal-body">
        {commands.map((entry, index) => {
          const commandContext = {
            ...context,
            ...entry.context,
          };

          return (
            <div
              className="modal-terminal-entry"
              key={`${entry.command}-${index}`}
            >
              <CommandLine command={entry.command} context={commandContext} />
              {entry.output && (
                <div className="modal-terminal-output">{entry.output}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(Terminal);
