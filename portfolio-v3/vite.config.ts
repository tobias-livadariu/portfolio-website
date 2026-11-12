import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/portfolio/",
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        /* The libraries are most of the script a visitor downloads, and they
           change far less often than the site's own code. Each group below
           becomes its own file, named after its contents, so a deploy that
           only touches the site's code leaves these files' names unchanged
           and a returning visitor's browser keeps its cached copies. The
           browser also fetches the files side by side. */
        codeSplitting: {
          groups: [
            {
              name: "three",
              test: /node_modules[\\/](?:three|three-stdlib)[\\/]/,
              priority: 2,
            },
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom|scheduler|@react-three|its-fine|react-use-measure|suspend-react|tunnel-rat|zustand|use-sync-external-store)[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
});
