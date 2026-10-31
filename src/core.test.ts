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

describe("formula grammar", () => {
  it("respects precedence and right associativity", () => {
    expect(format(parse("P ∧ Q → R → S"))).toBe("((P ∧ Q) → (R → S))");
  });
  it.each(["", "T", "P Q", "(P", "P)", "P ∨ Q", "P→"])("rejects %s", (text) =>
    expect(() => parse(text)).toThrow(),
  );
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
