import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:5174/portfolio/",
  },
  use: {
    baseURL: "http://127.0.0.1:5174/portfolio/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
