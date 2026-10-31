import { type Formula } from "./core";
import { card, picture } from "./picture";

const curves = {
  fly: "cubic-bezier(.2,.8,.2,1)",
  out: "cubic-bezier(.22,1,.36,1)",
  io: "cubic-bezier(.65,0,.35,1)",
};
type Options = {
  object: HTMLElement;
  formula: Formula;
  goal: boolean;
  before: string[];
  path: string;
  pair?: boolean;
  last?: boolean;
  source?: DOMRect;
  sourceShape?: DOMRect;
  lifted?: boolean;
  destination?: HTMLElement;
  duplicate?: boolean;
  intro?: boolean;
  returning?: boolean;
  reduced: boolean;
  buzz: (n: number) => void;
  done: () => void;
};
// State is already committed. This disposable presentation never changes the proof.
export function fitMotion(o: Options): () => void {
  const animations: Animation[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const transient: Element[] = [];
  const old = [...o.object.childNodes];
  const w = o.goal ? 184 : 88,
    h = o.goal ? 137 : 66;
  const seated = [...o.before, o.path];
  const final = o.pair && !o.last ? seated : [""];
  const svg = (filled: string[]) => picture(o.formula, w, h, o.goal, filled);
  o.object.innerHTML = svg(o.before);
  const base = o.object.querySelector<SVGSVGElement>(".picture")!;
  const overlay = document.createElement("span");
  overlay.className = "motion-layer";
  overlay.innerHTML = svg(final);
  o.object.append(overlay);
  const full = overlay.querySelector<SVGSVGElement>("svg")!;
  const animate = (
    el: Element,
    frames: Keyframe[],
    duration: number,
    delay = 0,
    easing = curves.out,
  ) => {
    if (o.intro && delay >= 400) delay -= 40;
    const a = el.animate(frames, { duration, delay, easing, fill: "both" });
    animations.push(a);
    return a;
  };
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    timers.forEach(clearTimeout);
    animations.forEach((a) => a.cancel());
    transient.forEach((el) => el.remove());
    o.destination?.style.removeProperty("visibility");
    o.object.replaceChildren(...old);
    o.done();
  };
  if (o.destination && !o.duplicate) o.destination.style.visibility = "hidden";
  if (o.reduced) {
    animate(overlay, [{ opacity: 0 }, { opacity: 1 }], 150, 0, "linear");
    later(150, () => o.buzz(25));
    later(150, finish);
    return finish;
  }
  if (!o.intro && !o.returning) {
    base.querySelectorAll<SVGElement>(".glow[data-path]").forEach((halo) => {
      if ((halo.dataset.path ?? "").startsWith(o.path))
        animate(halo, [{ opacity: 1 }, { opacity: 0 }], 160, 0, "linear");
    });
  }
  // Only the newly seated part flies. Everything else retains its exact old pixels.
  overlay.remove();
  const seatLayer = document.createElement("span");
  seatLayer.className = "motion-layer";
  seatLayer.innerHTML = svg(seated);
  o.object.append(seatLayer);
  const seatSvg = seatLayer.querySelector("svg")!;
  const seatedPart =
    seatSvg.querySelector(`[data-part="${o.path}"]`) ?? seatSvg;
  const seat = document.createElementNS("http://www.w3.org/2000/svg", "g");
  seatedPart.querySelectorAll(".seated").forEach((node) => {
    if (!node.parentElement?.closest(".seated"))
      seat.append(node.cloneNode(true));
  });
  if (o.intro || o.returning) {
    const part = base.querySelector<SVGGElement>(
      `[data-part="${o.returning ? o.path : "T"}"]`,
    );
    if (part) {
      const b = part.getBBox();
      const scale = Math.max(w / b.width, h / b.height);
      base.style.transformOrigin = "0 0";
      animate(
        base,
        [
          {
            transform: `translate(${w / 2 - (b.x + b.width / 2) * scale}px,${h / 2 - (b.y + b.height / 2) * scale}px) scale(${scale})`,
          },
          { transform: "translate(0,0) scale(1)" },
        ],
        300,
        0,
        curves.io,
      );
    }
  }
  if (seat.childNodes.length && !o.intro) {
    const copy = seat.cloneNode(true) as SVGGElement;
    base.append(copy);
    const box = copy.getBoundingClientRect();
    const unit = base.getBoundingClientRect().width / w;
    const source = o.source ?? box;
    const shape = o.sourceShape ?? source;
    const dx = (shape.x + shape.width / 2 - box.x - box.width / 2) / unit;
    const dy = (shape.y + shape.height / 2 - box.y - box.height / 2) / unit;
    const startScale = Math.max(
      0.1,
      (shape.width * (o.lifted ? 1 : 0.8)) / box.width,
    );
    const depth = Math.min(
      3.5,
      Math.max(1, (Math.min(box.width, box.height) / unit) * 0.05),
    );
    copy.style.transformBox = "fill-box";
    copy.style.transformOrigin = "center";
    if (!o.returning)
      animate(
        copy,
        [
          {
            transform: `translate(${dx}px, ${dy}px) rotate(-5deg) scale(${startScale})`,
          },
          { transform: `translateY(${-depth}px) scale(1.04)` },
        ],
        220,
        0,
        curves.fly,
      );
    // Non-overlapping effects: the settle replaces the completed fly at contact.
    const settle = animate(
      copy,
      [
        { transform: `translateY(${-depth}px) scale(1.04)` },
        { transform: "translateY(0) scale(1)" },
      ],
      120,
      o.returning ? 360 : 220,
    );
    if (o.returning) animate(copy, [{ opacity: 0 }, { opacity: 1 }], 120, 360);
    settle.effect?.updateTiming({ fill: "forwards" });
    if (o.source && !o.returning) {
      const rim = document.createElement("span");
      rim.className = "motion-rim";
      rim.innerHTML = card(
        typeof o.formula === "string"
          ? o.formula
          : o.pair
            ? o.path === "L"
              ? o.formula.left
              : o.formula.right
            : o.formula.left,
      );
      document.body.append(rim);
      transient.push(rim);
      rim.style.cssText = `left:${source.x}px;top:${source.y}px;width:${source.width}px;height:${source.height}px`;
      animate(
        rim,
        [
          { transform: `scale(${o.lifted ? 1 : 0.8}) rotate(-5deg)` },
          {
            transform: `translate(${box.x + box.width / 2 - source.x - source.width / 2}px,${box.y + box.height / 2 - source.y - source.height / 2}px) scale(${(box.width * 1.04) / source.width})`,
          },
        ],
        220,
        0,
        curves.fly,
      );
      animate(rim, [{ opacity: 1 }, { opacity: 0 }], 160, 0, "linear");
    }
  }
  seatLayer.remove();
  if (!o.intro) later(o.returning ? 360 : 220, () => o.buzz(25));
  if (o.pair) {
    if (o.last) {
      const bar = full.querySelector<SVGGElement>(
        ":scope > .pair > .bridge > .seated",
      )!;
      base.append(bar);
      bar.setAttribute("class", "seated locking-bar");
      const b = bar.getBoundingClientRect();
      bar.style.transformBox = "fill-box";
      bar.style.transformOrigin = "center";
      animate(
        bar,
        [
          { transform: b.width >= b.height ? "scaleX(0)" : "scaleY(0)" },
          { transform: "scale(1)" },
        ],
        220,
        o.returning ? 540 : 400,
      );
      later(o.returning ? 760 : 620, () => o.buzz(25));
    }
    later(
      o.returning ? (o.last ? 820 : 480) : o.last ? 680 : 340,
      o.last ? () => openDoor() : finish,
    );
  } else {
    const arrow = full.querySelector(":scope > .arrow")!;
    arrow.setAttribute("pathLength", "1");
    arrow.setAttribute("stroke-dasharray", "1");
    base.append(arrow);
    animate(
      arrow,
      [{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }],
      220,
      400,
      curves.io,
    );
    const result = full.querySelector<SVGGElement>(":scope > .result")!;
    base.append(result);
    animate(result, [{ opacity: 0 }, { opacity: 1 }], 240, 680);
    result.style.transformBox = "fill-box";
    result.style.transformOrigin = "center";
    animate(
      result,
      [
        { transform: "scale(1)" },
        { transform: "scale(1.04)", offset: 0.5 },
        { transform: "scale(1)" },
      ],
      240,
      920,
      curves.io,
    );
    const rb = result.getBBox();
    const sparkle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    sparkle.setAttribute(
      "d",
      "M0 -6L1.5 -1.5L6 0L1.5 1.5L0 6L-1.5 1.5L-6 0L-1.5 -1.5Z",
    );
    sparkle.setAttribute("fill", "#FFE7A8");
    const star = document.createElementNS("http://www.w3.org/2000/svg", "g");
    star.setAttribute("transform", `translate(${rb.x + rb.width} ${rb.y})`);
    star.append(sparkle);
    base.append(star);
    animate(
      sparkle,
      [{ transform: "scale(0)" }, { transform: "scale(1)" }],
      120,
      920,
    );
    animate(
      star,
      [{ opacity: 1 }, { opacity: 0 }],
      120,
      1040,
      "linear",
    ).effect?.updateTiming({ fill: "forwards" });
    // Hide the sparkle before its obtaining beat without scaling the result.
    animate(
      star,
      [{ opacity: 0 }, { opacity: 1 }],
      1,
      920,
    ).effect?.updateTiming({ fill: "backwards" });
    later(o.intro ? 880 : 920, () => o.buzz(10));
    if (o.destination) {
      const to = o.destination.getBoundingClientRect();
      const from = result.getBoundingClientRect();
      const flight = document.createElement("span");
      flight.className = "result-flight";
      const formula =
        typeof o.formula === "string" ? o.formula : o.formula.right;
      flight.innerHTML = `<span class="delivered-frame">${card(formula)}</span><svg class="delivered-shape" viewBox="${rb.x} ${rb.y} ${rb.width} ${rb.height}">${result.outerHTML}</svg>`;
      document.body.append(flight);
      transient.push(flight);
      flight.style.cssText = `left:${from.x}px;top:${from.y}px;width:${from.width}px;height:${from.height}px`;
      animate(
        flight,
        [
          {
            transform: "translate(0,0)",
            width: `${from.width}px`,
            height: `${from.height}px`,
          },
          {
            transform: `translate(${to.x - from.x}px,${to.y - from.y}px)`,
            width: `${to.width}px`,
            height: `${to.height}px`,
          },
        ],
        300,
        1160,
        curves.io,
      );
      animate(flight, [{ opacity: 0 }, { opacity: 1 }], 1, 1160, "linear");
      const frame = flight.querySelector<HTMLElement>(".delivered-frame")!;
      animate(frame, [{ opacity: 0 }, { opacity: 1 }], 120, 1340);
      animate(
        flight.querySelector(".delivered-shape")!,
        [{ opacity: 1 }, { opacity: 0 }],
        120,
        1340,
      );
      animate(
        result,
        [{ opacity: 1 }, { opacity: 0 }],
        200,
        1160,
      ).effect?.updateTiming({ fill: "forwards" });
      const seats = base.querySelectorAll(".seated");
      seats.forEach((s) =>
        animate(s, [{ opacity: 1 }, { opacity: 0 }], 200, 1160),
      );
      animate(arrow, [{ opacity: 1 }, { opacity: 0 }], 200, 1160);
      if (o.duplicate)
        animate(
          o.destination,
          [
            { transform: "scale(1)" },
            { transform: "scale(1.04)", offset: 0.5 },
            { transform: "scale(1)" },
          ],
          240,
          1460,
          curves.io,
        );
      later(1460, () => flight.remove());
      later(o.duplicate ? 1700 : 1460, finish);
    } else later(o.intro ? 1180 : 1220, () => openDoor());
  }
  function openDoor() {
    const door = o.object;
    const box = door.getBoundingClientRect();
    const light = document.createElement("span");
    light.className = "opening-light";
    light.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px`;
    door.before(light);
    transient.push(light);
    door.style.zIndex = "1";
    animate(light, [{ opacity: 0 }, { opacity: 1 }], 300, 100);
    door.style.transformOrigin = "left center";
    animate(
      door,
      [
        { transform: "perspective(700px) rotateY(0deg)" },
        { transform: "perspective(700px) rotateY(-85deg)" },
      ],
      400,
      0,
      curves.io,
    );
    later(400, finish);
  }
  return finish;
}
