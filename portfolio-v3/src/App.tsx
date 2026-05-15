import { ModalProvider } from "./modals/ModalContext";
import ModalLayer from "./modals/ModalLayer";
import PortfolioCanvas from "./scene/PortfolioCanvas";

export default function App() {
  return (
    <ModalProvider>
      <PortfolioCanvas />
      <ModalLayer />
    </ModalProvider>
  );
}
