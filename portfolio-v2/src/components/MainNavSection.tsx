import HorizontalDottedLine from "./HorizontalDottedLine"

function MainNavSection() {
  return (
    <div className="inline-flex flex-col items-center">
      <HorizontalDottedLine
        color="gray"
        dotRadius={1}
        dotSpacing={6}
      />
      <h3>About</h3>
      <h3>Resume</h3>
      <h3>Portfolio</h3>
      <h3>Contact me</h3>
      <HorizontalDottedLine
        color="gray"
        dotRadius={1}
        dotSpacing={6}
      />
    </div>
  )
}

export default MainNavSection