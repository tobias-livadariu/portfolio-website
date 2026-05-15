import publicPath from "../../utility/public-path";
import ModalHeader from "../components/ModalHeader";
import Terminal from "../components/Terminal";
import {
  RESUME_ASCII_TITLE,
  RESUME_CACHE_BUSTER,
  RESUME_DIVIDER,
  RESUME_DRIVE_ID,
  RESUME_SPRITE,
  RESUME_TERMINAL_CONTEXT,
} from "./resume.constants";

const PREVIEW_SRC = `https://drive.google.com/file/d/${RESUME_DRIVE_ID}/preview${RESUME_CACHE_BUSTER}`;
const OPEN_SRC = `https://drive.google.com/file/d/${RESUME_DRIVE_ID}/view`;
const DOWNLOAD_SRC = `https://drive.google.com/uc?export=download&id=${RESUME_DRIVE_ID}`;

function ResumeViewer() {
  return (
    <div className="modal-resume-viewer">
      <iframe
        allow="autoplay"
        className="modal-resume-frame"
        loading="lazy"
        src={PREVIEW_SRC}
        title="Tobias Livadariu resume preview"
      />
      <div className="modal-action-row">
        <a href={OPEN_SRC} rel="noreferrer" target="_blank">
          [ OPEN IN GOOGLE DRIVE ]
        </a>
        <a href={DOWNLOAD_SRC}>[ DOWNLOAD PDF ]</a>
        <a href={publicPath("/resume.pdf")} rel="noreferrer" target="_blank">
          [ VIEW LOCAL FALLBACK ]
        </a>
      </div>
    </div>
  );
}

export default function ResumeModal() {
  return (
    <article className="modal-section-content">
      <ModalHeader
        title={RESUME_ASCII_TITLE}
        dividerBlock={RESUME_DIVIDER}
        dividerRepeats={10}
        leftSprite={{ ...RESUME_SPRITE, alt: "ASCII star sprite" }}
        rightSprite={{ ...RESUME_SPRITE, alt: "ASCII star sprite" }}
      />

      <Terminal
        context={RESUME_TERMINAL_CONTEXT}
        commands={[
          {
            command: "zathura resume.pdf",
            output: <ResumeViewer />,
          },
        ]}
      />
    </article>
  );
}
