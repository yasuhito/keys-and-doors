import { defineConfig } from "@playwright/test";
const port = Number(process.env.E2E_PORT ?? 5173);
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${port}/keys-and-doors/` },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort --base /keys-and-doors/`,
    url: `http://127.0.0.1:${port}/keys-and-doors/`,
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
