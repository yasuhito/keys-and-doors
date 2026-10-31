import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { start, move, solve } from "../src/core";
import { stages, unlock } from "./unlock";
test("all nine stages through real controls, persistence, replay and locked later layers", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (request) => errors.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("./");
  await expect(page).toHaveURL(/\/keys-and-doors\/$/);
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
      await page.locator('.goal [data-drop="L"]').click();
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
  await page.goto("./");
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
test("finishing a pair half after opening its sibling via the path lands in an open room", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await unlock(page, 6);
  await page.locator('[data-stage="6"]').click();
  await page.locator(".goal").click();
  await page.locator('[data-room="2"]').click();
  await page.locator(".goal").click();
  await page.locator('[data-room="1"]').click();
  await page.locator(".goal").click();
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "3");
  await page.locator("#hint").click();
  await page.locator(".goal").click();
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".replay-tree")).toBeVisible();
  expect(errors).toEqual([]);
});
test("room reset restores the tray from entry even after visiting another room", async ({
  page,
}) => {
  await unlock(page, 1);
  await page.locator('[data-stage="1"]').click();
  await page.locator(".goal").click();
  const keys = page.locator("[data-key]");
  await page.locator('[data-key="0"]').click();
  await page.locator(".empty-slot").click();
  await expect(keys).toHaveCount(3);
  await page.locator('[data-room="2"]').click();
  await page.locator('[data-key="0"]').click();
  await page.locator(".empty-slot").click();
  await expect(keys).toHaveCount(3);
  await page.locator('[data-room="1"]').click();
  await page.locator("#reset").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await expect(keys).toHaveCount(1);
  await page.locator('[data-room="2"]').click();
  await expect(keys).toHaveCount(3);
  await page.locator('[data-room="1"]').click();
  await page.locator("#undo").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await expect(keys).toHaveCount(3);
  const reset = (await page.locator("#reset").boundingBox())!;
  await page.mouse.move(reset.x + reset.width / 2, reset.y + reset.height / 2);
  await page.mouse.down();
  await expect(page.locator("[data-room]")).toHaveCount(1);
  await page.mouse.up();
  await expect(keys).toHaveCount(1);
  await expect(page.locator("#undo")).toBeDisabled();
});
test("credits open from settings, link to the original and return", async ({
  page,
}, info) => {
  await page.goto("./");
  await page.locator("#settings").click();
  await page.locator("#credits").click();
  await expect(page.locator("h1")).toHaveText("クレジット");
  const credit = page.locator(".credit-card");
  await expect(credit).toContainText("木原貴行（Takayuki Kihara）");
  await expect(credit).toContainText("ステージデータ（数式と出題順）");
  await expect(credit).toContainText("MIT ライセンスで利用しています");
  await expect(credit).toContainText(
    "CC BY-NC-SA 4.0 の対象となる原作の物語や文章は使用していません",
  );
  const notices = credit.getByRole("link", { name: "THIRD_PARTY_NOTICES.md" });
  await expect(notices).toBeVisible();
  await expect(notices).toHaveAttribute("target", "_blank");
  const noticeResponse = await page.request.get(
    (await notices.getAttribute("href"))!,
  );
  expect(noticeResponse.ok()).toBe(true);
  const noticeText = await noticeResponse.text();
  expect(noticeText).toContain("Copyright (c) 2026 Takayuki Kihara");
  expect(noticeText).toContain("Permission is hereby granted, free of charge");
  expect(noticeText).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  for (const href of [
    "https://github.com/kihara-logic/proof-dungeon",
    "https://x.com/tri_iro/status/2116094777720799282",
    "https://github.com/kihara-logic/proof-dungeon/blob/main/LICENSE",
  ]) {
    const link = page.locator(`.credit-card a[href="${href}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.use.viewport!.width,
  );
  await mkdir("/tmp/kd/shots", { recursive: true });
  await page.screenshot({
    path: `/tmp/kd/shots/${info.project.name}-credit.png`,
  });
  await page
    .context()
    .route("https://github.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "original" }),
    );
  const popup = page.waitForEvent("popup");
  await page.locator(".credit-card a").first().click();
  expect((await popup).url()).toContain(
    "github.com/kihara-logic/proof-dungeon",
  );
  await (await popup).close();
  await page.locator("#close").click();
  await expect(page.locator("h1")).toHaveText("設定");
  await page.locator("#close").click();
  await expect(page.locator('[data-stage="0"]')).toBeVisible();
});
