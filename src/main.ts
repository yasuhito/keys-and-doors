import "./style.css";
import thirdPartyNoticesUrl from "../THIRD_PARTY_NOTICES.md?url&no-inline";
import {
  start,
  move,
  solve,
  parse,
  format,
  equal,
  type State,
  type Action,
  type Formula,
  type Proof,
} from "./core";
import { card, escape, icon, picture, spoken } from "./picture";
import { load, save } from "./progress";
import first from "./stages/layer-01.json";
import second from "./stages/layer-02.json";
const layers = Object.values(
  import.meta.glob("./stages/layer-*.json", { eager: true, import: "default" }),
) as (typeof first)[];
const stages = [...first.stages, ...second.stages];
const app = document.querySelector<HTMLElement>("#app")!;
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
  render();
  hint(true);
}
function commit(action: Action) {
  try {
    const next = move(state, action);
    const rootGoal = state.rooms[0].goal;
    const doorBox = app.querySelector(".goal .object")?.getBoundingClientRect();
    const fitted =
      action.type === "apply"
        ? state.rooms[state.current].keys[action.target].proof.formula
        : undefined;
    history.push(state);
    state = next;
    selected = undefined;
    buzz(25);
    if (state.rooms[0].proof) {
      progress.proofs[stages[index].id] = state.rooms[0].proof;
      persist();
      buzz([40, 40, 80]);
      const proof = state.rooms[0].proof;
      if (doorBox && typeof rootGoal !== "string" && rootGoal.op === "→") {
        const room = app.querySelector<HTMLElement>(".room");
        if (room) room.inert = true;
        const door = document.createElement("span");
        door.className = "door-fit";
        door.style.left = `${doorBox.x}px`;
        door.style.top = `${doorBox.y}px`;
        door.innerHTML = card(rootGoal, "door", true, ["S"]);
        door
          .querySelector(".object")!
          .insertAdjacentHTML(
            "beforeend",
            `<span class="fit-animation"><span class="obtained">${picture(rootGoal, 184, 137, true, [""])}</span></span>`,
          );
        app.append(door);
        setTimeout(
          () => {
            door.remove();
            showReplay(proof);
          },
          reduced() ? 150 : 1120,
        );
      } else showReplay(proof);
    } else {
      render();
      if (fitted && action.type === "apply") {
        const target = app.querySelector<HTMLElement>(
          `[data-key="${action.target}"] .object`,
        );
        if (target) {
          const effect = document.createElement("span");
          effect.className = "fit-animation";
          effect.innerHTML = `<span class="seating">${picture(fitted, 88, 66, false, ["S"])}</span><span class="obtained">${picture(fitted, 88, 66, false, [""])}</span>`;
          target.append(effect);
          if (!reduced() && typeof fitted !== "string") {
            const from = effect
              .querySelector(".obtained .result")!
              .getBoundingClientRect();
            const resultKey = state.rooms[state.current].keys.findIndex((k) =>
              equal(k.proof.formula, fitted.right),
            );
            const destination = app.querySelector<HTMLElement>(
              `[data-key="${resultKey}"] .object`,
            );
            if (destination) {
              const to = destination.getBoundingClientRect();
              const flight = document.createElement("span");
              flight.className = "key-flight";
              flight.innerHTML = card(fitted.right);
              document.body.append(flight);
              const animation = flight.animate(
                [
                  {
                    left: `${from.x}px`,
                    top: `${from.y}px`,
                    width: `${from.width}px`,
                    height: `${from.height}px`,
                    opacity: 0.8,
                  },
                  {
                    left: `${to.x}px`,
                    top: `${to.y}px`,
                    width: `${to.width}px`,
                    height: `${to.height}px`,
                    opacity: 1,
                  },
                ],
                {
                  delay: 820,
                  duration: 300,
                  easing: "ease-in-out",
                  fill: "none",
                },
              );
              animation.finished.finally(() => flight.remove());
            }
          }
          setTimeout(() => effect.remove(), reduced() ? 150 : 1120);
        }
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
function renderRoom() {
  const r = state.rooms[state.current];
  const usePreview =
    selected === undefined
      ? undefined
      : preview({ type: "use", key: selected });
  const splitPreview =
    selected === undefined
      ? undefined
      : preview({ type: "split", key: selected });
  app.innerHTML = `<div class="room"><nav class="path">${button("ui-stages", "ステージ一覧", 'id="map"')}<div class="chips">${state.rooms.map((room, i) => `<button data-room="${i}" data-formula="${escape(format(room.goal))}" aria-label="部屋 ${i + 1}: ${escape(spoken(room.goal))}" class="chip ${i === state.current ? "here" : ""} ${room.proof ? "done" : ""} ${room.parent !== undefined ? "child" : ""}" ${room.children.length || room.proof ? "disabled" : ""}>${card(room.goal, "node", true, filled(room))}${room.proof ? icon("ui-check") : ""}${room.ribbon ? ribbon([room.ribbon]) : ""}</button>`).join("")}</div></nav><div class="door-area"><div class="arch-glow"></div><button class="goal ${usePreview ? "valid" : ""}" data-drop="door" data-formula="${escape(format(r.goal))}" aria-label="扉: ${escape(spoken(r.goal))}">${card(r.goal, "door")}${ghosts(usePreview)}</button></div><div class="tray"><div class="tray-line">${icon("key")}${pips(index + 1)}</div><div class="key-grid">${r.keys
    .map((k, i) => {
      const forms =
        selected === undefined
          ? undefined
          : preview({ type: "apply", key: selected, target: i });
      return `<button class="key-button ${selected === i ? "selected" : ""} ${forms ? "valid" : ""}" data-key="${i}" data-drop="${i}" data-formula="${escape(format(k.proof.formula))}" aria-label="鍵 ${i + 1}: ${escape(spoken(k.proof.formula))}" aria-pressed="${selected === i}">${card(k.proof.formula)}${ribbon(k.ribbons)}${forms ? fitPreview(k.proof.formula) : ""}${ghosts(forms)}</button>`;
    })
    .join(
      "",
    )}<button class="empty-slot ${splitPreview ? "valid" : ""}" data-drop="slot" aria-label="空き枠: つながった鍵を分ける">${icon("rule-and-elim")}${ghosts(splitPreview)}</button></div></div><footer>${button("ui-undo", "元に戻す", `id="undo" ${history.length ? "" : "disabled"}`)}${button("ui-reset", "部屋をやり直す", 'id="reset"')}${button("ui-hint", "ヒント", 'id="hint"')}${button("ui-formula", "数式の表示を切り替える", `id="captions" aria-pressed="${progress.captions}"`)}</footer></div>`;
  app.querySelector<HTMLElement>("#map")!.onclick = () => {
    selected = undefined;
    screen = "map";
    render();
  };
  app.querySelector<HTMLElement>("#undo")!.onclick = () => {
    if (history.length) {
      state = history.pop()!;
      selected = undefined;
      render();
    }
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
  app
    .querySelectorAll<HTMLElement>("[data-drop]")
    .forEach((el) => (el.onclick = () => target(el)));
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
}
function highlightHoles(key: number) {
  const held = state.rooms[state.current].keys[key].proof.formula;
  app.querySelectorAll<HTMLElement>("[data-drop]").forEach((target) => {
    const f =
      target.dataset.drop === "door"
        ? state.rooms[state.current].goal
        : target.dataset.key !== undefined
          ? state.rooms[state.current].keys[Number(target.dataset.key)].proof
              .formula
          : undefined;
    target.querySelectorAll<SVGElement>(".glow[data-path]").forEach((halo) => {
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
function filled(room: State["rooms"][number]) {
  if (room.proof) return [""];
  if (room.mode !== "∧I") return [];
  return room.children.flatMap((c, i) =>
    state.rooms[c].proof ? [i ? "R" : "L"] : [],
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
function target(el: HTMLElement) {
  if (el.dataset.drop === "door") {
    if (selected === undefined) commit({ type: "intro" });
    else commit({ type: "use", key: selected });
  } else if (el.dataset.drop === "slot") {
    if (selected !== undefined) commit({ type: "split", key: selected });
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
  const action = solve(state)?.[0];
  if (!action) return;
  let selector =
    action.type === "intro"
      ? ".goal"
      : "key" in action
        ? `[data-key="${action.key}"]`
        : ".goal";
  const el = app.querySelector<HTMLElement>(selector);
  el?.classList.add("hint");
  if (action.type === "lemma") el?.classList.add("lemma-hint");
  const targetSelector =
    action.type === "use"
      ? ".goal"
      : action.type === "split"
        ? ".empty-slot"
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
        bubble.textContent = el.dataset.formula!;
        document.body.append(bubble);
      }, 450);
      el.setPointerCapture(e.pointerId);
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
        const over =
          document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-drop].valid") ?? undefined;
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
      clean();
      if (held || dragged) {
        e.preventDefault();
        el.addEventListener("click", swallow, true);
        if (dragged) {
          const dest = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-drop]");
          const action = dest && dropAction(dest, selected!);
          if (action && preview(action)) commit(action);
          else {
            selected = undefined;
            render();
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
function dropAction(el: HTMLElement, key: number): Action | undefined {
  return el.dataset.drop === "door"
    ? { type: "use", key }
    : el.dataset.drop === "slot"
      ? { type: "split", key }
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
