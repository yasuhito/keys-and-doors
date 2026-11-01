// Presentation only: proof transitions and independent subgoals belong to core.ts.
const curve = "cubic-bezier(.65,0,.35,1)";
function transitionSnapshot(before: HTMLElement) {
  before.className = "door-transition";
  before.inert = true;
  before.setAttribute("aria-hidden", "true");
  before
    .querySelectorAll(".joint-button,.tutorial-hand")
    .forEach((el) => el.remove());
  before.querySelectorAll("[data-drop],[data-formula]").forEach((el) => {
    el.removeAttribute("data-drop");
    el.removeAttribute("data-formula");
  });
  before.querySelectorAll(".goal").forEach((el) => {
    el.classList.remove("goal");
    el.classList.add("transition-goal");
  });
}
export function joinDoors(
  area: HTMLElement,
  before: HTMLElement,
  reduced: boolean,
  done: () => void,
): () => void {
  transitionSnapshot(before);
  area.append(before);
  const duration = reduced ? 150 : 300;
  const animations = [
    before.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration,
      fill: "both",
      easing: reduced ? "linear" : curve,
    }),
  ];
  if (!reduced)
    before.querySelectorAll(".goal-frame").forEach((leaf, i) => {
      animations.push(
        leaf.animate(
          [
            { transform: "translateX(0)" },
            { transform: `translateX(${i ? -43.5 : 43.5}px)` },
          ],
          { duration, easing: curve, fill: "both" },
        ),
      );
    });
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    animations.forEach((a) => a.cancel());
    before.remove();
    done();
  };
  const timer = setTimeout(finish, duration);
  return finish;
}
export function doorMotion(
  area: HTMLElement,
  before: HTMLElement | undefined,
  split: boolean,
  cleared: boolean,
  reduced: boolean,
  done: () => void,
  seat?: { side: "L" | "R"; source?: DOMRect; lifted: boolean },
): () => void {
  const animations: Animation[] = [];
  const transient: Element[] = [];
  const animate = (
    el: Element,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => {
    animations.push(
      el.animate(frames, {
        fill: "both",
        easing: reduced ? "linear" : curve,
        ...options,
      }),
    );
  };
  const row = area.querySelector<HTMLElement>(".split-doors");
  let overlay: HTMLElement | undefined;
  if (split && before) {
    overlay = before;
    transitionSnapshot(overlay);
    area.append(overlay);
    animate(overlay, [{ opacity: 1 }, { opacity: 0 }], {
      delay: reduced ? 0 : 180,
      duration: reduced ? 150 : 200,
    });
    if (row) {
      animate(row, [{ opacity: 0 }, { opacity: 1 }], {
        delay: reduced ? 0 : 280,
        duration: reduced ? 150 : 200,
      });
      if (!reduced) {
        row.querySelectorAll(".goal-frame").forEach((leaf, i) => {
          animate(
            leaf,
            [
              { transform: `translateX(${i ? -43.5 : 43.5}px)` },
              { transform: "translateX(0)" },
            ],
            { delay: 180, duration: 300 },
          );
        });
        const old =
          overlay.querySelector(".joint.tapped") ??
          overlay.querySelector(".joint");
        const bar = row.querySelector(".and-bar");
        if (old && bar) {
          const from = old.getBoundingClientRect(),
            to = bar.getBoundingClientRect();
          animate(
            bar,
            [
              {
                transform: `translateX(${from.x + from.width / 2 - to.x - to.width / 2}px)`,
              },
              { transform: "translateX(0)" },
            ],
            { delay: 180, duration: 300 },
          );
        }
      }
    }
  } else {
    const seated = area.querySelector<SVGGElement>(
      `.goal[data-drop="${seat?.side}"] .seated`,
    );
    if (seated) {
      if (reduced || !seat?.source)
        animate(seated, [{ opacity: 0 }, { opacity: 1 }], {
          duration: reduced ? 150 : 340,
        });
      else {
        const svg = seated.ownerSVGElement!,
          box = seated.getBoundingClientRect();
        const unit =
          svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        const source = seat.source;
        const dx = (source.x + source.width / 2 - box.x - box.width / 2) / unit;
        const dy =
          (source.y + source.height / 2 - box.y - box.height / 2) / unit;
        const scale = Math.max(
          0.1,
          (source.width * (seat.lifted ? 1 : 0.8)) / box.width,
        );
        const copy = seated.cloneNode(true) as SVGGElement;
        copy.classList.remove("seated");
        copy.classList.add("seat-flight");
        copy.style.transformBox = "fill-box";
        copy.style.transformOrigin = "center";
        svg.append(copy);
        transient.push(copy);
        animate(seated, [{ opacity: 0 }, { opacity: 1 }], {
          delay: 340,
          duration: 1,
        });
        animate(
          copy,
          [
            {
              transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(-5deg)`,
            },
            { transform: "translate(0,-2px) scale(1.04) rotate(0)" },
          ],
          {
            duration: 220,
            easing: "cubic-bezier(.2,.8,.2,1)",
            fill: "backwards",
          },
        );
        animate(
          copy,
          [
            { transform: "translate(0,-2px) scale(1.04)" },
            { transform: "translate(0,0) scale(1)" },
          ],
          {
            delay: 220,
            duration: 120,
            easing: "cubic-bezier(.22,1,.36,1)",
            fill: "forwards",
          },
        );
      }
    }
    if (cleared) {
      const bar = row?.querySelector<SVGElement>(".and-bar");
      const face = bar?.querySelector(".joint-face rect");
      if (face)
        animate(face, [{ fill: "#D9A441" }, { fill: "#FFE7A8" }], {
          delay: reduced ? 0 : 400,
          duration: reduced ? 150 : 220,
        });
      const halo = bar?.querySelector(".bar-halo");
      if (halo)
        animate(halo, [{ opacity: 0 }, { opacity: 0.6 }], {
          delay: reduced ? 0 : 400,
          duration: reduced ? 150 : 220,
        });
      if (bar && !reduced) {
        bar.style.transformBox = "fill-box";
        bar.style.transformOrigin = "center";
        animate(
          bar,
          [
            { transform: "scale(1)" },
            { transform: "scale(1.04)" },
            { transform: "scale(1)" },
          ],
          { delay: 620, duration: 240 },
        );
      }
      area.classList.add("open-pair");
      area
        .querySelectorAll(".object.door")
        .forEach((door) =>
          animate(
            door,
            reduced
              ? [{ opacity: 1 }, { opacity: 0 }]
              : [
                  { transform: "perspective(600px) rotateY(0)" },
                  { transform: "perspective(600px) rotateY(-65deg)" },
                ],
            { delay: reduced ? 0 : 920, duration: reduced ? 150 : 400 },
          ),
        );
    }
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    animations.forEach((a) => a.cancel());
    transient.forEach((el) => el.remove());
    overlay?.remove();
    done();
  };
  const timer = setTimeout(
    finish,
    reduced ? 150 : split ? 480 : cleared ? 1320 : 340,
  );
  return finish;
}
