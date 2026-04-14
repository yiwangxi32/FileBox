import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev:3001",
    port: 3001,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
