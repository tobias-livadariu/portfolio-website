import MainTitle from "./MainTitle";
import { ModalProvider } from "./modal/ModalContext";
import ModalRoot from "./modal/ModalRoot";

function ModalAwareContent() {
  return (
    <ModalProvider>
      <MainTitle
        intro="Hey, I'm"
        firstName="Tobias"
        lastName="Livadariu"
      />
      <ModalRoot />
    </ModalProvider>
  );
}

export default ModalAwareContent;
