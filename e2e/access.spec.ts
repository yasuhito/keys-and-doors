import { test, expect } from "@playwright/test";
test("touch on phones and keyboard on desktop", async ({ page }, info) => {
  await page.goto("./");
  if (info.project.name === "phone") {
    await page.locator('[data-stage="0"]').tap();
    await page.locator(".joint-button").tap();
    const key = (await page.locator('[data-key="0"]').boundingBox())!;
    const goal = (await page.locator('.goal[data-drop="L"]').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const point = (x: number, y: number) => [{ x, y, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: point(key.x + 30, key.y + 30),
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(key.x + 45, key.y + 10),
    });
    await expect(page.locator(".drag-copy")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(
        goal.x + goal.width / 2,
        goal.y + goal.height / 2 + 65,
      ),
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    for (const selector of [
      '[data-stage="0"]',
      ".joint-button",
      '[data-key="0"]',
      '.goal[data-drop="L"]',
    ]) {
      await page.locator(selector).focus();
      await page.keyboard.press("Enter");
    }
  }
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
  await page.locator('[data-key="1"]').click();
  await page.locator('.goal[data-drop="R"]').click();
  await expect(page.locator(".replay-tree")).toBeVisible();
  await page.locator(".scrubber").fill("1");
  await expect(
    page.locator(".proof-node.visible > .inference").first(),
  ).toHaveCSS("opacity", "1");
  await expect(
    page.locator(".proof-node:not(.visible) > .inference").first(),
  ).toHaveCSS("opacity", "0");
});
