import { KEY_SPLIT as K, KEY_SPLIT_PROVISIONAL as P } from "./tuning";

// Presentation only: the caller has already committed and rendered the new tray.
export function keySplitMotion(
  targets: { button: HTMLElement; source: DOMRect; fresh: boolean }[],
  reduced: boolean,
  buzz: (pattern: number) => void,
  done: () => void,
) {
  const animations: Animation[] = [];
  const copies: HTMLElement[] = [];
  const fresh = targets.filter((t) => t.fresh);
  if (fresh.length) buzz(25);
  const lightTimer = setTimeout(() => buzz(10), reduced ? 0 : K.launchMs);
  if (fresh.length) clearTimeout(lightTimer);
  for (const { button, source, fresh } of targets) {
    if (!fresh) {
      button.classList.add("held-flash");
      const glow = button.querySelector<SVGElement>(".held-glow")!;
      animations.push(
        glow.animate(
          [
            { opacity: 0 },
            { opacity: P.heldOpacity, offset: 0.5 },
            { opacity: 0 },
          ],
          {
            duration: reduced ? P.reducedHeldHalfMs * 2 : P.heldFlashMs,
            delay: reduced ? 0 : K.launchMs,
            easing: reduced ? "linear" : "cubic-bezier(.65,0,.35,1)",
            fill: "both",
          },
        ),
      );
      continue;
    }
    const object = button.querySelector<HTMLElement>(".object")!;
    if (reduced) {
      animations.push(
        object.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: K.reducedFadeMs,
          delay: K.returnMs,
          fill: "both",
          easing: "linear",
        }),
      );
      continue;
    }
    const box = object.getBoundingClientRect();
    const copy = document.createElement("div");
    copy.className = "result-flight key-flight";
    copy.style.left = `${box.x}px`;
    copy.style.top = `${box.y}px`;
    copy.style.width = `${box.width}px`;
    copy.style.height = `${box.height}px`;
    copy.append(object.cloneNode(true));
    document.body.append(copy);
    copies.push(copy);
    button.classList.add("incoming");
    const shape = copy
      .querySelector('[data-key-part=""]')!
      .getBoundingClientRect();
    const scale = source.width / shape.width;
    const dx =
      source.x +
      source.width / 2 -
      (box.x + box.width / 2) -
      (shape.x + shape.width / 2 - box.x - box.width / 2) * scale;
    const dy =
      source.y +
      source.height / 2 -
      (box.y + box.height * 0.475) -
      (shape.y + shape.height / 2 - box.y - box.height * 0.475) * scale;
    animations.push(
      copy.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          {
            transform: `translate(${dx / 2}px, ${dy / 2 - K.arcPx}px) scale(${(scale + 1) / 2})`,
            offset: 0.5,
          },
          { transform: "translate(0, 0) scale(1)" },
        ],
        {
          duration: K.flightMs,
          delay: K.launchMs,
          easing: "cubic-bezier(.65,0,.35,1)",
          fill: "both",
        },
      ),
    );
    const body = copy.querySelector(".body")!;
    animations.push(
      body.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: K.bodyMs,
        delay: K.launchMs + K.flightMs - K.bodyMs,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "both",
      }),
    );
  }
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    clearTimeout(lightTimer);
    animations.forEach((a) => a.cancel());
    copies.forEach((c) => c.remove());
    targets.forEach(({ button }) =>
      button.classList.remove("incoming", "held-flash"),
    );
    done();
  };
  const timer = setTimeout(
    finish,
    reduced
      ? Math.max(
          fresh.length ? K.returnMs + K.reducedFadeMs : 0,
          targets.some((t) => !t.fresh) ? P.reducedHeldHalfMs * 2 : 0,
        )
      : K.launchMs + (fresh.length ? K.flightMs : P.heldFlashMs),
  );
  return finish;
}
