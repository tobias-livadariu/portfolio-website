import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  /* Every page owns an animated WebGL scene. Capping concurrency keeps the
     browser processes responsive on ordinary developer and CI hardware, so
     animation assertions measure the app instead of GPU starvation. */
  workers: 1,
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
      testIgnore: /mobile-compat\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      testIgnore: /mobile-compat\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "firefox",
      testIgnore: /mobile-compat\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    /* Keep a focused phone suite in the normal test command. Running every
       desktop-layout assertion under a phone profile would add noise, while
       these projects exercise the actual touch/mobile viewport and user-agent
       behavior that a resized desktop page cannot reproduce. */
    {
      name: "mobile-chromium",
      testMatch: /mobile-compat\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-webkit",
      testMatch: /mobile-compat\.spec\.ts/,
      use: { ...devices["iPhone 13"] },
    },
  ],
});
