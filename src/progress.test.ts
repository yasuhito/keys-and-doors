import { it, expect } from "vitest";
import { load, save, fresh } from "./progress";
import { start, solve, move } from "./core";
const stages = [
  { id: "stage-001", tasks: [{ goal: "P → P", assumptions: [] }] },
];
it("round-trips settings and a verified completed proof", () => {
  let s = start("P → P", []);
  for (const a of solve(s)!) s = move(s, a);
  const p = fresh();
  p.proofs["stage-001"] = s.rooms[0].proof!;
  p.captions = true;
  let data = "";
  const storage = {
    setItem: (_: string, value: string) => {
      data = value;
    },
    getItem: () => data,
  };
  expect(save(storage, p)).toBe(true);
  expect(load(storage, stages)).toEqual(p);
});
it("ignores corrupt, forged and mismatched progress without unlocking stages", () => {
  for (const data of [
    "bad json",
    "null",
    '{"proofs":{"stage-001":{}}}',
    JSON.stringify({
      proofs: { "stage-001": { rule: "assume", formula: "P", inputs: [] } },
    }),
    '{"captions":"true"}',
  ])
    expect(load({ getItem: () => data }, stages)).toEqual(fresh());
});
it("survives unavailable storage and full quotas", () => {
  expect(
    load(
      {
        getItem: () => {
          throw Error("disabled");
        },
      },
      stages,
    ),
  ).toEqual(fresh());
  expect(
    save(
      {
        setItem: () => {
          throw Error("full");
        },
      },
      fresh(),
    ),
  ).toBe(false);
});
