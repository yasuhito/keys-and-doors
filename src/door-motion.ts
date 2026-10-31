// Presentation only: the proof transition has already happened before this runs.
export function joinDoors(
  area: HTMLElement,
  before: HTMLElement,
  reduced: boolean,
  done: () => void,
): () => void {
  before.className = "door-transition";
  before.inert = true;
  before.setAttribute("aria-hidden", "true");
  before
    .querySelectorAll(".joint-button")
    .forEach((element) => element.remove());
  before.querySelectorAll("[data-drop],[data-formula]").forEach((element) => {
    element.removeAttribute("data-drop");
    element.removeAttribute("data-formula");
  });
  before.querySelectorAll(".goal").forEach((element) => {
    element.classList.remove("goal");
    element.classList.add("transition-goal");
  });
  area.append(before);
  const duration = reduced ? 150 : 300;
  const animations = [
    before.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration,
      fill: "both",
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
          { duration, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" },
        ),
      );
    });
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    animations.forEach((animation) => animation.cancel());
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
    element: Element,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => {
    animations.push(element.animate(frames, { fill: "both", ...options }));
  };
  const curve = "cubic-bezier(.65,0,.35,1)";
  const row = area.querySelector<HTMLElement>(".split-doors");
  let overlay: HTMLElement | undefined;
  if (split && before) {
    overlay = before;
    overlay.className = "door-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    overlay
      .querySelectorAll(".joint-button,.tutorial-hand")
      .forEach((element) => element.remove());
    overlay.querySelectorAll(".goal").forEach((element) => {
      element.classList.remove("goal");
      element.classList.add("transition-goal");
    });
    overlay
      .querySelectorAll("[data-drop],[data-formula]")
      .forEach((element) => {
        element.removeAttribute("data-drop");
        element.removeAttribute("data-formula");
      });
    area.append(overlay);
    if (reduced) {
      animate(overlay, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
      if (row)
        animate(row, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    } else {
      const joint =
        overlay.querySelector<SVGElement>(".joint.tapped") ??
        overlay.querySelector<SVGElement>(".joint");
      if (joint) {
        const rect = joint.querySelectorAll("rect")[1];
        if (rect) {
          const x = Number(rect.getAttribute("x")),
            y = Number(rect.getAttribute("y"));
          const w = Number(rect.getAttribute("width")),
            h = Number(rect.getAttribute("height"));
          const seam = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          seam.setAttribute(
            "d",
            h >= w ? `M${x + w / 2} ${y}v${h}` : `M${x} ${y + h / 2}h${w}`,
          );
          seam.setAttribute("stroke", "#FFE7A8");
          seam.setAttribute("stroke-width", "3");
          seam.setAttribute("stroke-linecap", "round");
          seam.setAttribute("pathLength", "1");
          seam.setAttribute("stroke-dasharray", "1");
          joint.append(seam);
          animate(
            seam,
            [{ strokeDashoffset: "1" }, { strokeDashoffset: "0" }],
            { duration: 160, easing: curve },
          );
        }
      }
      animate(overlay, [{ opacity: 1 }, { opacity: 0 }], {
        delay: 220,
        duration: 200,
      });
      if (row) {
        row
          .querySelectorAll<SVGElement>(
            ".coupler > rect:not(.tab), .coupler > path",
          )
          .forEach((strip) => {
            strip.style.transformBox = "fill-box";
            strip.style.transformOrigin = "center";
            animate(
              strip,
              [{ transform: "scaleY(1.53)" }, { transform: "scaleY(1)" }],
              { delay: 360, duration: 160, easing: curve },
            );
          });
        row.querySelectorAll<SVGElement>(".coupler .tab").forEach((tab) => {
          tab.style.transformBox = "fill-box";
          tab.style.transformOrigin =
            tab.dataset.side === "L" ? "right center" : "left center";
          animate(
            tab,
            [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
            { delay: 360, duration: 160, easing: "cubic-bezier(.22,1,.36,1)" },
          );
        });
        animate(row, [{ opacity: 0 }, { opacity: 1 }], {
          delay: 320,
          duration: 200,
        });
        row.querySelectorAll(".goal-frame").forEach((leaf, i) => {
          animate(
            leaf,
            [
              { transform: `translateX(${i ? -43.5 : 43.5}px)` },
              { transform: "translateX(0)" },
            ],
            { delay: 220, duration: 300, easing: curve },
          );
        });
      }
    }
  } else {
    const seated = area.querySelector<SVGGElement>(
      `.goal[data-drop="${seat?.side}"] .seated`,
    );
    if (seated) {
      if (reduced || !seat?.source) {
        animate(seated, [{ opacity: 0 }, { opacity: 1 }], {
          duration: reduced ? 150 : 340,
        });
      } else {
        const svg = seated.ownerSVGElement!;
        const box = seated.getBoundingClientRect();
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
    area
      .querySelectorAll(`.coupler .tab[data-side="${seat?.side}"]`)
      .forEach((tab) => {
        animate(tab, [{ fill: "#D9A441" }, { fill: "#FFE7A8" }], {
          delay: reduced ? 0 : 400,
          duration: reduced ? 150 : 220,
        });
      });
    if (cleared) {
      const coupler = area.querySelector<SVGElement>(".coupler");
      const face = coupler?.querySelector(".coupler-face");
      if (face)
        animate(face, [{ fill: "#D9A441" }, { fill: "#FFE7A8" }], {
          delay: reduced ? 0 : 620,
          duration: reduced ? 150 : 1,
        });
      if (coupler && !reduced) {
        coupler.style.transformBox = "fill-box";
        coupler.style.transformOrigin = "center";
        animate(
          coupler,
          [
            { transform: "scale(1)" },
            { transform: "scale(1.04)" },
            { transform: "scale(1)" },
          ],
          { delay: 620, duration: 240, easing: curve },
        );
      }
      area.classList.add("open-pair");
      area.querySelectorAll(".object.door").forEach((door) => {
        animate(
          door,
          reduced
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { transform: "perspective(600px) rotateY(0)" },
                { transform: "perspective(600px) rotateY(-65deg)" },
              ],
          {
            delay: reduced ? 0 : 920,
            duration: reduced ? 150 : 400,
            easing: reduced ? "linear" : curve,
          },
        );
      });
    }
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    animations.forEach((animation) => animation.cancel());
    transient.forEach((element) => element.remove());
    overlay?.remove();
    done();
  };
  const timer = setTimeout(
    finish,
    reduced ? 150 : split ? 520 : cleared ? 1320 : 620,
  );
  return finish;
}
