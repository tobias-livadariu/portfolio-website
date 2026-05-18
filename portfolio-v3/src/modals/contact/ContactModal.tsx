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
] as const;

const CONTACT_NOTE_BRACKET = [
  "  .d888",
  ' d88P" ',
  " 888   ",
  ".888   ",
  "888(   ",
  '"888   ',
  " 888   ",
  " Y88b. ",
  '  "Y888',
] as const;

function ContactOpenPanel() {
  return (
    <div className="modal-open-panel modal-contact-open-panel">
      <div className="modal-contact-actions">
        {CONTACT_ACTIONS.map((action) => {
          const isExternal = !action.href.startsWith("mailto:");

          return (
            <a
              aria-label={action.value}
              className="modal-contact-action"
              href={action.href}
              key={action.href}
              rel={isExternal ? "noreferrer" : undefined}
              target={isExternal ? "_blank" : undefined}
            >
              <span className="modal-contact-action-comment" aria-hidden="true">
                {action.value}
              </span>
              <span className="modal-contact-action-label">
                [ {action.label} ]
              </span>
            </a>
          );
        })}
      </div>
      <div
        aria-label="I am easiest to reach by email. Open to software engineering internships, project conversations, and direct technical feedback."
        className="modal-contact-note-panel"
      >
        <pre className="modal-contact-note-bracket" aria-hidden="true">
          {CONTACT_NOTE_BRACKET.join("\n")}
        </pre>
        <div className="modal-contact-note-copy">
          <span>I am easiest to reach by email</span>
          <div className="modal-contact-note-copy-subspans">
            <span>Open to software engineering internships,</span>
            <span>project conversations,</span>
            <span>and direct technical feedback</span>
          </div>
        </div>
        <pre
          className="modal-contact-note-bracket modal-contact-note-bracket-right"
          aria-hidden="true"
        >
          {CONTACT_NOTE_BRACKET.join("\n")}
        </pre>
      </div>
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
