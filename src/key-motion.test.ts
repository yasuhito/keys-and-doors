import { afterEach, expect, it, vi } from "vitest";
import { keySplitMotion } from "./key-motion";

function target(fresh: boolean) {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }));
  const classes = new Set<string>();
  const button = {
    classList: {
      add: (...names: string[]) => names.forEach((n) => classes.add(n)),
      remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
    },
    querySelector: () => ({ animate }),
  } as unknown as HTMLElement;
  return { button, source: {} as DOMRect, fresh, animate, cancel, classes };
}
afterEach(() => vi.useRealTimers());

it("fades reduced-motion copies locally after the bar returns, then cleans once", () => {
  vi.useFakeTimers();
  const t = target(true),
    buzz = vi.fn(),
    done = vi.fn();
  const finish = keySplitMotion([t], true, buzz, done);
  expect(buzz).toHaveBeenCalledExactlyOnceWith(25);
  expect(t.animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], {
    duration: 150,
    delay: 120,
    fill: "both",
    easing: "linear",
  });
  vi.advanceTimersByTime(269);
  expect(done).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(done).toHaveBeenCalledTimes(1);
  finish();
  expect(t.cancel).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledTimes(1);
});

it("flashes existing results only once, without scaling, with one delayed light haptic", () => {
  vi.useFakeTimers();
  const a = target(false),
    b = target(false),
    buzz = vi.fn(),
    done = vi.fn();
  keySplitMotion([a, b], false, buzz, done);
  expect(a.classes.has("held-flash")).toBe(true);
  expect(a.animate).toHaveBeenCalledExactlyOnceWith(
    [{ opacity: 0 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }],
    {
      duration: 240,
      delay: 180,
      easing: "cubic-bezier(.65,0,.35,1)",
      fill: "both",
    },
  );
  expect(buzz).not.toHaveBeenCalled();
  vi.advanceTimersByTime(180);
  expect(buzz).toHaveBeenCalledExactlyOnceWith(10);
  vi.advanceTimersByTime(239);
  expect(done).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(a.classes.size).toBe(0);
  expect(b.classes.size).toBe(0);
  expect(done).toHaveBeenCalledTimes(1);
});

it("fades only the missing reduced-motion result and glows the held result without a second haptic", () => {
  vi.useFakeTimers();
  const fresh = target(true),
    held = target(false),
    buzz = vi.fn(),
    done = vi.fn();
  keySplitMotion([fresh, held], true, buzz, done);
  expect(fresh.classes.size).toBe(0);
  expect(held.classes.has("held-flash")).toBe(true);
  expect(held.animate).toHaveBeenCalledWith(
    [{ opacity: 0 }, { opacity: 0.6, offset: 0.5 }, { opacity: 0 }],
    { duration: 300, delay: 0, easing: "linear", fill: "both" },
  );
  vi.advanceTimersByTime(270);
  expect(done).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30);
  expect(done).toHaveBeenCalledTimes(1);
  expect(buzz).toHaveBeenCalledExactlyOnceWith(25);
});
it("finishes interrupted presentation before subsequent input without a late buzz", () => {
  vi.useFakeTimers();
  const a = target(false),
    buzz = vi.fn(),
    done = vi.fn();
  const finish = keySplitMotion([a], false, buzz, done);
  finish();
  vi.runAllTimers();
  expect(buzz).not.toHaveBeenCalled();
  expect(a.cancel).toHaveBeenCalledTimes(1);
  expect(a.classes.size).toBe(0);
  expect(done).toHaveBeenCalledTimes(1);
});
