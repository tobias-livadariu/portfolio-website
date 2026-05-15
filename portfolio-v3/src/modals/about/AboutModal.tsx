import BatMarkdown from "../components/BatMarkdown";
import AsciiImage from "../components/AsciiImage";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import technicalSkills from "./technical-skills.md?raw";
import {
  ABOUT_ASCII_TITLE,
  ABOUT_DIVIDER,
  ABOUT_SPRITE,
  ABOUT_TERMINAL_CONTEXT,
} from "./about.constants";

export default function AboutModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        title={ABOUT_ASCII_TITLE}
        dividerBlock={ABOUT_DIVIDER}
        dividerRepeats={13}
        leftSprite={{ ...ABOUT_SPRITE, alt: "ASCII black hole" }}
        rightSprite={{
          ...ABOUT_SPRITE,
          alt: "Rotated ASCII black hole",
          rotateQuarterTurns: 1,
        }}
      />

      <Terminal
        context={ABOUT_TERMINAL_CONTEXT}
        commands={[
          {
            command: "whoami",
            output: (
              <div className="modal-about-whoami">
                <div className="modal-about-copy">
                  <p>
                    Hi! My name is Tobias Livadariu. I&apos;m a second-year
                    undergraduate student studying Software Engineering at the
                    University of Waterloo.
                  </p>
                  <p>I love learning, and building cool things!</p>
                </div>
                <AsciiImage
                  alt="ASCII portrait of Tobias"
                  className="modal-about-face"
                  columns={38}
                  imagePath="/images/me.png"
                  rows={28}
                />
              </div>
            ),
          },
          {
            command: "bat technical-skills.md",
            output: (
              <BatMarkdown
                content={technicalSkills}
                fileName="technical-skills.md"
              />
            ),
          },
        ]}
      />
    </article>
  );
}
