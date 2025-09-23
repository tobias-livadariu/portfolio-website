export default function SEWebringLinkback() {
  return (
    <a
      href="https://se-webring.xyz/"
      aria-label="SE Webring Linkback"
      target="_blank"
      rel="noreferrer"
      className="
        block mt-4 p-3
        bg-black border-2 border-campfire
        hover:border-campfire-ash hover:bg-gray/10
        transition-colors duration-200 ease-in-out
        pixel-frame
        group
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-campfire font-pixelemu text-[12px] leading-tight">
            SE Webring
          </span>
          <span className="text-campfire-ash/80 font-pixantiqua text-[10px] mt-0.5">
            Member Site
          </span>
        </div>

        <img
          src="/portfolio/images/logo_w.png"
          alt="SE Webring Logo"
          className="
            w-11 h-auto object-contain img-pixelated
            group-hover:brightness-110
            transition-all duration-200
            ms-0
          "
          loading="lazy"
        />
      </div>
    </a>
  )
}