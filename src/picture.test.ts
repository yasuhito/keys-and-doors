import { it, expect } from "vitest";
import { card } from "./picture";
import type { Formula } from "./core";
it("escapes formula text interpolated into card markup", () => {
  const html = card("<img src=x onerror=alert(1)>" as Formula, "node");
  expect(html).not.toContain("<img");
  expect(html).toContain("&#60;img src=x onerror=alert(1)&#62;");
});
