import { test, expect, type Page } from "@playwright/test";
import { unlock } from "./unlock";

async function open(page: Page) {
  await page.goto("./");
  await page.locator('[data-stage="0"]').click();
}
async function drag(page: Page, key: number, side: "L" | "R") {
  const from = (await page.locator(`[data-key="${key}"]`).boundingBox())!;
  const to = (await page.locator(`.goal [data-drop="${side}"]`).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 65, {
    steps: 10,
  });
}
for (const gesture of ["drag", "tap-tap"] as const) {
  test(`direct pair filling with ${gesture}, wrong half, retained keys and undo`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page.locator('[data-key="0"]').click();
    await expect(page.locator(".goal .glow.matching")).toHaveCount(1);
    await expect(page.locator(".door-preview")).toBeVisible();
    await page.locator('.goal [data-drop="R"]').click();
    await expect(page.locator('[data-key="0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".chip")).toHaveCount(1);
    if (gesture === "drag") {
      await drag(page, 0, "L");
      await expect(page.locator('.goal [data-drop="L"]')).toHaveClass(
        /hovered/,
      );
      await page.mouse.up();
    } else await page.locator('.goal [data-drop="L"]').click();
    await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
    await expect(
      page.locator('.goal [data-part="L"] .seated').first(),
    ).toBeAttached();
    await expect(page.locator('.goal [data-part="R"] .seated')).toHaveCount(0);
    await expect(page.locator("[data-key]")).toHaveCount(2);
    await page.locator("#undo").click();
    await expect(page.locator(".chip")).toHaveCount(1);
    await expect(page.locator(".goal .seated")).toHaveCount(0);
    if (gesture === "drag") {
      await drag(page, 1, "R");
      await page.mouse.up();
    } else {
      await page.locator('[data-key="1"]').click();
      await page.locator('.goal [data-drop="R"]').click();
    }
    // The next touch ends the previous animation and is still handled normally.
    await page.locator('[data-key="0"]').click();
    await expect(page.locator('[data-key="0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator('.goal [data-drop="L"]').click();
    await expect(page.locator(".locking-bar")).toBeAttached();
    await expect(page.locator(".replay-tree")).toBeVisible();
    await page.locator("#close").click();
    await expect(page.locator('[data-rewatch="0"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("undo during the final bar lock restores the unfinished pair", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-key="0"]').click();
  await page.locator('.goal [data-drop="L"]').click();
  await page.locator('[data-key="1"]').click();
  await page.locator('.goal [data-drop="R"]').click();
  await expect(page.locator(".locking-bar")).toBeAttached();
  await page.locator("#undo").click();
  await expect(page.locator(".replay-tree")).toHaveCount(0);
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
  await expect(page.locator('.goal [data-part="L"] .seated')).toHaveCount(1);
  await expect(page.locator('.goal [data-part="R"] .seated')).toHaveCount(0);
  await page.locator('[data-key="1"]').click();
  await expect(page.locator('[data-key="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Restored SVG parts must still reject a drop on the already-filled hole.
  await page.locator('.goal [data-drop="L"]').click();
  await expect(page.locator('[data-key="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('.goal [data-drop="R"]').click();
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("reduced motion is one 150ms cross-fade, with no scaling or flight", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.locator('[data-key="0"]').click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator('.goal [data-drop="L"]').click();
  const effects = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.effect instanceof KeyframeEffect)
      .map((a) => ({
        duration: a.effect!.getTiming().duration,
        frames: (a.effect as KeyframeEffect).getKeyframes(),
      })),
  );
  expect(effects).toHaveLength(1);
  expect(effects[0].duration).toBe(150);
  expect(effects[0].frames.every((frame) => !("transform" in frame))).toBe(
    true,
  );
  await expect(
    page.locator(".result-flight,.motion-rim,.locking-bar"),
  ).toHaveCount(0);
  await page.clock.runFor(150);
  await expect(page.locator(".motion-layer")).toHaveCount(0);
  await expect(page.locator('.goal [data-part="L"] .seated')).toHaveCount(1);
  await page.locator('[data-key="1"]').click();
  await page.locator('.goal [data-drop="R"]').click();
  await page.clock.runFor(150);
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("restart room takes back a direct fill with an unchanged tray", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-key="0"]').click();
  await page.locator('.goal [data-drop="L"]').click();
  await expect(page.locator('.goal [data-part="L"] .seated')).toHaveCount(1);
  await expect(page.locator(".chip")).toHaveCount(3);
  await page.locator("#reset").click();
  await expect(page.locator(".room")).not.toHaveClass(/reject/);
  await expect(page.locator(".goal .seated")).toHaveCount(0);
  await expect(page.locator(".chip")).toHaveCount(1);
  await expect(page.locator("[data-key]")).toHaveCount(2);
});

test("a keyboard press on a hole ends the running animation first", async ({
  page,
}) => {
  await unlock(page, 2);
  await page.locator('[data-stage="2"]').click();
  await page.locator(".goal").click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator('[data-key="1"]').click();
  await page.locator('.goal [data-drop="L"]').click();
  await page.clock.runFor(1000);
  await page.locator('[data-key="0"]').click();
  await page.locator('.goal [data-drop="R"]').click();
  await page.clock.runFor(1200);
  await expect(page.locator(".door-fit")).toBeAttached();
  await page.locator('.goal [data-drop="R"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".door-fit")).toHaveCount(0);
  await expect(page.locator(".replay-tree")).toBeVisible();
});

test("pair holes show a focus ring when reached by keyboard", async ({
  page,
}) => {
  await open(page);
  await page.locator(".goal").focus();
  await page.keyboard.press("Tab");
  const hole = page.locator('.goal [data-drop="L"]');
  await expect(hole).toBeFocused();
  expect(
    await hole.evaluate((el) => [
      el.matches(":focus-visible"),
      getComputedStyle(el).outlineStyle,
      getComputedStyle(el).outlineWidth,
    ]),
  ).toEqual([true, "solid", "3px"]);
});

test("a half seated on return plays its own haptic only once", async ({
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
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator('.goal [data-drop="L"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.evaluate(() =>
    (window as unknown as { buzzes: [] }).buzzes.splice(0),
  );
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await page.clock.runFor(2000);
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "2");
  expect(
    await page.evaluate(() => (window as unknown as { buzzes: [] }).buzzes),
  ).toEqual([25]);
});

test("the path chip returns to an unfinished pair door, where the other half can be filled", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await page.locator('.goal [data-drop="L"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await expect(page.locator('[data-room="0"]')).toBeEnabled();
  await page.locator('[data-room="0"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
  await page.locator('[data-key="1"]').click();
  await page.locator('.goal [data-drop="R"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "0");
  await expect(
    page.locator('.goal [data-part="R"] .seated').first(),
  ).toBeAttached();
  await expect(page.locator('[data-room="2"]')).toBeDisabled();
  await page.locator('[data-room="1"]').click();
  await expect(page.locator(".chip.here")).toHaveAttribute("data-room", "1");
  await page.locator('[data-key="0"]').click();
  await page.locator(".goal").click();
  await expect(page.locator(".replay-tree")).toBeVisible();
  expect(errors).toEqual([]);
});
