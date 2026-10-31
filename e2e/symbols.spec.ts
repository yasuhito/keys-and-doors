import { test, expect } from "@playwright/test";
import { start, move, solve } from "../src/core";
import one from "../src/stages/layer-01.json" with { type: "json" };
import two from "../src/stages/layer-02.json" with { type: "json" };

test("fitting lights the arrow, colours the result and preserves both input keys", async ({
  page,
}) => {
  const stages = [...one.stages, ...two.stages];
  const proofs = Object.fromEntries(
    stages.slice(0, 4).map((stage) => {
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
  await page.locator('[data-stage="4"]').click();
  const target = page.locator('[data-key="1"]');
  await expect(
    target.locator(".result circle, .result path").first(),
  ).toHaveAttribute("fill", "#CCC4B6");
  await page.locator('[data-key="0"]').click();
  await expect(target.locator(".fit-preview")).toBeVisible();
  await target.click();
  await expect(target.locator(".fit-animation")).toBeVisible();
  await expect(
    target.locator(".fit-animation .obtained .arrow").first(),
  ).toHaveAttribute("stroke", "#B07A1A");
  await expect(
    target.locator(".fit-animation .obtained .result path").first(),
  ).toHaveAttribute("fill", "#2F6FD0");
  await expect(page.locator("[data-key]")).toHaveCount(3);
  await expect(target.locator(".fit-animation")).toHaveCount(0);
  await expect(target.locator(".result path").first()).toHaveAttribute(
    "fill",
    "#CCC4B6",
  );
  await page.locator("#undo").click();
  await expect(page.locator("[data-key]")).toHaveCount(2);
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`if-then door fills its result before disappearing (${reducedMotion})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const proofs = Object.fromEntries(
      one.stages.slice(0, 2).map((stage) => {
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
    await page.locator('[data-stage="2"]').click();
    await page.locator(".goal").click();
    await page.locator(".goal").click();
    await page.locator('[data-key="1"]').click();
    await page.locator(".goal").click();
    await page.locator('[data-key="0"]').click();
    await page.locator(".goal").click();
    if (reducedMotion === "no-preference") {
      await expect(page.locator(".door-fit .obtained .arrow")).toHaveAttribute(
        "stroke",
        "#B07A1A",
      );
      await expect(
        page.locator('.door-fit .obtained .result path[fill="#2F6FD0"]'),
      ).toHaveCount(1);
    }
    await expect(page.locator(".door-fit")).toHaveCount(0);
    await expect(page.locator(".replay-tree")).toBeVisible();
    await page.locator("#close").click();
    await expect(page.locator('[data-rewatch="2"]')).toBeVisible();
  });
}
