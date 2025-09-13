import PixelModal from "../pixel/PixelModal";
import { useModal } from "./ModalContext";
import AboutPanel from "./panels/AboutPanel";
import ResumePanel from "./panels/ResumePanel";
import PortfolioPanel from "./panels/PortfolioPanel";
import ContactMePanel from "./panels/ContactMePanel";

export default function ModalRoot() {
  const { key } = useModal();
  if (!key) return null;

  const titleMap = {
    about: "About",
    resume: "Resume",
    portfolio: "Portfolio",
    contactme: "Contact Me",
  } as const;

  console.log("The key is", key)

  return (
    <PixelModal title={titleMap[key]}> {
      key === "about" ? <AboutPanel/> :
      key === "resume" ? <ResumePanel/> :
      key === "portfolio" ? <PortfolioPanel/> :
      <ContactMePanel/>
    } </PixelModal>
  );
}
