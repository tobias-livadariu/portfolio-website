import Starfield from "./components/main-canvas/Starfield";
import MainTitle from "./components/MainTitle"

function App() {
  return (
    <div>
      <Starfield />
      <MainTitle
        intro="Hey, I'm"
        firstName="Tobias"
        lastName="Livadariu"
      />
    </div>
  )
}

export default App
