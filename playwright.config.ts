import { defineConfig } from "@playwright/test";

const PORT = 4001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // Capped everywhere: all specs share one server + one remote (Neon) DB
  // connection pool, so uncapped parallelism causes contention timeouts.
  workers: 4,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: "npm run start:test",
    url: `${BASE_URL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
