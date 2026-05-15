import BatMarkdown from "../components/BatMarkdown";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import contactInformation from "./contact-information.md?raw";
import {
  CONTACT_ASCII_TITLE,
  CONTACT_DIVIDER,
  CONTACT_SPRITE,
  CONTACT_TERMINAL_CONTEXT,
} from "./contact.constants";

export default function ContactModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        title={CONTACT_ASCII_TITLE}
        dividerBlock={CONTACT_DIVIDER}
        dividerRepeats={16}
        leftSprite={{ ...CONTACT_SPRITE, alt: "ASCII no-atmosphere planet" }}
        rightSprite={{ ...CONTACT_SPRITE, alt: "ASCII no-atmosphere planet" }}
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
