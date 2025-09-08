import Starfield from "./components/main-canvas/Starfield";
import MainTitle from "./components/MainTitle";
import { ModalProvider } from "./components/modal/ModalContext";
import ModalRoot from "./components/modal/ModalRoot";

function App() {
  return (
    <ModalProvider>
      <Starfield />
      <MainTitle
        intro="Hey, I'm"
        firstName="Tobias"
        lastName="Livadariu"
      />
      <ModalRoot />
    </ModalProvider>
  );
}

export default App
