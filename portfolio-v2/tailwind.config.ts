import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          base: "#070B14",
          mutedWhite: "#A8A8B3",
          softGray: "#7D7D87",
          dimBlueGray: "#6C6F7A",
          fadedBlue: "#5A6A85",
          fadedRed: "#7A4B4B",
          fadedOrange: "#9A6A4A",
          dustyYellow: "#8C815A",
        },
      },
      fontFamily: {
        pressstart: ['"Press Start 2P"', "monospace"],
        pixantiqua: ['"PixAntiqua"', "monospace"],
        pixelemu: ['"Pixel Emulator"', "monospace"],
      },
    },
  },
  plugins: [],
}

export default config
