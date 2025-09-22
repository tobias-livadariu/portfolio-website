import Starfield from "./components/main-canvas/Starfield";
import TouchShield from "./components/TouchShield";
import ModalAwareContent from "./components/ModalAwareContent";

function App() {
  return (
    <div>
      <Starfield />
      <TouchShield enableOnMobileOnly={true} />
      <ModalAwareContent />
    </div>
  );
}

export default App
