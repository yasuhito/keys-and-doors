import { test, expect } from "@playwright/test";
import { start, move, solve } from "../src/core";
import one from "../src/stages/layer-01.json" with { type: "json" };
import { activateDoor } from "./controls";

test("bare keys match door cutouts and only matching holes glow", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator('[data-stage="0"]').click();
  const sun = page.locator('[data-key="0"] > .object');
  await expect(sun).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(sun).toHaveCSS("border-top-width", "0px");
  expect(
    await sun.evaluate((el) => getComputedStyle(el, "::before").content),
  ).toBe("none");
  // Execute the SVG interface: compare the rendered paths, not implementation text.
  const keyPath = await sun
    .locator(".picture > path")
    .first()
    .getAttribute("d");
  await expect(
    page.locator('.goal .cut[data-path="L"] > path').first(),
  ).toHaveAttribute("d", keyPath!);
  await activateDoor(page);
  await page.locator('[data-key="1"]').click();
  await expect(page.locator(".goal")).not.toHaveClass(/valid/);
  await page.locator('[data-key="1"]').click();
  await page.locator('[data-key="0"]').click();
  await expect(page.locator(".goal")).toHaveClass(/valid/);
  await expect(page.locator('.goal .glow.matching[data-path=""]')).toHaveCount(
    1,
  );
  await page.locator(".goal").click();
  await expect(page.locator('.chip.here[data-room="0"]')).toBeVisible();
});

test("nested pair cutouts expose individual seating targets", async ({
  page,
}) => {
  const proofs = Object.fromEntries(
    one.stages.slice(0, 3).map((stage) => {
      let state = start(stage.tasks[0].goal, stage.tasks[0].assumptions);
      for (const action of solve(state)!) state = move(state, action);
      return [stage.id, state.rooms[0].proof];
    }),
  );
  await page.addInitScript(
    (value) => localStorage.setItem("keys-and-doors:v1", value),
    JSON.stringify({ proofs }),
  );
  await page.goto("./");
  await page.locator('[data-stage="3"]').click();
  const slot = page.locator('.goal .slot > .cut[data-path="S"]');
  for (const path of ["SL", "SR", "SRL", "SRR"]) {
    const cut = slot.locator(`.cut[data-path="${path}"]`);
    await expect(cut).toHaveCount(1);
    const box = await cut.evaluate((el) => {
      const b = (el as SVGGraphicsElement).getBBox();
      return { width: b.width, height: b.height };
    });
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  }
});
