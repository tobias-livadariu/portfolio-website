interface Props {
  block: readonly string[];
  repeats: number;
}

export default function AsciiDivider({ block, repeats }: Props) {
  const lines = block.map((line) => line.repeat(repeats));

  return (
    <pre className="modal-ascii-divider" aria-hidden="true">
      {lines.join("\n")}
    </pre>
  );
}
