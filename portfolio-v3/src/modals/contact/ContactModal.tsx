import { memo } from "react";
import BatMarkdown from "../components/BatMarkdown";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import contactInformation from "./contact-information.md?raw";
import {
  CONTACT_ASCII_TITLE_PIECES,
  CONTACT_DIVIDER,
  CONTACT_SPRITE,
  CONTACT_TERMINAL_CONTEXT,
} from "./contact.constants";

const CONTACT_LEFT_SPRITE = {
  ...CONTACT_SPRITE,
  alt: "Mirrored ASCII ice planet",
  flipX: true,
} as const;

const CONTACT_RIGHT_SPRITE = {
  ...CONTACT_SPRITE,
  alt: "ASCII ice planet",
} as const;

function ContactModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        dividerBlock={CONTACT_DIVIDER}
        leftSprite={CONTACT_LEFT_SPRITE}
        rightSprite={CONTACT_RIGHT_SPRITE}
        titlePieces={CONTACT_ASCII_TITLE_PIECES}
      />

      <Terminal
        context={CONTACT_TERMINAL_CONTEXT}
        commands={[
          {
            command: "bat contact-information.md",
            output: (
              <BatMarkdown
                content={contactInformation}
                fileName="contact-information.md"
              />
            ),
          },
        ]}
      />
    </article>
  );
}

export default memo(ContactModal);
