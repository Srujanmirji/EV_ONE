import { defineConfig, devices } from "@playwright/test";

// Full Chromium (not the headless shell) so browser-only requests such as
// favicons are exercised. PW_CHROMIUM_EXECUTABLE lets sandboxes with a
// preinstalled, differently versioned Chromium run the suite locally.
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE;

const API_PORT = 4100;
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;
const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  throw new Error(
    "Web e2e needs DATABASE_URL (migrated and seeded) for the catalogue API.",
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    channel: "chromium",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "wide",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  // The catalogue page reads the real API, which reads PostgreSQL.
  webServer: [
    {
      command: "node ../api/dist/main.js",
      url: `${API_ORIGIN}/api/v1/health/ready`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: "test",
        API_HOST: "127.0.0.1",
        API_PORT: String(API_PORT),
        DATABASE_URL: databaseUrl,
      },
    },
    {
      command: "pnpm start --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_BASE_URL: API_ORIGIN },
    },
  ],
});
