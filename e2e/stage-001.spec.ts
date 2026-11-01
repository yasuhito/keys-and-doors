import { test, expect, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("./");
  await page.locator('[data-stage="0"]').click();
}
const barAnimations = (page: Page) =>
  page.locator(".goal .joint").evaluate((el) =>
    el.getAnimations().map((a) => ({
      frames: (a.effect as KeyframeEffect).getKeyframes(),
      duration: a.effect!.getTiming().duration,
    })),
  );

test("stage-001 idle and requested hints rotate only the bar, and first touch stops idle hints", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await open(page);
  await expect(page.locator(".tutorial-hand,.hint,.empty-slot")).toHaveCount(0);
  await page.clock.runFor(2500);
  const animations = await barAnimations(page);
  expect(animations).toHaveLength(1);
  expect(animations[0].duration).toBe(280);
  expect(animations[0].frames.map((f) => f.transform)).toEqual([
    "rotate(0deg)",
    "rotate(-6deg)",
    "rotate(6deg)",
    "rotate(-3deg)",
    "rotate(0deg)",
  ]);
  await page.clock.runFor(280);
  await page.locator("#hint").click();
  expect(await barAnimations(page)).toHaveLength(1);
  await expect(
    page.locator(".hint,.tutorial-hand,.formula-bubble"),
  ).toHaveCount(0);
  await page.clock.runFor(9000);
  expect(await barAnimations(page)).toHaveLength(0);
});

test("stage-001 bar long-press shows only its formula, never splits, and retains a square 48px target", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await open(page);
  const target = page.locator(".joint-button");
  const box = (await target.boundingBox())!;
  expect(box.width).toBe(48);
  expect(box.height).toBe(48);
  const brass = (await page.locator(".goal .joint-face").boundingBox())!;
  expect(brass.width).toBeGreaterThan(brass.height * 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(target).toHaveClass(/pressed/);
  await page.clock.runFor(450);
  await expect(page.locator(".formula-bubble")).toHaveText("(P ∧ Q)");
  await expect(page.locator(".formula-bubble svg")).toHaveCount(0);
  await expect(target).not.toHaveClass(/pressed/);
  await page.mouse.up();
  await expect(page.locator(".formula-bubble,.split-doors")).toHaveCount(0);
  await target.press("Space");
  await expect(page.locator(".split-doors .goal")).toHaveCount(2);
});

test("stage-001 rejects a dragged single key before splitting, with no proof or clearing", async ({
  page,
}) => {
  await open(page);
  const from = (await page.locator('[data-key="0"]').boundingBox())!;
  const to = (await page.locator(".goal").boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 35, to.y + to.height / 2 + 65, { steps: 10 });
  await expect(page.locator(".goal.valid,.glow.matching")).toHaveCount(0);
  await page.mouse.up();
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(
    page.locator(".goal .seated,.replay-tree,.split-doors"),
  ).toHaveCount(0);
  await expect(page.locator("#undo")).toBeDisabled();
  await expect(page.locator("[data-key]")).toHaveCount(2);
});

test("stage-001 reduced motion disables every wobble trigger without replacement hints", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await open(page);
  await page.clock.runFor(9000);
  expect(await barAnimations(page)).toHaveLength(0);
  await page.locator("#hint").click();
  expect(await barAnimations(page)).toHaveLength(0);
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click({ position: { x: 30, y: 90 } });
  expect(await barAnimations(page)).toHaveLength(0);
  await expect(
    page.locator(".hint,.tutorial-hand,.joint-hint,.formula-bubble"),
  ).toHaveCount(0);
  await expect(page.locator('[data-key="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
