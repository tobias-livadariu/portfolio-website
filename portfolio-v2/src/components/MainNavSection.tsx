import HorizontalDottedLine from "./HorizontalDottedLine"

function MainNavSection() {
  const handleClick = (label: string) => {
    console.log(`${label} clicked`)
  }

  return (
    <div className="inline-flex flex-col items-center space-y-1">
      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />

      {["About", "Resume", "Portfolio", "Contact me"].map((label) => (
        <button
          key={label}
          onClick={() => handleClick(label)}
          className="
            text-inherit font-pixelemu bg-none border-none cursor-pointer mb-0
            hover:text-campfire-ash 
            focus:outline-none focus-visible:text-campfire-ash
          "
        >
          {label}
        </button>
      ))}

      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />
    </div>
  )
}


export default MainNavSection