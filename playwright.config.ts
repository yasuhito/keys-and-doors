import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5173/keys-and-doors/" },
  webServer: {
    command:
      "npm run build && npx vite preview --host 127.0.0.1 --port 5173 --strictPort --base /keys-and-doors/",
    url: "http://127.0.0.1:5173/keys-and-doors/",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "phone",
      use: {
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
