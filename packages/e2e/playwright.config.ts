import { defineConfig } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiHealthUrl = process.env.PLAYWRIGHT_API_HEALTH_URL ?? "http://localhost:3001/api/health";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "yarn dev:backend",
      url: apiHealthUrl,
      cwd: repoRoot,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "yarn dev:frontend",
      url: `${frontendBaseUrl}/login`,
      cwd: repoRoot,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
