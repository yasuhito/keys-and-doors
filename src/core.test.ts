import { describe, it, expect } from "vitest";
import {
  parse,
  format,
  start,
  move,
  solve,
  checkProof,
  type Proof,
  type Formula,
} from "./core";
import one from "./stages/layer-01.json";
import two from "./stages/layer-02.json";

function decomposed(state: ReturnType<typeof start>) {
  return state.rooms[state.current].children.length
    ? state
    : move(state, { type: "decompose" });
}
describe("formula grammar", () => {
  it("respects precedence and right associativity", () => {
    expect(format(parse("P ∧ Q → R → S"))).toBe("((P ∧ Q) → (R → S))");
  });
  it.each(["", "T", "P Q", "(P", "P)", "P ∨ Q", "P→"])("rejects %s", (text) =>
    expect(() => parse(text)).toThrow(),
  );
});
describe("direct pair filling", () => {
  it("requires a committed decomposition and cannot clear a split goal with a whole key", () => {
    const initial = start("P ∧ Q", ["P", "Q", "P ∧ Q"]);
    expect(() => move(initial, { type: "fill", key: 0, side: "L" })).toThrow(
      "split the door first",
    );
    const split = move(initial, { type: "decompose" });
    expect(split.current).toBe(0);
    expect(split.rooms[0].mode).toBe("∧I");
    expect(split.rooms[0].proof).toBeUndefined();
    expect(split.rooms.slice(1).map((r) => format(r.goal))).toEqual(["P", "Q"]);
    expect(() => move(split, { type: "use", key: 2 })).toThrow();
    expect(() => move(split, { type: "decompose" })).toThrow();
    expect(() => move(start("P → P", []), { type: "decompose" })).toThrow();
    expect(
      checkProof(
        move(initial, { type: "use", key: 2 }).rooms[0].proof!,
        initial.initial,
      ),
    ).toBe(true);
  });
  it.each(["L", "R"] as const)(
    "fills %s first without leaving the pair and checks its proof",
    (side) => {
      const initial = start("P ∧ Q", ["P", "Q"]);
      const snapshot = structuredClone(initial);
      const first = move(decomposed(initial), {
        type: "fill",
        key: side === "L" ? 0 : 1,
        side,
      });
      expect(initial).toEqual(snapshot);
      expect(first.current).toBe(0);
      expect(first.rooms[0].proof).toBeUndefined();
      expect(first.rooms[0].children).toHaveLength(2);
      expect(first.rooms[side === "L" ? 1 : 2].proof?.rule).toBe("assume");
      const last = move(decomposed(first), {
        type: "fill",
        key: side === "L" ? 1 : 0,
        side: side === "L" ? "R" : "L",
      });
      expect(last.rooms[0].proof?.rule).toBe("∧I");
      expect(last.rooms[0].keys).toEqual(initial.rooms[0].keys);
      expect(checkProof(last.rooms[0].proof!, initial.initial)).toBe(true);
    },
  );
  it("rejects the wrong or occupied half, including equal-shaped holes", () => {
    const s = start("P ∧ Q", ["P"]);
    expect(() =>
      move(decomposed(s), { type: "fill", key: 0, side: "R" }),
    ).toThrow();
    expect(() =>
      move(start("P", ["P"]), { type: "fill", key: 0, side: "L" }),
    ).toThrow();
    let n = move(decomposed(start("P ∧ P", ["P"])), {
      type: "fill",
      key: 0,
      side: "R",
    });
    expect(() =>
      move(decomposed(n), { type: "fill", key: 0, side: "R" }),
    ).toThrow();
    n = move(decomposed(n), { type: "fill", key: 0, side: "L" });
    expect(checkProof(n.rooms[0].proof!, n.initial)).toBe(true);
  });
  it("allows an unfinished pair to be revisited and its other half entered without new rooms", () => {
    let s = move(decomposed(start("P ∧ Q", ["P", "Q"])), {
      type: "fill",
      key: 0,
      side: "L",
    });
    s = move(s, { type: "intro", side: "R" });
    expect(s.current).toBe(2);
    s = move(s, { type: "visit", room: 0 });
    s = move(s, { type: "intro" });
    expect(s.rooms).toHaveLength(3);
    s = move(s, { type: "use", key: 1 });
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
  });
  it("cannot bypass a decomposed half with a whole key", () => {
    let s = move(start("(P ∧ Q) ∧ R", ["P ∧ Q", "R"]), {
      type: "intro",
      side: "L",
    });
    s = move(s, { type: "intro" });
    const abandoned = s.current;
    s = move(s, { type: "visit", room: 0 });
    expect(() => move(s, { type: "fill", key: 0, side: "L" })).toThrow();
    s = move(s, { type: "visit", room: abandoned });
    for (const action of solve(s)!) s = move(s, action);
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
  });
  it("accepts compound halves and discharges borrowed keys without leakage", () => {
    let s = move(start("P → ((P ∧ Q) ∧ P)", ["P ∧ Q"]), { type: "intro" });
    const ribbon = s.rooms[1].keys[1].ribbons;
    s = move(decomposed(s), { type: "fill", key: 1, side: "R" });
    expect(s.current).toBe(1);
    expect(s.rooms[1].keys[1].ribbons).toEqual(ribbon);
    s = move(decomposed(s), { type: "fill", key: 0, side: "L" });
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
    expect(s.rooms[0].keys).toHaveLength(1);
  });
  it("room reset undoes direct fills even when the tray is unchanged", () => {
    const entry = start("P ∧ Q", ["P", "Q"]);
    const s = move(decomposed(entry), { type: "fill", key: 0, side: "L" });
    const reset = move(s, { type: "reset" });
    expect(reset).toEqual(entry);
    expect(() => move(reset, { type: "reset" })).toThrow();
    let n = move(decomposed(reset), { type: "fill", key: 1, side: "R" });
    n = move(decomposed(n), { type: "fill", key: 0, side: "L" });
    expect(checkProof(n.rooms[0].proof!, n.initial)).toBe(true);
  });
  it("room reset restores the entry tray and drops halves filled from derived keys", () => {
    const entry = start("R ∧ P", ["P ∧ R"]);
    let s = move(entry, { type: "split", key: 0 });
    s = move(decomposed(s), { type: "fill", key: 2, side: "L" });
    expect(move(s, { type: "reset" })).toEqual(entry);
  });
  it("room reset keeps progress made inside a half and its sibling's scope", () => {
    let s = move(start("(P ∧ Q) ∧ R", ["P ∧ Q", "R"]), {
      type: "intro",
      side: "L",
    });
    s = move(s, { type: "split", key: 0 });
    s = move(s, { type: "visit", room: 0 });
    s = move(decomposed(s), { type: "fill", key: 1, side: "R" });
    const reset = move(s, { type: "reset" });
    expect(reset.rooms).toHaveLength(3);
    expect(reset.rooms[2].proof).toBeUndefined();
    expect(reset.rooms[1].keys).toEqual(s.rooms[1].keys);
    let n = move(reset, { type: "intro", side: "L" });
    n = move(n, { type: "use", key: 0 });
    expect(n.current).toBe(2);
    n = move(n, { type: "use", key: 1 });
    expect(checkProof(n.rooms[0].proof!, n.initial)).toBe(true);
  });
  it("room reset preserves an expanded half while reverting direct fills", () => {
    let s = move(start("(P ∧ Q) ∧ R", ["P ∧ Q", "R"]), {
      type: "intro",
      side: "L",
    });
    s = move(s, { type: "intro" });
    const inner = s.current;
    s = move(s, { type: "visit", room: 0 });
    s = move(decomposed(s), { type: "fill", key: 1, side: "R" });
    s = move(s, { type: "reset" });
    expect(s.rooms[1].proof).toBeUndefined();
    s = move(s, { type: "visit", room: inner });
    for (const action of solve(s)!) s = move(s, action);
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
  });
});
describe("five rules", () => {
  it("assumption use matches exactly and never consumes keys", () => {
    const s = start("P", ["Q", "P"]);
    expect(() => move(s, { type: "use", key: 0 })).toThrow();
    expect(s.rooms[0].proof).toBeUndefined();
    const n = move(s, { type: "use", key: 1 });
    expect(n.rooms[0].keys).toHaveLength(2);
    expect(checkProof(n.rooms[0].proof!, s.initial)).toBe(true);
  });
  it("pair intro makes isolated siblings and requires both", () => {
    let s = move(start("P ∧ Q", ["P", "Q", "P ∧ Q"]), { type: "intro" });
    s = move(s, { type: "split", key: 2 });
    s = move(s, { type: "use", key: 0 });
    expect(s.current).toBe(2);
    expect(s.rooms[0].proof).toBeUndefined();
    s = move(s, { type: "use", key: 1 });
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
    expect(() => move(s, { type: "intro" })).toThrow();
  });
  it("pair elimination yields both keys, retaining and deduplicating originals", () => {
    const s = start("Q", ["P ∧ Q"]);
    const n = move(s, { type: "split", key: 0 });
    expect(n.rooms[0].keys.map((k) => format(k.proof.formula))).toEqual([
      "(P ∧ Q)",
      "P",
      "Q",
    ]);
    expect(move(n, { type: "split", key: 0 }).rooms[0].keys).toHaveLength(3);
    expect(() => move(n, { type: "split", key: 1 })).toThrow();
  });
  it("socket intro discharges local assumption and forbids scope leakage", () => {
    let s = move(start("(P → P) ∧ Q", ["Q"]), { type: "intro" });
    s = move(s, { type: "intro" });
    expect(s.rooms[s.current].keys[1].ribbons).toHaveLength(1);
    s = move(s, { type: "use", key: 1 });
    expect(s.rooms[s.current].keys.map((k) => format(k.proof.formula))).toEqual(
      ["Q"],
    );
    s = move(s, { type: "use", key: 0 });
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
    expect(() => move(start("P", []), { type: "intro" })).toThrow();
  });
  it("socket elimination checks direction and preserves dependency ribbons", () => {
    let s = move(start("P → Q", ["P → Q", "R"]), { type: "intro" });
    expect(() => move(s, { type: "apply", key: 1, target: 0 })).toThrow();
    s = move(s, { type: "apply", key: 2, target: 0 });
    expect(s.rooms[s.current].keys[3].ribbons).toEqual([1]);
    s = move(s, { type: "use", key: 3 });
    expect(checkProof(s.rooms[0].proof!, s.initial)).toBe(true);
  });
  it("finishing a pair half skips past a sibling door opened via the path", () => {
    let s = start("(P → P) ∧ (Q → (P → Q))", []);
    for (const action of [
      { type: "intro" },
      { type: "visit", room: 2 },
      { type: "intro" },
      { type: "visit", room: 1 },
      { type: "intro" },
      { type: "use", key: 0 },
    ] as const)
      s = move(s, action);
    expect(s.current).toBe(3);
    expect(s.rooms[s.current].children).toEqual([]);
    const rest = solve(s)!;
    for (const action of rest) s = move(s, action);
    expect(checkProof(s.rooms[0].proof!, [])).toBe(true);
  });
  it("room reset restores the tray each room had on entry, independent of path visits", () => {
    let s = move(start("Q ∧ P", ["P ∧ Q"]), { type: "intro" });
    expect(s.rooms.map((r) => r.entry.length)).toEqual([1, 1, 1]);
    expect(() => move(s, { type: "reset" })).toThrow();
    s = move(s, { type: "split", key: 0 });
    s = move(s, { type: "visit", room: 2 });
    s = move(s, { type: "split", key: 0 });
    s = move(s, { type: "visit", room: 1 });
    expect(s.rooms[1].keys).toHaveLength(3);
    const before = structuredClone(s);
    const reset = move(s, { type: "reset" });
    expect(s).toEqual(before);
    expect(reset.current).toBe(1);
    expect(reset.rooms[1].keys).toEqual(reset.rooms[1].entry);
    expect(reset.rooms[1].keys.map((k) => format(k.proof.formula))).toEqual([
      "(P ∧ Q)",
    ]);
    expect(reset.rooms[2].keys).toHaveLength(3);
    const cleared = move(reset, { type: "visit", room: 2 });
    const done = move(cleared, { type: "use", key: 1 });
    expect(done.current).toBe(1);
    expect(move(cleared, { type: "reset" }).rooms[2].keys).toHaveLength(1);
  });
  it("socket rooms keep their discharged assumption on reset", () => {
    let s = move(start("P → (P ∧ Q)", ["Q"]), { type: "intro" });
    expect(s.rooms[1].entry.map((k) => format(k.proof.formula))).toEqual([
      "Q",
      "P",
    ]);
    s = move(s, { type: "intro" });
    s = move(s, { type: "use", key: 1 });
    expect(s.current).toBe(3);
    expect(() => move(s, { type: "reset" })).toThrow();
  });
  it("rejects nonexistent keys and rooms without mutating state", () => {
    const s = start("P", ["P"]);
    const before = structuredClone(s);
    for (const a of [
      { type: "use", key: 9 },
      { type: "visit", room: 50 },
    ] as const)
      expect(() => move(s, a)).toThrow();
    expect(s).toEqual(before);
  });
  it("independent checker rejects forged inference and escaping assumptions", () => {
    const p: Proof = { rule: "assume", formula: "P", inputs: [] };
    expect(checkProof(p, [])).toBe(false);
    for (const rule of ["∧I", "∧E", "→I", "→E"] as const)
      expect(checkProof({ rule, formula: "Q", inputs: [p] }, ["P"])).toBe(
        false,
      );
    for (const formula of ["", "PQ", "<b>", { op: "∨", left: "P", right: "P" }])
      expect(
        checkProof({ rule: "assume", formula, inputs: [] } as Proof, [
          formula as Formula,
        ]),
      ).toBe(false);
  });
});
for (const stage of [...one.stages, ...two.stages])
  it(`${stage.id} is constructively solvable with a checked proof and rejects wrong matches`, () => {
    const task = stage.tasks[0];
    let state = start(task.goal, task.assumptions);
    const solution = solve(state);
    expect(solution).not.toBeNull();
    for (const action of solution!) {
      const r = state.rooms[state.current];
      r.keys.forEach((k, key) => {
        if (format(k.proof.formula) !== format(r.goal))
          expect(() => move(state, { type: "use", key })).toThrow();
      });
      state = move(state, action);
    }
    expect(checkProof(state.rooms[0].proof!, state.initial)).toBe(true);
  });
