import { type Formula, format } from "./core";
const rawIcons = import.meta.glob("./assets/icons/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
export const icon = (name: string) =>
  rawIcons[`./assets/icons/${name}.svg`].replace(
    "<svg ",
    '<svg class="icon" aria-hidden="true" ',
  );
const names: Record<string, string> = {
  P: "sun",
  Q: "moon",
  R: "leaf",
  S: "star",
};
export function spoken(f: Formula): string {
  return typeof f === "string"
    ? names[f]
    : f.op === "∧"
      ? `${spoken(f.left)} and ${spoken(f.right)}`
      : `if ${spoken(f.left)} then ${spoken(f.right)}`;
}
type Box = { x: number; y: number; w: number; h: number };
type Hole = { shadow: string; fill: string; edge: string; lip: string };
type Palette = {
  plate: [string, string];
  edge: string;
  bridge: [string, string];
  arrow: string;
  recess: string;
  hole: Hole;
  atom: (name: string) => [string, string];
};
const atomColors: Record<string, [string, string]> = {
  sun: ["#E0631F", "#A8410C"],
  moon: ["#2F6FD0", "#1E4C96"],
  leaf: ["#1E9A6C", "#0F6A48"],
  star: ["#C2509E", "#8A2F6E"],
};
// Colours of something you hold. Section 3 of docs/design.md.
const have: Palette = {
  plate: ["#F7F1E6", "#EDE3D1"],
  edge: "#D9CDB8",
  bridge: ["#D9A441", "#9C7024"],
  arrow: "#6B5E4B",
  recess: "#E2D6C1",
  hole: { shadow: "#2E261F", fill: "#5E5143", edge: "#2E261F", lip: "#FFFFFF" },
  atom: (name) => atomColors[name] ?? ["#6B5E4B", "#6B5E4B"],
};
// Colours of what an if-then card gives you once its slot is filled.
const pending: Palette = {
  plate: ["#EEE9E0", "#E6E0D5"],
  edge: "#AFA696",
  bridge: ["#C4BCAE", "#A9A092"],
  arrow: "#AFA696",
  recess: "#E3DDD2",
  hole: { shadow: "#9D9488", fill: "#BBB2A4", edge: "#9D9488", lip: "#FAF8F3" },
  atom: () => ["#CCC4B6", "#AFA696"],
};
// Atom silhouettes on the 48 grid, the same paths as src/assets/icons/atom-*.svg.
function shape(name: string, fill: string, edge: string) {
  switch (name) {
    case "sun":
      return `<path d="M24 3.5v6M24 38.5v6M3.5 24h6M38.5 24h6M9.5 9.5l4.2 4.2M34.3 34.3l4.2 4.2M9.5 38.5l4.2-4.2M34.3 13.7l4.2-4.2" fill="none" stroke="${fill}" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="24" r="10.5" fill="${fill}" stroke="${edge}" stroke-width="2"/>`;
    case "moon":
      return `<path d="M22.63 7.05A17 17 0 1 0 40.95 25.37A13 13 0 1 1 22.63 7.05Z" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`;
    case "leaf":
      return `<path d="M9 39C8 21 20 8 41 7C41 28 29 40 9 39Z" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/><path d="M6 42L33 15" fill="none" stroke="${edge}" stroke-width="2.5" stroke-linecap="round"/>`;
    default:
      return `<path d="M24.00 6.00L28.82 18.87L42.55 19.47L31.80 28.03L35.46 41.28L24.00 33.70L12.54 41.28L16.20 28.03L5.45 19.47L19.18 18.87Z" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`;
  }
}
const ok = "#7CE0B5",
  lit = "#B07A1A";
let masks = 0;
// Draws a body as cut into the card: a bright lip below, a dark rim above inside.
function recess(
  body: (fill: string, edge: string, dy: number) => string,
  depth: number,
  c: Hole,
) {
  const id = `kd-cut-${masks++}`;
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000">${body("#fff", "#fff", 0)}</mask>${body(c.lip, c.lip, depth)}${body(c.shadow, c.edge, 0)}<g mask="url(#${id})">${body(c.fill, c.fill, depth * 1.3)}</g>`;
}
const n = (v: number) => Math.round(v * 100) / 100;
const clamp = (lo: number, v: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const inset = (b: Box, p: number): Box => ({
  x: b.x + p,
  y: b.y + p,
  w: b.w - 2 * p,
  h: b.h - 2 * p,
});
const rect = (b: Box, rx: number, fill: string, edge: string, extra = "") =>
  `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="${n(rx)}" fill="${fill}" stroke="${edge}"${extra}/>`;
// Splits a box along its longer axis, so nesting alternates between rows and columns.
function split(b: Box, gapOf: (long: number) => number) {
  const horizontal = b.w >= b.h,
    long = horizontal ? b.w : b.h,
    gap = gapOf(long),
    half = (long - gap) / 2;
  const first = horizontal ? { ...b, w: half } : { ...b, h: half };
  const second = horizontal
    ? { ...b, x: b.x + half + gap, w: half }
    : { ...b, y: b.y + half + gap, h: half };
  return { first, second, horizontal, gap, short: horizontal ? b.h : b.w };
}
type Mode = "have" | "hole" | "need";
// Paths name parts of a formula: "" is the whole card, then L or R picks a pair half
// and S picks the slot of an if-then. A filled path is drawn with its key seated in it.
export function picture(
  f: Formula,
  w = 184,
  h = 137,
  goal = false,
  filled: string[] = [],
): string {
  function atom(
    name: string,
    b: Box,
    mode: Mode,
    p: Palette,
    glow: boolean,
    full: boolean,
    path: string,
  ) {
    const size = Math.min(b.w, b.h) * 0.92,
      s = size / 48;
    const at = (dy: number, k = 1) =>
      `transform="translate(${n(b.x + (b.w - size * k) / 2)} ${n(b.y + (b.h - size * k) / 2 + dy)}) scale(${(s * k).toFixed(4)})"`;
    const own = (k = 1) => {
      const [fill, edge] = (mode === "have" ? p : have).atom(name);
      return `<g ${at(0, k)}>${shape(name, fill, edge)}</g>`;
    };
    if (mode === "have") return own();
    const halo = shape(name, ok, ok).replace(
      /stroke-width="([\d.]+)"/g,
      (_, v) => `stroke-width="${n(Number(v) + 6 / s)}"`,
    );
    const cut = recess(
      (fill, edge, dy) => `<g ${at(dy)}>${shape(name, fill, edge)}</g>`,
      clamp(1, size * 0.05, 3.5),
      p.hole,
    );
    return `<g class="cut" data-part="${path}">${glow && !full ? `<g class="glow" data-path="${path}" ${at(0)}>${halo}</g>` : ""}${cut}${full ? `<g class="seated">${own(0.9)}</g>` : ""}</g>`;
  }
  function tile(
    c: Formula,
    b: Box,
    depth: number,
    mode: Mode,
    p: Palette,
    top: boolean,
    path: string,
    full: boolean,
  ) {
    const r = Math.min(b.w, b.h);
    return (
      `<g data-part="${path}">` +
      rect(b, r * 0.12, p.plate[depth % 2], p.edge) +
      draw(c, inset(b, r * 0.07), depth, mode, p, top, path, full) +
      `</g>`
    );
  }
  function draw(
    f: Formula,
    b: Box,
    depth: number,
    mode: Mode,
    p: Palette,
    top: boolean,
    path: string,
    full = false,
  ): string {
    const complete = (part: Formula, at: string): boolean =>
      filled.includes(at) ||
      (typeof part !== "string" &&
        part.op === "∧" &&
        complete(part.left, at + "L") &&
        complete(part.right, at + "R"));
    full ||= complete(f, path);
    if (Math.min(b.w, b.h) < 10)
      return `<text x="${n(b.x + b.w / 2)}" y="${n(b.y + b.h / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#6B5E4B">···</text>`;
    if (typeof f === "string")
      return atom(names[f], b, mode, p, top, full, path);
    if (f.op === "→" && mode === "hole") {
      // The slot for an if-then key is a recess shaped like that whole key, holding its imprint.
      const plate = (fill: string, edge: string, dy: number) =>
        rect({ ...b, y: b.y + dy }, 6, fill, edge, ' stroke-width="1"');
      const inner = inset(b, Math.min(b.w, b.h) * 0.08);
      return `<g class="cut">${top && !full ? rect(inset(b, -1.5), 7.5, "none", ok, ` class="glow" data-path="${path}" stroke-width="3"`) : ""}${recess(plate, clamp(1.5, Math.min(b.w, b.h) * 0.04, 4), { ...p.hole, shadow: p.hole.fill, fill: p.recess })}${full ? `<g class="seated">${rect(inner, 5, have.plate[0], have.edge)}${draw(f, inner, depth + 1, "have", have, false, path + "~")}</g>` : `<g opacity="0.55">${draw(f, inner, depth + 1, "have", p, false, path + "~")}</g>`}</g>`;
    }
    if (f.op === "∧") {
      const { first, second, horizontal, gap, short } = split(b, (l) =>
        clamp(8, l * 0.14, 22),
      );
      const t = clamp(5, short * 0.13, 12),
        bar: Box = horizontal
          ? {
              x: first.x + first.w - 2,
              y: b.y + (b.h - t) / 2,
              w: gap + 4,
              h: t,
            }
          : {
              x: b.x + (b.w - t) / 2,
              y: first.y + first.h - 2,
              w: t,
              h: gap + 4,
            };
      const brass = (b: Box) =>
        rect(
          b,
          Math.min(b.w, b.h) / 2,
          have.bridge[0],
          have.bridge[1],
          ' stroke-width="1"',
        );
      const bridge =
        mode === "have"
          ? rect(bar, t / 2, p.bridge[0], p.bridge[1], ' stroke-width="1"')
          : recess(
              (fill, edge, dy) =>
                rect(
                  { ...bar, y: bar.y + dy },
                  t / 2,
                  fill,
                  edge,
                  ' stroke-width="1"',
                ),
              clamp(1, t * 0.2, 2.5),
              p.hole,
            ) +
            (full
              ? `<g class="seated">${brass(inset(bar, t * 0.12))}</g>`
              : "");
      return `<g class="pair">${tile(f.left, first, depth + 1, mode, p, top, path + "L", full)}${tile(f.right, second, depth + 1, mode, p, top, path + "R", full)}<g class="bridge">${bridge}</g></g>`;
    }
    const { first, second, horizontal, gap, short } = split(b, (l) =>
      clamp(12, l * 0.16, 26),
    );
    const len = Math.max(8, gap - 4),
      head = clamp(3.5, len * 0.35, 7),
      cx = horizontal ? first.x + first.w + gap / 2 : b.x + b.w / 2,
      cy = horizontal ? b.y + b.h / 2 : first.y + first.h + gap / 2;
    const arrow = `<path class="arrow" d="M${n(-len / 2)} 0H${n(len / 2)}M${n(len / 2 - head)} ${n(-head)}L${n(len / 2)} 0L${n(len / 2 - head)} ${n(head)}" transform="translate(${n(cx)} ${n(cy)}) rotate(${horizontal ? 0 : 90})" fill="none" stroke="${full ? lit : p.arrow}" stroke-width="${n(clamp(2, short * 0.035, 4) * (full ? 1.25 : 1))}" stroke-linecap="round" stroke-linejoin="round"/>`;
    // Until its slot is filled, what an if-then gives is drawn grey.
    const result = full ? have : pending;
    return `<g class="slot" data-part="${path}S">${draw(f.left, first, depth + 1, "hole", p, top && depth === 0 && mode === "have", path + "S", full)}</g>${arrow}<g class="result" data-part="${path}T">${
      typeof f.right === "string"
        ? draw(
            f.right,
            second,
            depth + 1,
            "have",
            result,
            false,
            path + "T",
            full,
          )
        : tile(
            f.right,
            second,
            depth + 1,
            "have",
            result,
            false,
            path + "T",
            full,
          )
    }</g>`;
  }
  const b = { x: 0, y: 0, w, h };
  return `<svg class="picture" viewBox="0 0 ${w} ${h}" aria-hidden="true">${rect(inset(b, 0.5), 6, have.plate[0], have.edge)}${draw(f, inset(b, Math.min(w, h) * 0.07), 0, goal ? "need" : "have", have, true, "")}</svg>`;
}
export const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Doors and path chips show what is needed (holes), keys and proof nodes what is held.
export function card(
  f: Formula,
  role: "key" | "door" | "node" = "key",
  goal = role === "door",
  filled: string[] = [],
): string {
  return `<span class="object ${role}">${picture(f, role === "key" ? 88 : 184, role === "key" ? 66 : 137, goal, filled)}</span><span class="caption">${escape(format(f))}</span>`;
}
