import { Reply, Play, ChevronLeft, ChevronRight } from "@nsmr/pixelart-react"
import HorizontalDottedLine from "./HorizontalDottedLine"

function MainNavSection() {
  const handleClick = (label: string) => {
    console.log(`${label} clicked`)
  }

  return (
    <div className="inline-flex flex-col items-center space-y-1">
      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />

      {["About", "Resume", "Portfolio", "Contact me"].map((label) => (
        <div key={label} className="group flex items-center">
          <Reply
            className="text-campfire-ash visible group-hover:visible group-focus-within:visible rotate-180 mr-[2px]"
            size={24}
          />

          <button
            onClick={() => handleClick(label)}
            className="
              text-inherit font-pixelemu bg-none border-none cursor-pointer
              hover:text-campfire-ash
              focus:outline-none focus-visible:text-campfire-ash
            "
          >
            {label}
          </button>

          <Reply
            className="text-campfire-ash visible group-hover:visible group-focus-within:visible"
            size={24}
          />
        </div>
      ))}

      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />
    </div>
  )
}

export default MainNavSection
