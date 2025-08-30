import MainNavSection from "./MainNavSection"

interface MainTitleProps {
  intro: string,
  firstName: string,
  lastName: string,
}

function MainTitle({ intro, firstName, lastName }: MainTitleProps) {
  return (
    <div className="inline-flex flex-col items-center">
      <h2>{intro}</h2>
      <h1>{firstName}</h1>
      <h1>{lastName}</h1>
      <MainNavSection />
    </div>
  )
}

export default MainTitle