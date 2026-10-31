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
  await expect(target.locator('.arrow[stroke="#B07A1A"]')).toBeAttached();
  await expect(target.locator('.result path[fill="#2F6FD0"]')).toBeAttached();
  await expect(page.locator("[data-key]")).toHaveCount(3);
  await expect(target.locator('.arrow[stroke="#B07A1A"]')).toHaveCount(0);
  await expect(target.locator(".result path").first()).toHaveAttribute(
    "fill",
    "#CCC4B6",
  );
  await page.locator("#undo").click();
  await expect(page.locator("[data-key]")).toHaveCount(2);
});

test("if-elim has separate seating, arrow, colour, obtaining and delivery beats", async ({
  page,
}) => {
  const proofs = Object.fromEntries(
    one.stages.slice(0, 4).map((stage) => {
      let s = start(stage.tasks[0].goal, stage.tasks[0].assumptions);
      for (const action of solve(s)!) s = move(s, action);
      return [stage.id, s.rooms[0].proof];
    }),
  );
  await page.addInitScript(
    (value) => localStorage.setItem("keys-and-doors:v1", value),
    JSON.stringify({ proofs }),
  );
  await page.goto("./");
  await page.locator('[data-stage="4"]').click();
  await page.locator('[data-key="0"]').click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator('[data-key="1"]').click();
  const arrow = page.locator('[data-key="1"] .arrow[stroke="#B07A1A"]');
  const result = page.locator('[data-key="1"] .picture > .result').last();
  const seek = async (ms: number) =>
    page.evaluate((time) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = time;
      }
    }, ms);
  await seek(340);
  await expect(arrow).toHaveCSS("stroke-dashoffset", "1px");
  await expect(result).toHaveCSS("opacity", "0");
  await seek(510);
  const midArrow = Number.parseFloat(
    await arrow.evaluate((el) => getComputedStyle(el).strokeDashoffset),
  );
  expect(midArrow).toBeGreaterThan(0);
  expect(midArrow).toBeLessThan(1);
  await expect(result).toHaveCSS("opacity", "0");
  await seek(800);
  await expect(arrow).toHaveCSS("stroke-dashoffset", "0px");
  const opacity = Number(
    await result.evaluate((el) => getComputedStyle(el).opacity),
  );
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await expect(result).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await seek(1040);
  await expect(result).toHaveCSS("opacity", "1");
  await expect(result).toHaveCSS("transform", "matrix(1.04, 0, 0, 1.04, 0, 0)");
  await expect(page.locator('[data-key="2"] .object')).toHaveCSS(
    "visibility",
    "hidden",
  );
  await seek(1460);
  await page.clock.runFor(1460);
  await expect(page.locator(".result-flight")).toHaveCount(0);
  await expect(page.locator('[data-key="2"] .object')).toHaveCSS(
    "visibility",
    "visible",
  );
  await expect(page.locator("[data-key]")).toHaveCount(3);
  await page.locator('[data-key="0"]').click();
  await page.locator('[data-key="1"]').click();
  await seek(1580);
  await expect(page.locator('[data-key="2"] .object')).toHaveCSS(
    "transform",
    "matrix(1.04, 0, 0, 1.04, 0, 0)",
  );
  await page.clock.runFor(1700);
  await expect(page.locator("[data-key]")).toHaveCount(3);
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
    await page.locator(".joint-button").click();
    await page.locator('[data-key="1"]').click();
    await page.locator('.goal[data-drop="L"]').click();
    await page.locator('[data-key="0"]').click();
    await page.locator('.goal[data-drop="R"]').click();
    if (reducedMotion === "no-preference") {
      await expect(
        page.locator('.door-fit .arrow[stroke="#B07A1A"]'),
      ).toHaveAttribute("stroke", "#B07A1A");
      await expect(
        page.locator('.door-fit .result path[fill="#2F6FD0"]'),
      ).toHaveCount(1);
    }
    await expect(page.locator(".door-fit")).toHaveCount(0);
    await expect(page.locator(".replay-tree")).toBeVisible();
    await page.locator("#close").click();
    await expect(page.locator('[data-rewatch="2"]')).toBeVisible();
  });
}
