import { defineConfig } from "vitest/config";
export default defineConfig({
  base: "/keys-and-doors/",
  test: { include: ["src/**/*.test.ts"] },
});
