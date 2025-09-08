import PixelModal from "../pixel/PixelModal";
import { useModal } from "./ModalContext";
import AboutPanel from "./panels/AboutPanel";

export default function ModalRoot() {
  const { key } = useModal();
  if (!key) return null;

  const titleMap = {
    about: "About",
    resume: "Résumé",
    portfolio: "Portfolio",
    contact: "Contact me",
  } as const;

  return (
    <PixelModal title={titleMap[key]}> {
      key === "about" ? <AboutPanel/> :
      key === "resume" ? <div className="font-pixelemu">Coming soon…</div> :
      key === "portfolio" ? <div className="font-pixelemu">Coming soon…</div> :
      <div className="font-pixelemu">Coming soon…</div>
    } </PixelModal>
  );
}
