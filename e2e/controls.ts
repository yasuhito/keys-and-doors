import { type Page } from "@playwright/test";

// Enter the first subgoal for the legacy room-oriented test flows. Pair intro
// now has two explicit interactions: split at the joint, then enter a half.
export async function activateDoor(page: Page) {
  if (await page.locator('.key-button[aria-pressed="true"]').count()) {
    const valid = page.locator(".goal.valid");
    await (
      (await valid.count()) ? valid.first() : page.locator(".goal").first()
    ).click({ position: { x: 30, y: 90 } });
    return;
  }
  const joint = page.locator(
    '.goal-frame:has(.goal[data-drop="door"]) .joint-button[data-path=""]',
  );
  if (await joint.count()) await joint.click();
  const half = page.locator(".split-doors .goal:not([disabled])");
  await ((await half.count()) ? half.first() : page.locator(".goal")).click({
    position: { x: 30, y: 90 },
  });
}
