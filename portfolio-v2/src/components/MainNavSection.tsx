import { Reply } from "@nsmr/pixelart-react"
import HorizontalDottedLine from "./HorizontalDottedLine"

function MainNavSection() {
  const handleClick = (label: string) => {
    console.log(`${label} clicked`)
  }

  return (
    <div className="inline-flex flex-col items-center space-y-0.5">
      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />

      {["About", "Resume", "Portfolio", "Contact me"].map((label) => (
        <div key={label} className="flex items-center">
          <button
            onClick={() => handleClick(label)}
            className="
              font-pixelemu cursor-pointer peer order-2 text-[22px]
              hover:text-campfire-ash
              focus:outline-none focus-visible:text-campfire-ash
            "
          >
            {label}
          </button>
          <Reply
            className={`text-black peer-hover:text-campfire-ash peer-focus-visible:text-campfire-ash rotate-180 order-1 ${label === "About" ? "mr-[3px]" : "mr-[2px]"}`}
            size={32}
          />
          <Reply
            className="text-black peer-hover:text-campfire-ash peer-focus-visible:text-campfire-ash order-3 ml-[1px]"
            size={32}
          />
        </div>
      ))}

      <HorizontalDottedLine color="gray" dotRadius={1} dotSpacing={6} />
    </div>
  )
}

export default MainNavSection
