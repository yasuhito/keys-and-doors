import { checkProof, equal, parse, type Proof } from "./core";
export type Progress = {
  proofs: Record<string, Proof>;
  captions: boolean;
  left: boolean;
  haptics: boolean;
  reduced: boolean;
};
export const fresh = (): Progress => ({
  proofs: {},
  captions: false,
  left: false,
  haptics: true,
  reduced: false,
});
export const storageKey = "keys-and-doors:v1";
export function load(
  storage: Pick<Storage, "getItem">,
  stages: { id: string; tasks: { goal: string; assumptions: string[] }[] }[],
): Progress {
  const result = fresh();
  try {
    const data = JSON.parse(storage.getItem(storageKey) ?? "{}");
    for (const key of ["captions", "left", "haptics", "reduced"] as const)
      if (typeof data[key] === "boolean") result[key] = data[key];
    for (const stage of stages) {
      const proof = data.proofs?.[stage.id];
      try {
        if (
          proof &&
          equal(proof.formula, parse(stage.tasks[0].goal)) &&
          checkProof(proof, stage.tasks[0].assumptions.map(parse))
        )
          result.proofs[stage.id] = proof;
      } catch {
        /* Ignore malformed individual saves. */
      }
    }
  } catch {
    /* Storage can be unavailable or corrupt. */
  }
  return result;
}
export function save(
  storage: Pick<Storage, "setItem">,
  progress: Progress,
): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
