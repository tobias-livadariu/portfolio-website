export interface LsRow {
  date: string;
  href?: string;
  name: string;
  permissions?: string;
  size?: string;
  type?: "dir" | "exec" | "file" | "link";
  user?: string;
}

const DEFAULT_PERMISSIONS: Record<
  NonNullable<LsRow["type"]>,
  string
> = {
  dir: "drwxr-xr-x@",
  exec: ".rwxr-xr-x@",
  file: ".rw-r--r--@",
  link: ".rw-r--r--@",
};

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
        value={row.permissions ?? DEFAULT_PERMISSIONS[row.type ?? "file"]}
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

