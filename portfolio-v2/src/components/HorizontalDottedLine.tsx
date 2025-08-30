interface HorizontalDottedLineProps {
  color: string
  dotRadius: number
  dotSpacing: number
}

function HorizontalDottedLine({ color, dotRadius, dotSpacing }: HorizontalDottedLineProps) {
  return (
    <hr
      className="w-full h-1 border-none"
      style={{
        backgroundImage: `radial-gradient(circle, currentColor ${dotRadius}px, transparent ${dotRadius}px)`,
        backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
        color: color,
      }}
    />
  )
}

export default HorizontalDottedLine