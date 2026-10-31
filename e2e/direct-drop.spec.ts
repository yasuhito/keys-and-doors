import { test, expect, type Page } from "@playwright/test";
import { unlock } from "./unlock";

async function open(page: Page, split = true) {
  await page.goto("./");
  await page.locator('[data-stage="0"]').click();
  if (split) await page.locator(".joint-button").click();
}
const half = (page: Page, side: "L" | "R") =>
  page.locator(`.goal[data-drop="${side}"]`);
async function fill(page: Page, key: number, side: "L" | "R") {
  await page.locator(`[data-key="${key}"]`).click();
  await half(page, side).click();
}
async function drag(page: Page, key: number, side: "L" | "R") {
  const from = (await page.locator(`[data-key="${key}"]`).boundingBox())!;
  const to = (await half(page, side).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 65, {
    steps: 10,
  });
  await expect(half(page, side)).toHaveClass(/hovered/);
  await page.mouse.up();
}
for (const gesture of ["drag", "tap-tap"] as const) {
  test(`split pair filling with ${gesture}, wrong half, retained keys and undo`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page.locator('[data-key="0"]').click();
    await expect(page.locator(".goal .glow.matching")).toHaveCount(1);
    await expect(page.locator(".door-preview")).toBeVisible();
    await half(page, "R").click();
    await expect(page.locator('[data-key="0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".chip")).toHaveCount(3);
    if (gesture === "drag") await drag(page, 0, "L");
    else await half(page, "L").click();
    await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
    await expect(half(page, "L").locator(".seated")).toHaveCount(1);
    await expect(half(page, "R").locator(".seated")).toHaveCount(0);
    await expect(page.locator('.coupler .tab[data-side="L"]')).toHaveClass(
      /lit/,
    );
    await expect(page.locator("[data-key]")).toHaveCount(2);
    await page.locator("#undo").click();
    await expect(page.locator(".goal .seated")).toHaveCount(0);
    if (gesture === "drag") await drag(page, 1, "R");
    else await fill(page, 1, "R");
    await fill(page, 0, "L");
    await expect(page.locator(".coupler.lit")).toBeAttached();
    await expect(page.locator(".replay-tree")).toBeVisible();
    await page.locator("#close").click();
    await expect(page.locator('[data-rewatch="0"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("unsplit single-key misses hint at the joint; split is undoable and each new door has one hole", async ({
  page,
}) => {
  await open(page, false);
  await page.locator('[data-key="0"]').click();
  await expect(page.locator(".goal .glow.matching")).toHaveCount(0);
  await expect(page.locator(".joint-hint")).toHaveCount(1);
  await page.locator(".goal").click({ position: { x: 30, y: 90 } });
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.locator(".replay-tree")).toHaveCount(0);
  await page.locator(".joint-button").click();
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
  for (const side of ["L", "R"] as const)
    await expect(half(page, side).locator('.cut[data-path=""]')).toHaveCount(1);
  await expect(page.locator(".coupler")).toBeVisible();
  await page.locator("#undo").click();
  await expect(page.locator(".split-doors")).toHaveCount(0);
  await expect(page.locator(".joint-button")).toHaveCount(1);
  await expect(page.locator(".chip")).toHaveCount(1);
});

test("sliding off a pressed joint cancels, and resizing keeps its target over the brass", async ({
  page,
}) => {
  await open(page, false);
  let box = (await page.locator(".joint-button").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator(".joint-button")).toHaveClass(/pressed/);
  await page.mouse.move(box.x - 20, box.y - 20);
  await page.mouse.up();
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.locator(".split-doors")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 780 });
  box = (await page.locator(".joint-button").boundingBox())!;
  const visual = (await page.locator(".goal .joint").boundingBox())!;
  expect(
    Math.abs(box.x + box.width / 2 - visual.x - visual.width / 2),
  ).toBeLessThan(1);
  await page.locator(".joint-button").click();
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
});

test("undo during the final coupler light restores the unfinished pair", async ({
  page,
}) => {
  await open(page);
  await fill(page, 0, "L");
  await fill(page, 1, "R");
  await expect(page.locator(".coupler.lit")).toBeAttached();
  await page.locator("#undo").click();
  await expect(page.locator(".replay-tree")).toHaveCount(0);
  await expect(half(page, "L").locator(".seated")).toHaveCount(1);
  await expect(half(page, "R").locator(".seated")).toHaveCount(0);
  await expect(half(page, "L")).toBeDisabled();
  await fill(page, 1, "R");
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("reduced motion uses 150ms opacity-only cross-fades, without flight or scaling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, false);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator(".joint-button").click();
  const effects = await page.evaluate(() =>
    document.getAnimations().map((a) => ({
      duration: a.effect!.getTiming().duration,
      frames: (a.effect as KeyframeEffect).getKeyframes(),
    })),
  );
  expect(effects.length).toBeGreaterThan(0);
  expect(
    effects.every(
      (e) => e.duration === 150 && e.frames.every((f) => !("transform" in f)),
    ),
  ).toBe(true);
  await page.clock.runFor(150);
  await expect(page.locator(".door-transition")).toHaveCount(0);
  await fill(page, 0, "L");
  await page.clock.runFor(150);
  await expect(half(page, "L").locator(".seated")).toHaveCount(1);
  await fill(page, 1, "R");
  await page.clock.runFor(150);
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("restart room joins the doors and restores its unchanged tray", async ({
  page,
}) => {
  await open(page);
  await fill(page, 0, "L");
  await page.locator("#reset").click();
  await expect(page.locator(".room")).not.toHaveClass(/reject/);
  await expect(page.locator(".goal .seated")).toHaveCount(0);
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.locator(".joint-button")).toHaveCount(1);
  await expect(page.locator("[data-key]")).toHaveCount(2);
});

test("keyboard activation finishes running presentation before handling the next input", async ({
  page,
}) => {
  await open(page);
  await fill(page, 0, "L");
  await page.locator('[data-key="1"]').focus();
  await page.keyboard.press("Enter");
  await half(page, "R").focus();
  await page.keyboard.press("Enter");
  await page.locator("#undo").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".replay-tree")).toHaveCount(0);
  await expect(half(page, "L").locator(".seated")).toHaveCount(1);
});

test("joint and split holes have keyboard focus rings and 48px touch targets", async ({
  page,
}) => {
  await open(page, false);
  await page.keyboard.press("Tab");
  await page.locator(".joint-button").focus();
  expect(
    await page
      .locator(".joint-button")
      .evaluate((e) => getComputedStyle(e).outlineStyle),
  ).toBe("solid");
  const box = (await page.locator(".joint-button").boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeGreaterThanOrEqual(48);
  await page.keyboard.press("Enter");
  await half(page, "L").focus();
  await expect(half(page, "L")).toBeFocused();
  expect(
    await half(page, "L").evaluate((e) => getComputedStyle(e).outlineStyle),
  ).toBe("solid");
});

test("a half proved in its room returns to the split row, with one commit haptic", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    Object.assign(window, { buzzes: calls });
    Object.defineProperty(navigator, "vibrate", {
      value: (pattern: unknown) => calls.push(pattern) > 0,
    });
  });
  await open(page);
  await half(page, "L").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.evaluate(() =>
    (window as unknown as { buzzes: [] }).buzzes.splice(0),
  );
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
  await expect(half(page, "L").locator(".seated")).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as unknown as { buzzes: [] }).buzzes),
  ).toEqual([25]);
});

test("path navigation preserves the split and both independent proofs", async ({
  page,
}) => {
  await open(page);
  await half(page, "L").click();
  await page.locator('[data-room="0"]').click();
  await fill(page, 1, "R");
  await expect(page.locator('[data-room="2"]')).toBeDisabled();
  await page.locator('[data-room="1"]').click();
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("nested joints zoom into a half and keep at most two doors in the row", async ({
  page,
}) => {
  await unlock(page, 3);
  await page.locator('[data-stage="3"]').click();
  await page.locator(".goal").click();
  await page.locator('.joint-button[data-path=""]').click();
  await page.locator(".split-doors .joint-button").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
  await expect(page.locator(".split-doors .goal .joint")).toHaveCount(0);
  await expect(page.locator(".replay-tree")).toHaveCount(0);
});

test("one tap on a nested or already split half joint is one undo step and never rejects", async ({
  page,
}) => {
  await unlock(page, 3);
  await page.locator('[data-stage="3"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.locator('.joint-button[data-path="L"]').click();
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  await page.locator("#undo").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await expect(page.locator(".split-doors")).toHaveCount(0);
  await expect(page.locator('.joint-button[data-path="L"]')).toHaveCount(1);
  await page.locator('.joint-button[data-path=""]').click();
  await page.locator('.goal[data-drop="L"] ~ .joint-button').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  await page.locator('.chip[data-room="1"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.locator('.goal[data-drop="L"] ~ .joint-button').click();
  await expect(page.locator(".room")).not.toHaveClass(/reject/);
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  await page.locator("#undo").click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
});
