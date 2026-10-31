import type { Page } from "@playwright/test";
import { start, move, solve } from "../src/core";
import one from "../src/stages/layer-01.json" with { type: "json" };
import two from "../src/stages/layer-02.json" with { type: "json" };
export const stages = [...one.stages, ...two.stages];
export async function unlock(page: Page, count: number) {
  const proofs = Object.fromEntries(
    stages.slice(0, count).map((stage) => {
      let state = start(stage.tasks[0].goal, stage.tasks[0].assumptions);
      for (const action of solve(state)!) state = move(state, action);
      return [stage.id, state.rooms[0].proof];
    }),
  );
  await page.addInitScript((value) => {
    if (!localStorage.getItem("keys-and-doors:v1"))
      localStorage.setItem("keys-and-doors:v1", value);
  }, JSON.stringify({ proofs }));
  await page.goto("./");
}
