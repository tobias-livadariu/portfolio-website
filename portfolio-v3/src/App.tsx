import { BackgroundModeProvider } from "./background/BackgroundModeProvider";
import DiamondTransitionOverlay from "./background/DiamondTransitionOverlay";
import { ModalProvider } from "./modals/ModalContext";
import ModalLayer from "./modals/ModalLayer";
import PortfolioCanvas from "./scene/PortfolioCanvas";

export default function App() {
  return (
    <ModalProvider>
      <BackgroundModeProvider>
        <ModalLayer background={<PortfolioCanvas />} />
        <DiamondTransitionOverlay />
      </BackgroundModeProvider>
    </ModalProvider>
  );
}
