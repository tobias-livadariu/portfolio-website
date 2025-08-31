import MainNavSection from "./MainNavSection"

interface MainTitleProps {
  intro: string,
  firstName: string,
  lastName: string,
}

function MainTitle({ intro, firstName, lastName }: MainTitleProps) {
  return (
    <div className="inline-flex flex-col items-center">
      <h2 className="text-[17px]">{intro}</h2>
      <h1 className="text-[21px]">{firstName}</h1>
      <h1 className="text-[21px]">{lastName}</h1>
      <MainNavSection />
    </div>
  )
}

export default MainTitle