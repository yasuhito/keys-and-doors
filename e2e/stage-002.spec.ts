import { test, expect, type Page } from "@playwright/test";
import { unlock } from "./unlock";

async function open(page: Page) {
  await unlock(page, 1);
  await page.locator('[data-stage="1"]').click();
}
const bar = (page: Page) => page.locator('.key-joint[data-key="0"]');

test("stage-002 splits copies from the brass bar, flashes held keys once and opens each half", async ({
  page,
}, info) => {
  await open(page);
  await expect(page.locator(".empty-slot")).toHaveCount(0);
  await expect(page.locator(".key-button")).toHaveCount(1);
  const box = (await bar(page).boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeGreaterThanOrEqual(48);
  await expect(bar(page)).toHaveAttribute(
    "aria-label",
    "鍵を分ける: sun and moon",
  );
  await page.screenshot({
    path: `/tmp/kd/shots/${info.project.name}-stage-002-before.png`,
  });
  await bar(page).click();
  await expect(page.locator(".key-button")).toHaveCount(3);
  await expect(page.locator('.key-button[data-key="0"]')).toHaveAttribute(
    "data-formula",
    "(P ∧ Q)",
  );
  await expect(page.locator(".key-flight")).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/kd/shots/${info.project.name}-stage-002-after.png`,
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await bar(page).click();
  await expect(page.locator(".key-button")).toHaveCount(3);
  await expect(page.locator(".held-flash")).toHaveCount(2);
  await page.clock.runFor(300);
  for (const glow of await page.locator(".held-flash .held-glow").all()) {
    const animation = await glow.evaluate((el) =>
      el.getAnimations().map((a) => ({
        frames: (a.effect as KeyframeEffect)
          .getKeyframes()
          .map((f) => f.opacity),
        iterations: a.effect!.getTiming().iterations,
      })),
    );
    expect(animation).toEqual([{ frames: ["0", "0.6", "0"], iterations: 1 }]);
  }
  await page.clock.runFor(180);
  await expect(page.locator(".held-flash")).toHaveCount(0);
  await page.locator("#undo").click();
  await expect(page.locator(".key-button")).toHaveCount(1);
  await page.clock.runFor(150);
  await bar(page).click();
  await page.clock.runFor(480);
  await page.locator(".goal-frame > .joint-button").click();
  await page.clock.runFor(480);
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
  await page.locator('.key-button[data-key="2"]').click();
  await page.locator('[data-drop="L"]').click();
  await page.clock.runFor(700);
  await page.locator('.key-button[data-key="1"]').click();
  await page.locator('[data-drop="R"]').click();
  await page.clock.runFor(1500);
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("stage-002 reduced motion uses local fades, not flights or wobbles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await bar(page).click();
  await expect(page.locator(".key-button")).toHaveCount(3);
  await expect(page.locator(".key-flight")).toHaveCount(0);
  const frames = await page
    .locator('.key-button[data-key="1"] .object')
    .evaluate((el) =>
      el.getAnimations().map((a) => ({
        duration: a.effect!.getTiming().duration,
        frames: (a.effect as KeyframeEffect).getKeyframes(),
      })),
    );
  expect(frames[0].duration).toBe(150);
  expect(frames[0].frames.map((f) => f.opacity)).toEqual(["0", "1"]);
  await page.clock.runFor(270);
  await bar(page).click();
  await page.clock.runFor(300);
  await expect(page.locator(".held-flash")).toHaveCount(0);
  await page.locator("#hint").click();
  expect(
    await page
      .locator('.bridge[data-path=""]')
      .evaluate((el) => el.getAnimations().length),
  ).toBe(0);
});

test("stage-002 bar long press and drag do not split; keyboard splits and clears selection", async ({
  page,
}) => {
  await open(page);
  const box = (await bar(page).boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator(".formula-bubble")).toHaveText("(P ∧ Q)");
  await page.mouse.up();
  await expect(page.locator(".key-button")).toHaveCount(1);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 9, y, { steps: 3 });
  await expect(page.locator(".drag-copy")).toBeVisible();
  await expect(page.locator(".key-button")).toHaveCount(1);
  await page.mouse.move(x + 35, y + 50);
  await page.mouse.up();
  await expect(page.locator(".drag-copy")).toHaveCount(0);
  await expect(page.locator(".key-button")).toHaveCount(1);
  await page.locator(".key-button").press("Enter");
  await expect(page.locator(".key-button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await bar(page).press("Space");
  await expect(page.locator(".key-button")).toHaveCount(3);
  await expect(page.locator(".selected")).toHaveCount(0);
});

test("stage-002 idle and requested hints wobble door then useful key, stopping after first touch", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await open(page);
  const door = page.locator(".goal .joint");
  const key = page.locator('.key-button .bridge[data-path=""]');
  const count = (el: typeof key) =>
    el.evaluate((node) => node.getAnimations().length);
  await page.clock.runFor(2500);
  expect(await count(door)).toBe(1);
  expect(await count(key)).toBe(0);
  await page.clock.runFor(280);
  expect(await count(door)).toBe(0);
  await page.clock.runFor(60);
  expect(await count(key)).toBe(1);
  await page.clock.runFor(280);
  await page.locator("#hint").click();
  expect(await count(door)).toBe(1);
  await page.clock.runFor(340);
  expect(await count(key)).toBe(1);
  await page.clock.runFor(9000);
  expect(await count(door)).toBe(0);
  expect(await count(key)).toBe(0);
  await bar(page).click();
  await page.clock.runFor(480);
  await page.locator("#hint").click();
  await page.clock.runFor(340);
  expect(await count(key)).toBe(0);
});

test("stage-002 flight copies start on the original silhouettes and land without changing them", async ({
  page,
}) => {
  await open(page);
  const original = await Promise.all(
    ["L", "R"].map((part) =>
      page
        .locator(`.key-button [data-key-part="${part}"]`)
        .evaluate((el) => el.getBoundingClientRect().toJSON()),
    ),
  );
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await bar(page).click();
  await expect(page.locator(".incoming")).toHaveCount(2);
  const flights = page.locator(".key-flight");
  await expect(flights).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const flight = flights.nth(i);
    const timing = await flight.evaluate((el) => {
      const a = el.getAnimations()[0];
      a.pause();
      a.currentTime = 180;
      return {
        duration: a.effect!.getTiming().duration,
        delay: a.effect!.getTiming().delay,
        frames: (a.effect as KeyframeEffect).getKeyframes(),
      };
    });
    expect(timing.duration).toBe(300);
    expect(timing.delay).toBe(180);
    const source = await flight
      .locator('[data-key-part=""]')
      .evaluate((el) => el.getBoundingClientRect().toJSON());
    expect(source.x).toBeCloseTo(original[i]!.x, 1);
    expect(source.y).toBeCloseTo(original[i]!.y, 1);
    expect(source.width).toBeCloseTo(original[i]!.width, 1);
    const bodyTiming = await flight
      .locator(".body")
      .evaluate((el) => el.getAnimations()[0].effect!.getTiming());
    expect(bodyTiming.delay).toBe(380);
    expect(bodyTiming.duration).toBe(100);
  }
  await page.clock.runFor(480);
  await expect(flights).toHaveCount(0);
  await expect(page.locator(".incoming")).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    const box = await page
      .locator(`.key-button[data-key="0"] [data-key-part="${i ? "R" : "L"}"]`)
      .evaluate((el) => el.getBoundingClientRect().toJSON());
    expect(box).toEqual(original[i]);
  }
});
