import { memo } from "react";
import type { ReactNode } from "react";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import contactInformation from "./contact-information.txt?raw";
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

const LINK_PATTERNS = [
  {
    href: "mailto:tlivadar@uwaterloo.ca",
    text: "tlivadar@uwaterloo.ca",
  },
  {
    href: "https://github.com/tobias-livadariu",
    text: "github.com/tobias-livadariu",
  },
  {
    href: "https://linkedin.com/in/tobias-livadariu",
    text: "linkedin.com/in/tobias-livadariu",
  },
  {
    href: "https://tobias-livadariu.online/portfolio",
    text: "tobias-livadariu.online/portfolio",
  },
] as const;

function renderContactLine(line: string): ReactNode {
  const link = LINK_PATTERNS.find((entry) => line.includes(entry.text));

  if (!link) {
    return line === "" ? "\u00a0" : line;
  }

  const [prefix, suffix] = line.split(link.text);

  return (
    <>
      {prefix}
      <a href={link.href} rel="noreferrer" target="_blank">
        {link.text}
      </a>
      {suffix}
    </>
  );
}

const contactRows = contactInformation
  .trimEnd()
  .split("\n")
  .map((line) => ({
    content: renderContactLine(line),
  }));

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
            command: "cat contact-information.txt",
            output: contactRows,
          },
        ]}
      />
    </article>
  );
}

export default memo(ContactModal);
