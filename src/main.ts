import "./style.css";
import thirdPartyNoticesUrl from "../THIRD_PARTY_NOTICES.md?url&no-inline";
import {
  start,
  move,
  solve,
  parse,
  format,
  equal,
  visitable,
  type State,
  type Action,
  type Formula,
  type Proof,
} from "./core";
import { card, escape, icon, picture, spoken, splitBar } from "./picture";
import {
  TOUCH_TARGET_PX,
  AND_BAR_HINT,
  LONG_PRESS_PICTURES,
  AND_BAR_LIGHTS_ON,
  AND_BAR,
  KEY_SPLIT,
  KEY_SPLIT_PROVISIONAL,
} from "./tuning";
import { load, save } from "./progress";
import { fitMotion } from "./motion";
import { keySplitMotion } from "./key-motion";
import { doorMotion, joinDoors } from "./door-motion";
import first from "./stages/layer-01.json";
import second from "./stages/layer-02.json";
const layers = Object.values(
  import.meta.glob("./stages/layer-*.json", { eager: true, import: "default" }),
) as (typeof first)[];
const stages = [...first.stages, ...second.stages];
const app = document.querySelector<HTMLElement>("#app")!;
document.documentElement.style.setProperty(
  "--touch-target-px",
  `${TOUCH_TARGET_PX}px`,
);
const panelScale = 175 / 184;
const splitGap = Math.max(AND_BAR.minGap, 64 * AND_BAR.gap);
document.documentElement.style.setProperty(
  "--and-gap",
  `${splitGap * panelScale}px`,
);
document.documentElement.style.setProperty(
  "--and-width",
  `${(splitGap + 2 * AND_BAR.overlap + 8) * panelScale}px`,
);
document.documentElement.style.setProperty(
  "--and-overhang",
  `${-(AND_BAR.overlap + 4) * panelScale}px`,
);
let progress = load(localStorage, stages),
  index = 0,
  state: State,
  history: State[] = [],
  selected: number | undefined;
let screen: "map" | "room" | "replay" | "settings" | "credits" = "map",
  replay: Proof[] = [],
  step = 0,
  playing = false;
let replayTimer: ReturnType<typeof setInterval> | undefined;
const reduced = () =>
  progress.reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
const persist = () => save(localStorage, progress);
const buzz = (pattern: number | number[]) => {
  if (progress.haptics) navigator.vibrate?.(pattern);
};
const button = (name: string, label: string, extra = "") =>
  `<button aria-label="${label}" ${extra}>${icon(name)}</button>`;
const pips = (n: number) =>
  `<span class="pips" aria-hidden="true">${"<i></i>".repeat(n)}</span>`;
function unlocked(i: number) {
  return i < stages.length && (i === 0 || !!progress.proofs[stages[i - 1].id]);
}
function enter(i: number) {
  if (!unlocked(i)) return;
  index = i;
  const t = stages[i].tasks[0];
  state = start(t.goal, t.assumptions);
  history = [];
  selected = undefined;
  screen = "room";
  idleTouched = false;
  render();
  hint(true);
}
let idleTouched = true;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let wobble: Animation | undefined;
function unsplitPair() {
  const r = state?.rooms[state.current];
  return (
    screen === "room" &&
    r &&
    r.mode !== "∧I" &&
    typeof r.goal !== "string" &&
    r.goal.op === "∧"
  );
}
function splittableKey() {
  return (
    state?.rooms[state.current].keys.findIndex((k, key) => {
      const f = k.proof.formula;
      return (
        typeof f !== "string" &&
        f.op === "∧" &&
        !!preview({ type: "split", key })?.length
      );
    }) ?? -1
  );
}
function wobbleBar(key?: number) {
  if (reduced()) return;
  const bar = app.querySelector<SVGElement>(
    key === undefined
      ? ".goal .joint"
      : `.key-button[data-key="${key}"] .bridge[data-path=""]`,
  );
  if (!bar || bar.getAnimations().some((a) => a.playState === "running"))
    return;
  bar.style.transformBox = "fill-box";
  bar.style.transformOrigin = "center";
  const a = AND_BAR_HINT.angleDeg;
  const animation = bar.animate(
    [0, -a, a, -a / 2, 0].map((angle) => ({
      transform: `rotate(${angle}deg)`,
      easing: "cubic-bezier(.65,0,.35,1)",
    })),
    { duration: AND_BAR_HINT.durationMs },
  );
  wobble = animation;
  setTimeout(() => animation.cancel(), AND_BAR_HINT.durationMs);
}
let keyHintTimer: ReturnType<typeof setTimeout> | undefined;
function wobblePair() {
  if (unsplitPair()) wobbleBar();
  const key = splittableKey();
  if (key < 0) return;
  clearTimeout(keyHintTimer);
  keyHintTimer = setTimeout(
    () => wobbleBar(key),
    unsplitPair()
      ? AND_BAR_HINT.durationMs + KEY_SPLIT_PROVISIONAL.hintGapMs
      : 0,
  );
}
function scheduleIdleHint() {
  clearTimeout(idleTimer);
  if (idleTouched || (!unsplitPair() && splittableKey() < 0) || reduced())
    return;
  const repeat = () => {
    wobblePair();
    idleTimer = setTimeout(repeat, AND_BAR_HINT.repeatMs);
  };
  idleTimer = setTimeout(repeat, AND_BAR_HINT.firstMs);
}
let finishMotion: (() => void) | undefined;
let jointObserver: ResizeObserver | undefined;
let dropSource: DOMRect | undefined;
let dropShape: DOMRect | undefined;
function shapeBox(object: Element | null): DOMRect | undefined {
  const parts = [...(object?.querySelector(".picture")?.children ?? [])]
    .slice(1)
    .filter((el) => !el.classList.contains("held-glow"))
    .map((el) => el.getBoundingClientRect());
  if (!parts.length) return undefined;
  const x = Math.min(...parts.map((b) => b.x)),
    y = Math.min(...parts.map((b) => b.y));
  return new DOMRect(
    x,
    y,
    Math.max(...parts.map((b) => b.right)) - x,
    Math.max(...parts.map((b) => b.bottom)) - y,
  );
}
let retargeted: { x: number; y: number; target: Element } | undefined;
let suppressNativeClick = false;
function undoLast() {
  const room = state.rooms[state.current];
  const before = app
    .querySelector<HTMLElement>(".door-area")
    ?.cloneNode(true) as HTMLElement | undefined;
  const restored = history.pop()!;
  const removed = room.keys
    .slice(restored.rooms[restored.current].keys.length)
    .map((_, i) => {
      const object = app.querySelector<HTMLElement>(
        `.key-button[data-key="${restored.rooms[restored.current].keys.length + i}"] .object`,
      );
      if (!object) return undefined;
      const box = object.getBoundingClientRect();
      const copy = document.createElement("div");
      copy.className = "result-flight key-flight";
      Object.assign(copy.style, {
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
      copy.append(object.cloneNode(true));
      return copy;
    })
    .filter((c) => c !== undefined);
  state = restored;
  selected = undefined;
  screen = "room";
  render();
  if (removed.length) {
    const animations = removed.map((c) => {
      document.body.append(c);
      return c.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: KEY_SPLIT.undoMs,
        easing: "linear",
        fill: "both",
      });
    });
    const finish = () => {
      clearTimeout(timer);
      animations.forEach((a) => a.cancel());
      removed.forEach((c) => c.remove());
      finishMotion = undefined;
    };
    const timer = setTimeout(finish, KEY_SPLIT.undoMs);
    finishMotion = finish;
  }
  if (
    room.mode === "∧I" &&
    state.rooms[state.current].mode !== "∧I" &&
    before
  ) {
    finishMotion = joinDoors(
      app.querySelector<HTMLElement>(".door-area")!,
      before,
      reduced(),
      () => {
        finishMotion = undefined;
      },
    );
  }
}
function endMotion() {
  while (finishMotion) {
    const finish = finishMotion;
    finishMotion = undefined;
    finish();
  }
}
// End presentation before interpreting new input, including undo. Retarget a touch
// if completing a room replaced the old DOM underneath it.
document.addEventListener(
  "pointerdown",
  (event) => {
    suppressNativeClick = false;
    idleTouched = true;
    clearTimeout(idleTimer);
    clearTimeout(keyHintTimer);
    if ((event.target as Element).closest(".joint-button")) wobble?.cancel();
    app.querySelectorAll(".tutorial-hand").forEach((el) => el.remove());
    app.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
    if (!finishMotion) return;
    const target = event.target as Element;
    const undo = !!target.closest("#undo") && history.length > 0;
    const joint = target.closest<HTMLElement>(".joint-button");
    const jointDrop = joint
      ?.closest(".goal-frame")
      ?.querySelector<HTMLElement>(".goal")?.dataset.drop;
    const jointPath = joint?.dataset.path;
    endMotion();
    if (undo) {
      undoLast();
      event.stopImmediatePropagation();
      event.preventDefault();
      suppressNativeClick = true;
      return;
    }
    if (!target.isConnected) {
      event.stopImmediatePropagation();
      const next =
        joint && jointDrop !== undefined
          ? app.querySelector(
              `.goal-frame:has(.goal[data-drop="${jointDrop}"]) .joint-button[data-path="${jointPath ?? ""}"]`,
            )
          : document.elementFromPoint(event.clientX, event.clientY);
      if (next) {
        retargeted = { x: event.clientX, y: event.clientY, target: next };
        next.dispatchEvent(new PointerEvent("pointerdown", event));
      }
    }
  },
  true,
);
document.addEventListener(
  "pointerup",
  (event) => {
    if (!retargeted) return;
    const pending = retargeted;
    retargeted = undefined;
    if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) <= 8) {
      suppressNativeClick = true;
      (
        pending.target.closest("button,[role=button]") as HTMLElement | null
      )?.click();
    }
  },
  true,
);
document.addEventListener(
  "click",
  (event) => {
    if (event.isTrusted && suppressNativeClick) {
      suppressNativeClick = false;
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if (event.detail === 0 && finishMotion) {
      const undo =
        !!(event.target as Element).closest("#undo") && history.length > 0;
      endMotion();
      if (undo) {
        undoLast();
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }
  },
  true,
);
function commit(action: Action) {
  try {
    const next = move(state, action);
    const previous = state;
    const room = state.rooms[state.current];
    const source =
      dropSource ??
      ("key" in action
        ? app
            .querySelector(`[data-key="${action.key}"] .object`)
            ?.getBoundingClientRect()
        : undefined);
    const sourceShape =
      dropShape ??
      ("key" in action
        ? shapeBox(app.querySelector(`[data-key="${action.key}"] .object`))
        : undefined);
    const lifted = !!dropSource;
    dropSource = dropShape = undefined;
    const rootGoal = state.rooms[0].goal;
    const doorBox = app.querySelector(".goal .object")?.getBoundingClientRect();
    const oldDoor = app
      .querySelector<HTMLElement>(".door-area")
      ?.cloneNode(true) as HTMLElement | undefined;
    history.push(state);
    state = next;
    selected = undefined;
    app
      .querySelectorAll(".ghosts,.fit-preview,.door-preview,.tutorial-hand")
      .forEach((el) => el.remove());
    app
      .querySelectorAll(".valid,.selected,.hovered,.hint")
      .forEach((el) =>
        el.classList.remove("valid", "selected", "hovered", "hint"),
      );
    const complete = () => {
      finishMotion = undefined;
      if (state.rooms[0].proof) {
        progress.proofs[stages[index].id] = state.rooms[0].proof;
        persist();
        buzz([40, 40, 80]);
        showReplay(state.rooms[0].proof);
      } else render();
    };
    let pairRoom = action.type === "fill" ? previous.current : undefined;
    if (action.type === "fill" || action.type === "use") {
      for (
        let child = previous.current, parent = room.parent;
        parent !== undefined;
        child = parent, parent = previous.rooms[parent].parent
      ) {
        if (
          previous.rooms[parent].mode === "∧I" &&
          next.rooms[child].proof &&
          !previous.rooms[child].proof
        )
          pairRoom = parent;
      }
    }
    if (action.type === "decompose" || pairRoom !== undefined) {
      // Proof state is committed before presentation. Split rooms remain the
      // authority for seated halves and completion, never an animation callback.
      if (pairRoom !== undefined) state.current = pairRoom;
      render();
      buzz(25);
      const area = app.querySelector<HTMLElement>(".door-area")!;
      const changed =
        pairRoom === undefined
          ? -1
          : previous.rooms[pairRoom].children.findIndex(
              (c) => next.rooms[c].proof && !previous.rooms[c].proof,
            );
      const side = changed < 0 ? undefined : changed === 0 ? "L" : "R";
      const direct =
        action.type === "fill"
          ? pairRoom === previous.current
          : pairRoom === room.parent;
      finishMotion = doorMotion(
        area,
        oldDoor,
        action.type === "decompose",
        !!state.rooms[state.current].proof,
        reduced(),
        () => completion(true),
        side
          ? {
              side,
              source: direct ? (sourceShape ?? source) : undefined,
              lifted,
            }
          : undefined,
      );
      return;
    }
    if (action.type === "apply") {
      const formula = room.keys[action.target].proof.formula;
      render();
      const object = app.querySelector<HTMLElement>(
        `[data-key="${action.target}"] .object`,
      )!;
      const resultIndex =
        typeof formula !== "string"
          ? state.rooms[state.current].keys.findIndex((k) =>
              equal(k.proof.formula, formula.right),
            )
          : -1;
      finishMotion = fitMotion({
        object,
        formula,
        goal: false,
        before: [],
        path: "S",
        source,
        sourceShape,
        lifted,
        destination:
          resultIndex >= 0
            ? app.querySelector<HTMLElement>(
                `[data-key="${resultIndex}"] .object`,
              )!
            : undefined,
        duplicate: resultIndex >= 0 && resultIndex < room.keys.length,
        reduced: reduced(),
        buzz,
        done: () => {
          finishMotion = undefined;
        },
      });
      return;
    }
    completion();
    function completion(fitted = false) {
      finishMotion = undefined;
      if (state.rooms[0].proof) {
        if (doorBox && typeof rootGoal !== "string" && rootGoal.op === "→") {
          const door = document.createElement("span");
          door.className = "door-fit";
          door.style.left = `${doorBox.x}px`;
          door.style.top = `${doorBox.y}px`;
          door.innerHTML = card(rootGoal, "door", true, ["S"]);
          app.append(door);
          finishMotion = fitMotion({
            object: door.querySelector<HTMLElement>(".object")!,
            formula: rootGoal,
            goal: true,
            intro: true,
            before: ["S"],
            path: "S",
            reduced: reduced(),
            buzz,
            done: () => {
              door.remove();
              complete();
            },
          });
        } else complete();
      } else {
        if (!fitted) buzz(25);
        render();
      }
    }
  } catch {
    app.querySelector(".room")?.classList.add("reject");
    buzz([15, 40, 15]);
    setTimeout(
      () => app.querySelector(".room")?.classList.remove("reject"),
      250,
    );
  }
}
function splitKey(key: number) {
  const room = state.rooms[state.current];
  const formula = room.keys[key].proof.formula;
  if (typeof formula === "string" || formula.op !== "∧") return;
  const visual = app.querySelector(
    `.key-button[data-key="${key}"] .picture > .pair`,
  )!;
  const sources = ["L", "R"].map((part) =>
    visual.querySelector(`[data-key-part="${part}"]`)!.getBoundingClientRect(),
  );
  const oldCount = room.keys.length;
  const next = move(state, { type: "split", key });
  if (next.rooms[next.current].keys.length > oldCount) history.push(state);
  state = next;
  selected = undefined;
  render();
  const keys = state.rooms[state.current].keys;
  const targets = [formula.left, formula.right]
    .map((f, i) => {
      const at = keys.findIndex((k) => equal(k.proof.formula, f));
      return {
        button: app.querySelector<HTMLElement>(
          `.key-button[data-key="${at}"]`,
        )!,
        source: sources[i],
        fresh: at >= oldCount,
      };
    })
    .filter((t, i, all) => all.findIndex((a) => a.button === t.button) === i);
  const face = app.querySelector<SVGElement>(
    `.key-button[data-key="${key}"] .bridge[data-path=""] > .joint-face`,
  )!;
  const restore = face.animate(
    [{ transform: "translateY(1.5px)" }, { transform: "translateY(0)" }],
    { duration: KEY_SPLIT.returnMs, easing: "cubic-bezier(.22,1,.36,1)" },
  );
  const finish = keySplitMotion(targets, reduced(), buzz, () => {
    restore.cancel();
    finishMotion = undefined;
  });
  finishMotion = finish;
}
function preview(action: Action): Formula[] | undefined {
  try {
    const n = move(state, action);
    const r = state.rooms[state.current],
      nr = n.rooms[state.current];
    if (action.type === "use") return [r.goal];
    return nr.keys.slice(r.keys.length).map((k) => k.proof.formula);
  } catch {
    return undefined;
  }
}
function ghosts(forms: Formula[] | undefined) {
  return forms
    ? `<span class="ghosts">${forms.length ? forms.map((f) => card(f)).join("") : icon("ui-check")}</span>`
    : "";
}
function render() {
  jointObserver?.disconnect();
  clearTimeout(idleTimer);
  clearInterval(replayTimer);
  app.className = `${progress.captions ? "captions" : ""} ${progress.left ? "left-handed" : ""} ${reduced() ? "reduced" : ""}`;
  if (screen === "map") {
    app.innerHTML = `<header class="map-header"><span class="brand" aria-label="Keys and Doors">${icon("key")}${icon("door")}</span>${button("ui-settings", "設定", 'id="settings"')}</header><div class="stage-map">${layers
      .map(
        (layer, li) =>
          `<section aria-label="第${li + 1}層"><div class="layer-mark">${pips(li + 1)}</div><div class="stage-grid">${layer.stages
            .map((stage) => {
              const i = stages.findIndex((s) => s.id === stage.id),
                active = i >= 0 && unlocked(i),
                proof = progress.proofs[stage.id];
              return `<div class="stage ${active ? "available" : "locked"} ${proof ? "cleared" : ""}"><button class="stage-door" data-stage="${i}" aria-label="${escape(stage.id)}${active ? "" : " ロック中"}" ${active ? "" : "disabled"}>${i >= 0 ? card(parse(stage.tasks[0].goal), "door", true, proof ? [""] : []) : `<span class="object door reserved">${icon("ui-lock")}</span>`}${pips(layer.stages.indexOf(stage) + 1)}</button>${proof ? button("ui-check", `${escape(stage.id)} 証明を再生`, `data-rewatch="${i}" class="badge"`) : !active ? `<span class="lock">${icon("ui-lock")}</span>` : ""}</div>`;
            })
            .join("")}</div></section>`,
      )
      .join("")}</div>`;
    app.querySelector("#settings")!.addEventListener("click", () => {
      screen = "settings";
      render();
    });
    app
      .querySelectorAll<HTMLElement>("[data-stage]")
      .forEach((el) => (el.onclick = () => enter(Number(el.dataset.stage))));
    app.querySelectorAll<HTMLElement>("[data-rewatch]").forEach(
      (el) =>
        (el.onclick = () => {
          index = Number(el.dataset.rewatch);
          showReplay(progress.proofs[stages[index].id]);
        }),
    );
  }
  if (screen === "room") renderRoom();
  if (screen === "replay") renderReplay();
  if (screen === "settings") {
    app.innerHTML = `<header>${button("ui-close", "閉じる", 'id="close"')}<h1>設定</h1></header><div class="settings">${(["captions", "left", "haptics", "reduced"] as const).map((key, i) => `<label><span>${["数式を表示", "左利き用の操作バー", "触覚フィードバック", "動きを減らす"][i]}</span><input type="checkbox" data-setting="${key}" ${progress[key] ? "checked" : ""}></label>`).join("")}<p>鍵を選んで、光る扉や鍵にタップ。鍵をドラッグしても操作できます。</p><p>棒でつながった鍵は空き枠へ。穴のある鍵を2回タップすると、穴にはまる鍵を作る部屋へ進めます。</p><p>カードを長押しすると数式を表示します。リセットは部屋を戻し、長押しするとステージ全体を戻します。</p><p>第1・第2層が遊べます。それ以降の規則は未対応です。</p><button id="credits" class="credits-link">クレジット</button></div>`;
    app.querySelectorAll<HTMLInputElement>("[data-setting]").forEach(
      (el) =>
        (el.onchange = () => {
          progress[el.dataset.setting as "captions"] = el.checked;
          persist();
          render();
        }),
    );
    app.querySelector<HTMLElement>("#credits")!.onclick = () => {
      screen = "credits";
      render();
    };
    app.querySelector<HTMLElement>("#close")!.onclick = () => {
      screen = "map";
      render();
    };
  }
  if (screen === "credits") {
    const link = (href: string, text: string) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    app.innerHTML = `<header>${button("ui-close", "設定に戻る", 'id="close"')}<h1>クレジット</h1></header><div class="settings credits"><section class="credit-card"><p>ステージデータ（数式と出題順）は、木原貴行（Takayuki Kihara）さんの ${link("https://github.com/kihara-logic/proof-dungeon", "Proof Dungeon")} から、MIT ライセンスで利用しています。</p><p>${link("https://x.com/tri_iro/status/2116094777720799282", "原作の告知")}</p><p>本作向けにデータ形式と数式の表記を変えています。著作権表示と許諾文の全文は ${link(thirdPartyNoticesUrl, "THIRD_PARTY_NOTICES.md")} に記載しています。</p><p>CC BY-NC-SA 4.0 の対象となる原作の物語や文章は使用していません。${link("https://github.com/kihara-logic/proof-dungeon/blob/main/LICENSE", "原作のライセンス")}</p></section></div>`;
    app.querySelector<HTMLElement>("#close")!.onclick = () => {
      screen = "settings";
      render();
    };
  }
}
function goalDoors(valid: boolean) {
  const r = state.rooms[state.current];
  const frame = (goal: Formula, paths: string[], drop: string, done = false) =>
    `<div class="goal-frame"><button class="goal ${valid && drop === "door" ? "valid" : ""} ${done ? "half-filled" : ""}" data-drop="${drop}" data-formula="${escape(format(goal))}" aria-label="扉: ${escape(spoken(goal))}" ${done ? "disabled" : ""}>${card(goal, "door", true, paths)}${drop === "door" ? doorPreview() : ""}</button></div>`;
  if (r.mode !== "∧I") return frame(r.goal, filled(r), "door");
  const halves = r.children.map((c, i) =>
    frame(
      state.rooms[c].goal,
      filled(state.rooms[c]),
      i ? "R" : "L",
      !!state.rooms[c].proof,
    ),
  );
  const paths = r.children.flatMap((c, i) =>
    state.rooms[c].proof ? [i ? "R" : "L"] : [],
  );
  return `<div class="split-doors" data-formula="${escape(format(r.goal))}">${halves[0]}${splitBar(AND_BAR_LIGHTS_ON === "all-filled" && paths.length === 2)}${halves[1]}</div>`;
}
function renderRoom() {
  const r = state.rooms[state.current];
  const usePreview =
    selected === undefined ? undefined : preview(doorAction(selected));
  app.innerHTML = `<div class="room"><nav class="path">${button("ui-stages", "ステージ一覧", 'id="map"')}<div class="chips">${state.rooms.map((room, i) => `<button data-room="${i}" data-formula="${escape(format(room.goal))}" aria-label="部屋 ${i + 1}: ${escape(spoken(room.goal))}" class="chip ${i === state.current ? "here" : ""} ${room.proof ? "done" : ""} ${room.parent !== undefined ? "child" : ""}" ${visitable(state, i) ? "" : "disabled"}>${room.mode === "∧I" ? `<span class="split-chip">${room.children.map((c) => picture(state.rooms[c].goal, 60, 60, true, filled(state.rooms[c]))).join("<i></i>")}</span>` : card(room.goal, "node", true, filled(room))}${room.proof ? icon("ui-check") : ""}${room.ribbon ? ribbon([room.ribbon]) : ""}</button>`).join("")}</div></nav><div class="door-area"><div class="arch-glow"></div>${goalDoors(usePreview !== undefined)}</div><div class="tray"><div class="tray-line">${icon("key")}${pips(index + 1)}</div><div class="key-grid">${r.keys
    .map((k, i) => {
      const forms =
        selected === undefined
          ? undefined
          : preview({ type: "apply", key: selected, target: i });
      const joined =
        typeof k.proof.formula !== "string" && k.proof.formula.op === "∧";
      return `${joined ? '<div class="key-cell">' : ""}<button class="key-button ${selected === i ? "selected" : ""} ${forms ? "valid" : ""}" data-key="${i}" data-drop="${i}" data-formula="${escape(format(k.proof.formula))}" aria-label="鍵 ${i + 1}: ${escape(spoken(k.proof.formula))}" aria-pressed="${selected === i}">${card(k.proof.formula)}${ribbon(k.ribbons)}${forms ? fitPreview(k.proof.formula) : ""}${ghosts(forms)}</button>${joined ? "</div>" : ""}`;
    })
    .join(
      "",
    )}</div></div><footer>${button("ui-undo", "元に戻す", `id="undo" ${history.length ? "" : "disabled"}`)}${button("ui-reset", "部屋をやり直す", 'id="reset"')}${button("ui-hint", "ヒント", 'id="hint"')}${button("ui-formula", "数式の表示を切り替える", `id="captions" aria-pressed="${progress.captions}"`)}</footer></div>`;
  if (r.mode === "∧I") {
    for (const side of ["L", "R"] as const) {
      const tile = app.querySelector<HTMLElement>(`[data-drop="${side}"]`)!;
      tile.dataset.drop = side;
      if (selected !== undefined && preview(doorAction(selected, side))) {
        tile.classList.add("valid");
        const half = state.rooms[r.children[side === "L" ? 0 : 1]];
        tile.insertAdjacentHTML(
          "beforeend",
          `<span class="door-preview">${picture(half.goal, 184, 137, true, [""])}</span>`,
        );
      }
      tile.setAttribute("role", "button");
      tile.setAttribute("tabindex", "0");
      tile.setAttribute(
        "aria-label",
        `${side === "L" ? "左" : "右"}の穴: ${spoken(state.rooms[r.children[side === "L" ? 0 : 1]].goal)}`,
      );
      tile.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          endMotion();
          if (tile.isConnected) target(tile);
        }
      };
    }
  }
  const jointLayouts: (() => void)[] = [];
  app
    .querySelectorAll<SVGElement>(
      '.goal .joint, .key-cell .bridge[data-path=""]',
    )
    .forEach((visual) => {
      if (visual.closest(".half-filled")) return;
      const keyButton = visual.closest<HTMLButtonElement>(".key-button");
      const key = keyButton ? Number(keyButton.dataset.key) : undefined;
      const frame = visual.closest<HTMLElement>(".goal-frame,.key-cell")!;
      const joint = document.createElement("button");
      joint.className = `joint-button${keyButton ? " key-joint" : ""}`;
      if (key !== undefined) joint.dataset.key = String(key);
      if (!keyButton) joint.dataset.path = visual.dataset.path;
      const dropSide = frame.querySelector<HTMLElement>(".goal")?.dataset.drop;
      let formula =
        key !== undefined
          ? r.keys[key].proof.formula
          : dropSide === "L" || dropSide === "R"
            ? state.rooms[r.children[dropSide === "L" ? 0 : 1]].goal
            : r.goal;
      for (const side of visual.dataset.path ?? "")
        if (typeof formula !== "string")
          formula = side === "L" ? formula.left : formula.right;
      joint.setAttribute(
        "aria-label",
        `${keyButton ? "鍵を分ける:" : "split"} ${spoken(formula)}`,
      );
      const position = () => {
        const box = visual.getBoundingClientRect(),
          parent = frame.getBoundingClientRect();
        joint.style.left = `${box.x + box.width / 2 - parent.x}px`;
        joint.style.top = `${box.y + box.height / 2 - parent.y}px`;
        joint.style.width = `${TOUCH_TARGET_PX}px`;
        joint.style.height = `${TOUCH_TARGET_PX}px`;
      };
      jointLayouts.push(position);
      frame.append(joint);
      position();
      let pressing = false,
        cancelled = false;
      let initial: PointerEvent | undefined;
      let dragging = false;
      let holdTimer: ReturnType<typeof setTimeout>;
      const release = () => {
        pressing = false;
        clearTimeout(holdTimer);
        joint.classList.remove("pressed");
        document.querySelector(".formula-bubble")?.remove();
        document.body.classList.remove("holding");
      };
      joint.onclick = (event) => {
        event.stopPropagation();
        if (cancelled) {
          cancelled = false;
          return;
        }
        if (key !== undefined) {
          splitKey(key);
          return;
        }
        const path = [
          ...(dropSide === "L" || dropSide === "R" ? dropSide : ""),
          ...(joint.dataset.path ?? ""),
        ] as ("L" | "R")[];
        visual.classList.add("tapped");
        commit({ type: "decompose", path });
        visual.classList.remove("tapped");
      };
      joint.onpointerdown = (event) => {
        event.stopPropagation();
        pressing = true;
        cancelled = false;
        initial = event;
        dragging = false;
        joint.setPointerCapture(event.pointerId);
        joint.classList.add("pressed");
        holdTimer = setTimeout(() => {
          if (cancelled) return;
          cancelled = true;
          joint.classList.remove("pressed");
          document.body.classList.add("holding");
          const bubble = document.createElement("div");
          bubble.className = "formula-bubble";
          bubble.textContent = format(formula);
          document.body.append(bubble);
        }, 450);
      };
      joint.onpointermove = (event) => {
        if (!pressing) return;
        if (
          keyButton &&
          initial &&
          !cancelled &&
          Math.hypot(
            event.clientX - initial.clientX,
            event.clientY - initial.clientY,
          ) > 8
        ) {
          cancelled = true;
          dragging = true;
          clearTimeout(holdTimer);
          joint.classList.remove("pressed");
          keyButton.dispatchEvent(new PointerEvent("pointerdown", initial));
          keyButton.dispatchEvent(new PointerEvent("pointermove", event));
          return;
        }
        const box = joint.getBoundingClientRect();
        if (
          event.clientX < box.left - 8 ||
          event.clientX > box.right + 8 ||
          event.clientY < box.top - 8 ||
          event.clientY > box.bottom + 8
        ) {
          cancelled = true;
          clearTimeout(holdTimer);
          joint.classList.remove("pressed");
        }
      };
      joint.onpointerup = (event) => {
        if (dragging)
          keyButton?.dispatchEvent(new PointerEvent("pointerup", event));
        release();
      };
      joint.onpointercancel = () => {
        cancelled = true;
        release();
      };
    });
  jointObserver = new ResizeObserver(() =>
    jointLayouts.forEach((position) => position()),
  );
  app
    .querySelectorAll(".goal-frame,.key-cell")
    .forEach((frame) => jointObserver!.observe(frame));
  app.querySelector<HTMLElement>("#map")!.onclick = () => {
    selected = undefined;
    screen = "map";
    render();
  };
  app.querySelector<HTMLElement>("#undo")!.onclick = () => {
    if (history.length) undoLast();
  };
  app.querySelector<HTMLElement>("#reset")!.onclick = () =>
    commit({ type: "reset" });
  let resetTimer: ReturnType<typeof setTimeout>;
  app.querySelector("#reset")!.addEventListener("pointerdown", () => {
    resetTimer = setTimeout(() => enter(index), 450);
  });
  app
    .querySelector("#reset")!
    .addEventListener("pointerup", () => clearTimeout(resetTimer));
  app
    .querySelector("#reset")!
    .addEventListener("pointercancel", () => clearTimeout(resetTimer));
  app.querySelector<HTMLElement>("#hint")!.onclick = () => hint();
  app.querySelector<HTMLElement>("#captions")!.onclick = toggleCaptions;
  app.querySelectorAll<HTMLElement>("[data-room]").forEach(
    (el) =>
      (el.onclick = () => {
        state = move(state, { type: "visit", room: Number(el.dataset.room) });
        selected = undefined;
        render();
      }),
  );
  app.querySelectorAll<HTMLElement>("[data-drop]").forEach(
    (el) =>
      (el.onclick = (e) => {
        e.stopPropagation();
        target(el);
      }),
  );
  app.querySelector<HTMLElement>(".tray")!.onclick = (e) => {
    if (
      !(e.target as HTMLElement).closest("button") &&
      selected !== undefined
    ) {
      selected = undefined;
      render();
    }
  };
  if (selected !== undefined) highlightHoles(selected);
  bindGestures();
  scheduleIdleHint();
}
function highlightHoles(key: number) {
  const held = state.rooms[state.current].keys[key].proof.formula;
  app
    .querySelectorAll<HTMLElement>(
      '[data-drop="door"], [data-drop="L"], [data-drop="R"], .key-button[data-key]',
    )
    .forEach((target) => {
      const room = state.rooms[state.current];
      const side = target.dataset.drop;
      const f =
        side === "door"
          ? room.goal
          : side === "L" || side === "R"
            ? state.rooms[room.children[side === "L" ? 0 : 1]].goal
            : room.keys[Number(target.dataset.key)].proof.formula;
      if (typeof f !== "string" && f.op === "∧") {
        // A whole pair lights the door's outline, not the joint or half holes.
        return;
      }
      target
        .querySelectorAll<SVGElement>(".glow[data-path]")
        .forEach((halo) => {
          let part = f;
          for (const step of halo.dataset.path ?? "") {
            if (part && typeof part !== "string")
              part = step === "L" || step === "S" ? part.left : part.right;
          }
          halo.classList.toggle("matching", !!part && equal(part, held));
        });
    });
}
// A pair door shows each half it has already opened with its key seated.
function filled(room: State["rooms"][number], snapshot = state) {
  if (room.proof) return [""];
  if (room.mode !== "∧I") return [];
  return room.children.flatMap((c, i) =>
    snapshot.rooms[c].proof ? [i ? "R" : "L"] : [],
  );
}
function fitPreview(f: Formula) {
  return `<span class="fit-preview">${picture(f, 88, 66, false, [""])}</span>`;
}
function ribbon(ids: number[]) {
  return ids.length
    ? `<span class="ribbons" aria-label="仮定の範囲 ${escape(ids.join(","))}">${ids.map((id) => `<span style="--ribbon:${["#6FC7D1", "#F2B880", "#B8A6E8", "#C4DB7A"][(id - 1) % 4]}">${"·".repeat(((id - 1) % 4) + 1)}</span>`).join("")}</span>`
    : "";
}
function target(el: HTMLElement | SVGElement) {
  if (["door", "L", "R"].includes(el.dataset.drop ?? "")) {
    const side =
      el.dataset.drop === "L" || el.dataset.drop === "R"
        ? el.dataset.drop
        : undefined;
    const room = state.rooms[state.current];
    if (selected === undefined) {
      if (!side && typeof room.goal !== "string" && room.goal.op === "∧") {
        wobbleBar();
        return;
      }
      commit({ type: "intro", side });
    } else if (!side && unsplitPair() && !preview(doorAction(selected))) {
      buzz([15, 40, 15]);
      wobbleBar();
    } else commit(doorAction(selected, side));
  } else {
    const key = Number(el.dataset.key);
    if (selected === key) {
      const f = state.rooms[state.current].keys[key].proof.formula;
      if (typeof f !== "string" && f.op === "→") commit({ type: "lemma", key });
      else {
        selected = undefined;
        render();
      }
    } else if (selected !== undefined)
      commit({ type: "apply", key: selected, target: key });
    else {
      selected = key;
      render();
    }
  }
}
function toggleCaptions() {
  progress.captions = !progress.captions;
  persist();
  render();
}
function hint(tutorial = false) {
  if (unsplitPair()) {
    if (!tutorial) wobblePair();
    return;
  }
  const action = solve(state)?.[0];
  if (!action) return;
  if (action.type === "split") {
    if (!tutorial) wobbleBar(action.key);
    return;
  }
  const room = state.rooms[state.current];
  let selector =
    action.type === "intro" || action.type === "decompose"
      ? typeof room.goal !== "string" &&
        room.goal.op === "∧" &&
        !room.children.length
        ? '.joint-button[data-path=""]'
        : room.mode === "∧I"
          ? `.goal[data-drop="${state.rooms[room.children[0]].proof ? "R" : "L"}"]`
          : ".goal"
      : "key" in action
        ? `[data-key="${action.key}"]`
        : ".goal";
  const el = app.querySelector<HTMLElement>(selector);
  el?.classList.add("hint");
  if (action.type === "lemma") el?.classList.add("lemma-hint");
  const targetSelector =
    action.type === "use"
      ? ".goal"
      : action.type === "apply"
        ? `[data-key="${action.target}"]`
        : selector;
  const dest = app.querySelector<HTMLElement>(targetSelector);
  dest?.classList.add("hint");
  if (tutorial && el) {
    const hand = document.createElement("span");
    hand.className = "tutorial-hand";
    hand.innerHTML = icon(
      action.type === "intro" || action.type === "lemma"
        ? "gesture-tap"
        : "gesture-drag",
    );
    el.append(hand);
    setTimeout(() => hand.remove(), 5000);
  }
  setTimeout(() => {
    el?.classList.remove("hint");
    dest?.classList.remove("hint");
  }, 2000);
}
function dropTargetAt(x: number, y: number): HTMLElement | undefined {
  const element = document.elementFromPoint(x, y);
  const joint = element?.closest(".joint-button");
  return (
    (joint
      ? (joint
          .closest(".key-cell")
          ?.querySelector<HTMLElement>(".key-button") ??
        joint.closest(".goal-frame")?.querySelector<HTMLElement>(".goal"))
      : element?.closest<HTMLElement>("[data-drop]")) ?? undefined
  );
}
function bindGestures() {
  app.querySelectorAll<HTMLElement>("[data-formula]").forEach((el) => {
    let timer: ReturnType<typeof setTimeout>,
      downX = 0,
      downY = 0,
      held = false,
      dragged = false,
      pointer = -1,
      floating: HTMLElement | undefined,
      hovered: HTMLElement | undefined;
    const swallow = (event: MouseEvent) => {
      el.removeEventListener("click", swallow, true);
      if (event.detail) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };
    const clean = () => {
      clearTimeout(timer);
      document.querySelector(".formula-bubble")?.remove();
      floating?.remove();
      hovered?.classList.remove("hovered");
      document.body.classList.remove("holding");
    };
    el.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      el.removeEventListener("click", swallow, true);
      downX = e.clientX;
      downY = e.clientY;
      held = dragged = false;
      pointer = e.pointerId;
      timer = setTimeout(() => {
        if (dragged) return;
        held = true;
        document.body.classList.add("holding");
        const bubble = document.createElement("div");
        bubble.className = "formula-bubble";
        // Picture previews are intentionally disabled by the provisional policy.
        if (!LONG_PRESS_PICTURES) bubble.textContent = el.dataset.formula!;
        document.body.append(bubble);
      }, 450);
      if (el.dataset.key !== undefined) el.setPointerCapture(e.pointerId);
    };
    el.onpointermove = (e) => {
      if (e.pointerId !== pointer || held) return;
      if (!dragged && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
        clearTimeout(timer);
        if (el.dataset.key === undefined) return;
        dragged = true;
        selected = Number(el.dataset.key);
        // Keep this element captured while updating targets in place.
        app.querySelectorAll<HTMLElement>("[data-drop]").forEach((t) => {
          const a = dropAction(t, selected!);
          if (a && preview(a)) {
            t.classList.add("valid");
            if (t.dataset.drop === "door")
              t.insertAdjacentHTML("beforeend", doorPreview());
            else if (t.dataset.drop !== "L" && t.dataset.drop !== "R")
              t.insertAdjacentHTML("beforeend", ghosts(preview(a)));
            if (a.type === "apply")
              t.insertAdjacentHTML(
                "beforeend",
                fitPreview(
                  state.rooms[state.current].keys[a.target].proof.formula,
                ),
              );
          }
        });
        highlightHoles(selected);
        el.classList.add("drag-source");
        floating = document.createElement("div");
        floating.className = "drag-copy";
        floating.innerHTML = card(
          state.rooms[state.current].keys[selected].proof.formula,
        );
        document.body.append(floating);
      }
      if (floating) {
        floating.style.left = `${e.clientX}px`;
        floating.style.top = `${e.clientY - 65}px`;
        const candidate = dropTargetAt(e.clientX, e.clientY - 65);
        const over = candidate?.classList.contains("valid")
          ? candidate
          : undefined;
        if (over !== hovered) {
          hovered?.classList.remove("hovered");
          hovered = over;
          hovered?.classList.add("hovered");
          if (hovered) buzz(10);
        }
      }
    };
    el.onpointerup = (e) => {
      pointer = -1;
      if (dragged) {
        dropSource = floating?.getBoundingClientRect();
        dropShape = shapeBox(floating ?? null);
      }
      const returnCopy = floating?.cloneNode(true) as HTMLElement | undefined;
      const origin = el.querySelector(".object")?.getBoundingClientRect();
      clean();
      if (held || dragged) {
        e.preventDefault();
        el.addEventListener("click", swallow, true);
        if (dragged) {
          const dest = dropTargetAt(e.clientX, e.clientY - 65);
          const action = dest && dropAction(dest, selected!);
          if (action && preview(action)) commit(action);
          else {
            dropSource = dropShape = undefined;
            selected = undefined;
            render();
            if (returnCopy && origin) {
              document.body.append(returnCopy);
              const duration = reduced() ? 150 : 200;
              const animation = returnCopy.animate(
                reduced()
                  ? [{ opacity: 1 }, { opacity: 0 }]
                  : [
                      {
                        left: returnCopy.style.left,
                        top: returnCopy.style.top,
                      },
                      {
                        left: `${origin.x + origin.width / 2}px`,
                        top: `${origin.y + origin.height / 2}px`,
                      },
                    ],
                {
                  duration,
                  easing: reduced() ? "linear" : "cubic-bezier(.22,1,.36,1)",
                  fill: "both",
                },
              );
              let ended = false;
              const finish = () => {
                if (ended) return;
                ended = true;
                clearTimeout(timer);
                animation.cancel();
                returnCopy.remove();
                finishMotion = undefined;
              };
              const timer = setTimeout(() => {
                finish();
                if (dest?.dataset.drop === "door") wobbleBar();
                else if (dest && ["L", "R"].includes(dest.dataset.drop ?? "")) {
                  const key = Number(el.dataset.key);
                  if (preview({ type: "split", key })?.length) wobbleBar(key);
                }
              }, duration);
              finishMotion = finish;
            }
          }
        }
      }
    };
    el.onpointercancel = () => {
      pointer = -1;
      clean();
      selected = undefined;
      render();
    };
    if (el.dataset.key !== undefined) {
      // A room that makes the key for an if-then slot opens with keyboard or a second quick tap.
      el.ondblclick = () => {
        const key = Number(el.dataset.key);
        const f = state.rooms[state.current].keys[key].proof.formula;
        if (typeof f !== "string" && f.op === "→")
          commit({ type: "lemma", key });
      };
    }
  });
}
function doorAction(key: number, side?: "L" | "R"): Action {
  const room = state.rooms[state.current];
  const f = room.goal;
  const held = room.keys[key].proof.formula;
  if (room.mode === "∧I" && typeof f !== "string" && f.op === "∧") {
    side ??= (["L", "R"] as const).find(
      (s) =>
        !filled(room).includes(s) && equal(s === "L" ? f.left : f.right, held),
    );
    if (side) return { type: "fill", key, side };
  }
  return { type: "use", key };
}
function doorPreview() {
  if (selected === undefined) return "";
  const action = doorAction(selected);
  if (!preview(action)) return "";
  const r = state.rooms[state.current];
  const paths = action.type === "fill" ? [...filled(r), action.side] : [""];
  return `<span class="door-preview">${picture(r.goal, 184, 137, true, paths)}</span>`;
}
function dropAction(
  el: HTMLElement | SVGElement,
  key: number,
): Action | undefined {
  return ["door", "L", "R"].includes(el.dataset.drop ?? "")
    ? doorAction(
        key,
        el.dataset.drop === "L" || el.dataset.drop === "R"
          ? el.dataset.drop
          : undefined,
      )
    : el.dataset.key !== undefined
      ? { type: "apply", key, target: Number(el.dataset.key) }
      : undefined;
}
function showReplay(proof: Proof) {
  replay = [];
  const walk = (p: Proof) => {
    p.inputs.forEach(walk);
    replay.push(p);
  };
  walk(proof);
  step = reduced() ? replay.length : 1;
  playing = !reduced();
  screen = "replay";
  render();
}
function renderReplay() {
  const proof = replay.at(-1)!;
  function tree(p: Proof): string {
    const visible = replay.indexOf(p) < step;
    return `<div class="proof-node ${visible ? "visible" : ""}"><div class="premises">${p.inputs.map(tree).join("")}</div><div class="inference" data-formula="${escape(format(p.formula))}" aria-label="${escape(spoken(p.formula))}" tabindex="0">${card(p.formula, p.rule === "assume" ? "key" : "node")}${p.scope ? ribbon([p.scope]) : ""}${icon({ assume: "rule-assume", "∧I": "rule-and-intro", "∧E": "rule-and-elim", "→I": "rule-imp-intro", "→E": "rule-imp-elim" }[p.rule])}</div></div>`;
  }
  app.innerHTML = `<header>${button("ui-close", "ステージ一覧", 'id="close"')}${icon("ui-check")}${button("ui-formula", "数式の表示を切り替える", 'id="captions"')}</header><div class="replay-tree" aria-label="証明の木">${tree(proof)}</div><div class="replay-controls">${button("ui-step-back", "前の手", 'id="back"')}${button(playing ? "ui-pause" : "ui-play", "再生・停止", 'id="play"')}${button("ui-step-forward", "次の手", 'id="forward"')}</div><input class="scrubber" aria-label="証明の手順" type="range" min="1" max="${replay.length}" value="${step}"><footer>${button("ui-undo", "証明を戻して遊ぶ", `id="undo-clear" ${state?.rooms[0].proof === proof && history.length ? "" : "disabled"}`)}${button("ui-step-forward", "次のステージ", `id="next" class="next" ${unlocked(index + 1) ? "" : "disabled"}`)}</footer>`;
  app.querySelector<HTMLElement>("#close")!.onclick = () => {
    playing = false;
    screen = "map";
    render();
  };
  app.querySelector<HTMLElement>("#captions")!.onclick = toggleCaptions;
  app.querySelector<HTMLElement>("#back")!.onclick = () => {
    playing = false;
    step = Math.max(1, step - 1);
    render();
  };
  app.querySelector<HTMLElement>("#forward")!.onclick = () => {
    step = Math.min(replay.length, step + 1);
    render();
  };
  app.querySelector<HTMLElement>("#play")!.onclick = () => {
    if (step === replay.length) step = 1;
    playing = !playing;
    render();
  };
  app.querySelector<HTMLInputElement>(".scrubber")!.oninput = (e) => {
    step = Number((e.target as HTMLInputElement).value);
    playing = false;
    render();
  };
  app.querySelector<HTMLElement>("#next")!.onclick = () => enter(index + 1);
  app.querySelector<HTMLElement>("#undo-clear")!.onclick = () => {
    state = history.pop()!;
    screen = "room";
    render();
  };
  const canvas = app.querySelector<HTMLElement>(".replay-tree")!,
    root = canvas.firstElementChild as HTMLElement;
  root.style.zoom = String(
    Math.min(
      1,
      (canvas.clientWidth - 24) / root.scrollWidth,
      (canvas.clientHeight - 20) / root.scrollHeight,
    ),
  );
  bindGestures();
  if (playing && step < replay.length)
    replayTimer = setInterval(() => {
      step++;
      if (step >= replay.length) playing = false;
      render();
    }, 700);
}
render();
