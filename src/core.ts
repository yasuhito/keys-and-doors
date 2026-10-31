export type Formula = string | { op: "∧" | "→"; left: Formula; right: Formula };
export function parse(text: string): Formula {
  const tokens = text.replaceAll(" ", "").split("");
  let i = 0;
  function atom(): Formula {
    const t = tokens[i++];
    if (t === "(") {
      const f = imp();
      if (tokens[i++] !== ")") throw Error("parenthesis");
      return f;
    }
    if (!t || !"PQRS".includes(t)) throw Error("atom");
    return t;
  }
  function and(): Formula {
    let f = atom();
    while (tokens[i] === "∧") {
      i++;
      f = { op: "∧", left: f, right: atom() };
    }
    return f;
  }
  function imp(): Formula {
    const f = and();
    if (tokens[i] === "→") {
      i++;
      return { op: "→", left: f, right: imp() };
    }
    return f;
  }
  const f = imp();
  if (i !== tokens.length) throw Error("syntax");
  return f;
}
export const format = (f: Formula): string =>
  typeof f === "string" ? f : `(${format(f.left)} ${f.op} ${format(f.right)})`;
export const equal = (a: Formula, b: Formula) => format(a) === format(b);
export type Proof = {
  rule: "assume" | "∧I" | "∧E" | "→I" | "→E";
  formula: Formula;
  inputs: Proof[];
  scope?: number;
};
const atoms = ["P", "Q", "R", "S"];
function wellFormed(f: unknown): f is Formula {
  if (typeof f === "string") return atoms.includes(f);
  if (typeof f !== "object" || f === null) return false;
  const { op, left, right } = f as Record<string, unknown>;
  return (op === "∧" || op === "→") && wellFormed(left) && wellFormed(right);
}
export function checkProof(p: Proof, context: Formula[]): boolean {
  if (
    !p ||
    !wellFormed(p.formula) ||
    !Array.isArray(p.inputs) ||
    !(p.scope === undefined || (Number.isInteger(p.scope) && p.scope > 0))
  )
    return false;
  const f = p.formula,
    a = p.inputs;
  switch (p.rule) {
    case "assume":
      return a.length === 0 && context.some((c) => equal(c, f));
    case "∧I":
      return (
        typeof f !== "string" &&
        f.op === "∧" &&
        a.length === 2 &&
        equal(a[0].formula, f.left) &&
        equal(a[1].formula, f.right) &&
        a.every((x) => checkProof(x, context))
      );
    case "∧E":
      return (
        a.length === 1 &&
        typeof a[0].formula !== "string" &&
        a[0].formula.op === "∧" &&
        [a[0].formula.left, a[0].formula.right].some((x) => equal(x, f)) &&
        checkProof(a[0], context)
      );
    case "→I":
      return (
        typeof f !== "string" &&
        f.op === "→" &&
        a.length === 1 &&
        equal(a[0].formula, f.right) &&
        checkProof(a[0], [...context, f.left])
      );
    case "→E":
      return (
        a.length === 2 &&
        typeof a[0].formula !== "string" &&
        a[0].formula.op === "→" &&
        equal(a[0].formula.left, a[1].formula) &&
        equal(a[0].formula.right, f) &&
        a.every((x) => checkProof(x, context))
      );
  }
}
export type Key = { proof: Proof; ribbons: number[] };
export type Room = {
  goal: Formula;
  keys: Key[];
  parent?: number;
  children: number[];
  mode?: "∧I" | "→I" | "lemma";
  proof?: Proof;
  ribbon?: number;
};
export type State = { rooms: Room[]; current: number; initial: Formula[] };
export type Action =
  | { type: "intro" }
  | { type: "use" | "split" | "lemma"; key: number }
  | { type: "apply"; key: number; target: number }
  | { type: "visit"; room: number };
export function start(goal: string, assumptions: string[]): State {
  const initial = assumptions.map(parse);
  return {
    initial,
    current: 0,
    rooms: [
      {
        goal: parse(goal),
        keys: initial.map((formula) => ({
          proof: { rule: "assume", formula, inputs: [] },
          ribbons: [],
        })),
        children: [],
      },
    ],
  };
}
function add(room: Room, key: Key) {
  if (!room.keys.some((k) => equal(k.proof.formula, key.proof.formula)))
    room.keys.push(key);
}
export function move(state: State, action: Action): State {
  const s = structuredClone(state);
  const r = s.rooms[s.current];
  if (action.type === "visit") {
    const target = s.rooms[action.room];
    if (!target || target.proof || target.children.length)
      throw Error("not open");
    s.current = action.room;
    return s;
  }
  if (r.proof || r.children.length) throw Error("closed room");
  const finish = (index: number, proof: Proof) => {
    const room = s.rooms[index];
    room.proof = proof;
    if (room.parent === undefined) return;
    const parent = s.rooms[room.parent];
    if (parent.mode === "lemma") {
      add(parent, {
        proof,
        ribbons: [...new Set(parent.keys.flatMap((k) => k.ribbons))],
      });
      parent.children = [];
      parent.mode = undefined;
      s.current = room.parent;
      return;
    }
    const open = parent.children.find((c) => !s.rooms[c].proof);
    if (open !== undefined) {
      s.current = open;
      return;
    }
    finish(room.parent, {
      rule: parent.mode as "∧I" | "→I",
      formula: parent.goal,
      inputs: parent.children.map((c) => s.rooms[c].proof!),
      scope:
        parent.mode === "→I" ? s.rooms[parent.children[0]].ribbon : undefined,
    });
  };
  if (action.type === "intro") {
    const f = r.goal;
    if (typeof f === "string") throw Error("atomic door");
    r.mode = f.op === "∧" ? "∧I" : "→I";
    for (const goal of f.op === "∧" ? [f.left, f.right] : [f.right]) {
      const child: Room = {
        goal,
        keys: structuredClone(r.keys),
        parent: s.current,
        children: [],
      };
      if (f.op === "→") {
        child.ribbon = s.rooms.length;
        add(child, {
          proof: {
            rule: "assume",
            formula: f.left,
            inputs: [],
            scope: child.ribbon,
          },
          ribbons: [child.ribbon],
        });
      }
      r.children.push(s.rooms.length);
      s.rooms.push(child);
    }
    s.current = r.children[0];
    return s;
  }
  const key = r.keys[action.key];
  if (!key) throw Error("missing key");
  const f = key.proof.formula;
  if (action.type === "use") {
    if (!equal(f, r.goal)) throw Error("mismatch");
    finish(s.current, key.proof);
  }
  if (action.type === "split") {
    if (typeof f === "string" || f.op !== "∧") throw Error("not pair");
    for (const formula of [f.left, f.right])
      add(r, {
        proof: { rule: "∧E", formula, inputs: [key.proof] },
        ribbons: key.ribbons,
      });
  }
  if (action.type === "apply") {
    const target = r.keys[action.target];
    const socket = target?.proof.formula;
    if (
      !socket ||
      typeof socket === "string" ||
      socket.op !== "→" ||
      !equal(socket.left, f)
    )
      throw Error("wrong socket");
    add(r, {
      proof: {
        rule: "→E",
        formula: socket.right,
        inputs: [target.proof, key.proof],
      },
      ribbons: [...new Set([...key.ribbons, ...target.ribbons])],
    });
  }
  if (action.type === "lemma") {
    if (typeof f === "string" || f.op !== "→") throw Error("not socket");
    r.mode = "lemma";
    r.children = [s.rooms.length];
    s.rooms.push({
      goal: f.left,
      keys: structuredClone(r.keys),
      parent: s.current,
      children: [],
    });
    s.current = r.children[0];
  }
  return s;
}
// Bounded constructive proof search, also used by the visual hint system.
export function solve(state: State, budget = 150): Action[] | null {
  function search(s: State, left: number, seen: Set<string>): Action[] | null {
    if (s.rooms[0].proof) return [];
    if (left <= 0) return null;
    const r = s.rooms[s.current];
    const signature = `${format(r.goal)}:${r.keys.map((k) => format(k.proof.formula)).join(";")}`;
    if (seen.has(signature)) return null;
    const nextSeen = new Set(seen).add(signature);
    const actions: Action[] = [];
    r.keys.forEach((k, key) => {
      if (equal(k.proof.formula, r.goal)) actions.push({ type: "use", key });
    });
    r.keys.forEach((k, key) => {
      const f = k.proof.formula;
      if (
        typeof f !== "string" &&
        f.op === "∧" &&
        [f.left, f.right].some(
          (x) => !r.keys.some((y) => equal(x, y.proof.formula)),
        )
      )
        actions.push({ type: "split", key });
    });
    r.keys.forEach((k, target) => {
      const f = k.proof.formula;
      if (
        typeof f !== "string" &&
        f.op === "→" &&
        !r.keys.some((y) => equal(f.right, y.proof.formula))
      )
        r.keys.forEach((y, key) => {
          if (equal(f.left, y.proof.formula))
            actions.push({ type: "apply", key, target });
        });
    });
    if (typeof r.goal !== "string") actions.push({ type: "intro" });
    r.keys.forEach((k, key) => {
      const f = k.proof.formula;
      if (
        typeof f !== "string" &&
        f.op === "→" &&
        typeof f.left !== "string" &&
        !r.keys.some((y) => equal(f.left, y.proof.formula))
      )
        actions.push({ type: "lemma", key });
    });
    for (const action of actions) {
      const next = move(s, action);
      const tail = search(
        next,
        left - 1,
        action.type === "use" ? new Set() : nextSeen,
      );
      if (tail) return [action, ...tail];
    }
    return null;
  }
  return search(state, budget, new Set());
}
