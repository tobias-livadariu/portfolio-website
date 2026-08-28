import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
    // A sibling portfolio version may be running on a wildcard interface at
    // the same port. Never accept that unrelated app as this test server.
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:5175/portfolio/",
  },
  use: {
    baseURL: "http://127.0.0.1:5175/portfolio/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
});
