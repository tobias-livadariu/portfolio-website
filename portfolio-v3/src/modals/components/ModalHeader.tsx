import AsciiDivider from "./AsciiDivider";
import AsciiImage from "./AsciiImage";

interface SpriteConfig {
  alt: string;
  atlasKey: string;
  columns: number;
  imagePath: string;
  jsonPath: string;
  rotateQuarterTurns?: number;
  rows: number;
}

interface Props {
  dividerBlock: readonly string[];
  dividerRepeats: number;
  leftSprite: SpriteConfig;
  title: string;
  rightSprite: SpriteConfig;
}

export default function ModalHeader({
  dividerBlock,
  dividerRepeats,
  leftSprite,
  rightSprite,
  title,
}: Props) {
  return (
    <header className="modal-section-header">
      <div className="modal-section-title-row">
        <AsciiImage className="modal-header-sprite" {...leftSprite} />
        <pre className="modal-ascii-title">{title}</pre>
        <AsciiImage className="modal-header-sprite" {...rightSprite} />
      </div>
      <AsciiDivider block={dividerBlock} repeats={dividerRepeats} />
    </header>
  );
}
