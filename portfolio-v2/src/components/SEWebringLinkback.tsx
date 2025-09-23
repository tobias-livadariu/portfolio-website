export default function SEWebringLinkback() {
  return (
    <a
      href="https://se-webring.xyz/"
      aria-label="SE Webring Linkback"
      className=""
    >
      <div className="flex justify-between">
        <p className="text-white">
          SE Webring
        </p>

        <img
          src="/portfolio/images/logo_w.png"
          alt="SE Webring Logo"
          className="md:w-[8vw] lg:w-[6vw] xl:w-[4vw] h-auto object-cover"
          loading="lazy"
        />
      </div>
    </a>
  )
}