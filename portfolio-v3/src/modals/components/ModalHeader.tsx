import type { CSSProperties } from "react";
import AsciiDivider from "./AsciiDivider";
import AsciiImage from "./AsciiImage";

interface SpriteConfig {
  alt: string;
  atlasKey: string;
  columns: number;
  flipX?: boolean;
  flipY?: boolean;
  imagePath: string;
  jsonPath: string;
  rotateQuarterTurns?: number;
  rows: number;
}

interface Props {
  dividerBlock: readonly string[];
  dividerMinGapCh?: number;
  dividerMinSideMarginCh?: number;
  leftSprite: SpriteConfig;
  rightSprite: SpriteConfig;
  titleGapFirstCh?: number;
  titleGapSecondCh?: number;
  titlePieces: readonly (readonly string[])[];
}

export default function ModalHeader({
  dividerBlock,
  dividerMinGapCh,
  dividerMinSideMarginCh,
  leftSprite,
  rightSprite,
  titleGapFirstCh = 4,
  titleGapSecondCh = 2,
  titlePieces,
}: Props) {
  const dividerSideMarginCh = dividerMinSideMarginCh ?? 1;

  return (
    <header
      className="modal-section-header"
      style={
        {
          "--modal-header-mobile-title-indent": `${dividerSideMarginCh * 1.4}ch`,
        } as CSSProperties
      }
    >
      <AsciiDivider
        block={dividerBlock}
        minGapCh={dividerMinGapCh}
        minSideMarginCh={dividerMinSideMarginCh}
      />
      <div className="modal-section-title-row">
        <AsciiImage className="modal-header-sprite" {...leftSprite} />
        <div
          className="modal-ascii-title"
          style={
            {
              "--modal-title-gap-first": `${titleGapFirstCh}ch`,
              "--modal-title-gap-second": `${titleGapSecondCh}ch`,
            } as CSSProperties
          }
        >
          {titlePieces.map((piece, index) => (
            <pre className="modal-ascii-title-piece" key={index}>
              {piece.join("\n")}
            </pre>
          ))}
        </div>
        <AsciiImage className="modal-header-sprite" {...rightSprite} />
      </div>
      <AsciiDivider
        block={dividerBlock}
        minGapCh={dividerMinGapCh}
        minSideMarginCh={dividerMinSideMarginCh}
      />
    </header>
  );
}
