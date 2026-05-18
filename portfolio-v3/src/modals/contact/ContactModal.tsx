import { memo } from "react";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
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

const CONTACT_ACTIONS = [
  {
    label: "EMAIL",
    href: "mailto:tlivadar@uwaterloo.ca",
    value: "tlivadar@uwaterloo.ca",
  },
  {
    label: "GITHUB",
    href: "https://github.com/tobias-livadariu",
    value: "github.com/tobias-livadariu",
  },
  {
    label: "LINKEDIN",
    href: "https://linkedin.com/in/tobias-livadariu",
    value: "linkedin.com/in/tobias-livadariu",
  },
  {
    label: "PORTFOLIO",
    href: "https://tobias-livadariu.online/portfolio",
    value: "tobias-livadariu.online/portfolio",
  },
] as const;

function ContactOpenPanel() {
  return (
    <div className="modal-open-panel modal-contact-open-panel">
      <div className="modal-contact-actions">
        {CONTACT_ACTIONS.map((action) => {
          const isExternal = !action.href.startsWith("mailto:");

          return (
            <a
              className="modal-contact-action"
              href={action.href}
              key={action.href}
              rel={isExternal ? "noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              <span>{action.label}</span>
              <span>{action.value}</span>
            </a>
          );
        })}
      </div>
      <p>
        I am usually easiest to reach by email. I am open to software
        engineering internships, project conversations, and direct technical
        feedback.
      </p>
    </div>
  );
}

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
            command: "open contact-tobi.html",
            output: [
              {
                kind: "block",
                lineCount: 0,
                render: () => <ContactOpenPanel />,
              },
            ],
          },
        ]}
      />
    </article>
  );
}

export default memo(ContactModal);
