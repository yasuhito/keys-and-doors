import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { start, move, solve } from "../src/core";
import one from "../src/stages/layer-01.json" with { type: "json" };
import two from "../src/stages/layer-02.json" with { type: "json" };
const stages = [...one.stages, ...two.stages];
test("all nine stages through real controls, persistence, replay and locked later layers", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator('[data-stage="0"]')).toBeEnabled();
  await expect(page.locator('[data-stage="1"]')).toBeDisabled();
  await mkdir("/tmp/kd/shots", { recursive: true });
  await page.screenshot({
    path: `/tmp/kd/shots/${info.project.name}-map.png`,
    fullPage: false,
  });
  for (const [i, stage] of stages.entries()) {
    await page.locator(`[data-stage="${i}"]`).click();
    let state = start(stage.tasks[0].goal, stage.tasks[0].assumptions);
    const actions = solve(state)!;
    if (i === 0) {
      // Wrong match stays in the same room, with the key still selected.
      await page.locator('[data-key="1"]').click();
      await page.locator(".goal").click();
      await expect(page.locator('[data-key="1"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await page.locator('[data-key="1"]').click();
      await page.locator("#captions").click();
      await expect(page.locator(".goal .caption")).toBeVisible();
      await page.locator("#captions").click();
      await page.screenshot({
        path: `/tmp/kd/shots/${info.project.name}-room.png`,
      });
    }
    for (const action of actions) {
      if (action.type === "intro") await page.locator(".goal").click();
      else if (action.type === "use") {
        await page.locator(`[data-key="${action.key}"]`).click();
        await page.locator(".goal").click();
      } else if (action.type === "split") {
        await page.locator(`[data-key="${action.key}"]`).click();
        await page.locator(".empty-slot").click();
      } else if (action.type === "apply") {
        await page.locator(`[data-key="${action.key}"]`).click();
        await page.locator(`[data-key="${action.target}"]`).click();
      } else if (action.type === "lemma") {
        await page.locator(`[data-key="${action.key}"]`).click();
        await page.locator(`[data-key="${action.key}"]`).click();
      }
      state = move(state, action);
    }
    await expect(page.locator(".replay-tree")).toBeVisible();
    if (i === 3) {
      await page
        .locator(".scrubber")
        .fill(String(await page.locator(".scrubber").getAttribute("max")));
      await page.screenshot({
        path: `/tmp/kd/shots/${info.project.name}-proof.png`,
      });
    }
    await page.locator("#close").click();
    await expect(page.locator(`[data-rewatch="${i}"]`)).toBeVisible();
  }
  await page.reload();
  await expect(page.locator("[data-rewatch]")).toHaveCount(9);
  await expect(page.locator(".locked button").first()).toBeDisabled();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.use.viewport!.width,
  );
  expect(errors).toEqual([]);
});
test("drag copy, long press, undo and restart", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-stage="0"]').click();
  await page.locator(".goal").click();
  const key = page.locator('[data-key="0"]'),
    door = page.locator(".goal");
  const from = (await key.boundingBox())!,
    to = (await door.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 15,
    from.y + from.height / 2 - 10,
    { steps: 3 },
  );
  await expect(door).toHaveClass(/valid/);
  await expect(page.locator(".drag-copy")).toBeVisible();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  await page.locator("#undo").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.locator("#reset").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  const b = (await page.locator(".goal").boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 40);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await expect(page.locator(".formula-bubble")).toBeVisible();
  await page.mouse.up();
  await expect(page.locator(".formula-bubble")).toHaveCount(0);
  const longPress = async (selector: string) => {
    const box = (await page.locator(selector).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator(".formula-bubble")).toBeVisible();
    await page.mouse.up();
    await expect(page.locator(".formula-bubble")).toHaveCount(0);
  };
  await longPress('[data-key="0"]');
  await page.locator('[data-key="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(key).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-key="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(key).toHaveAttribute("aria-pressed", "false");
  await longPress('[data-key="0"]');
  await key.click();
  await expect(key).toHaveAttribute("aria-pressed", "true");
  await page.locator(".goal").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
});
