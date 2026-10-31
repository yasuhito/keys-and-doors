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
// Atom silhouettes on the 48 grid: one closed outline each, the same paths as
// src/assets/icons/atom-*.svg. A key is this outline; its hole is the same outline cut in.
const outlines: Record<string, string> = {
  sun: "M21.9 10.76L22.59 1.64A1.41 1.41 0 0 1 25.41 1.64L26.1 10.76A13.4 13.4 0 0 1 31.88 13.16L38.81 7.2A1.41 1.41 0 0 1 40.8 9.19L34.84 16.12A13.4 13.4 0 0 1 37.24 21.9L46.36 22.59A1.41 1.41 0 0 1 46.36 25.41L37.24 26.1A13.4 13.4 0 0 1 34.84 31.88L40.8 38.81A1.41 1.41 0 0 1 38.81 40.8L31.88 34.84A13.4 13.4 0 0 1 26.1 37.24L25.41 46.36A1.41 1.41 0 0 1 22.59 46.36L21.9 37.24A13.4 13.4 0 0 1 16.12 34.84L9.19 40.8A1.41 1.41 0 0 1 7.2 38.81L13.16 31.88A13.4 13.4 0 0 1 10.76 26.1L1.64 25.41A1.41 1.41 0 0 1 1.64 22.59L10.76 21.9A13.4 13.4 0 0 1 13.16 16.12L7.2 9.19A1.41 1.41 0 0 1 9.19 7.2L16.12 13.16A13.4 13.4 0 0 1 21.9 10.76Z",
  moon: "M22.85 7.04A17 17 0 1 0 40.96 25.15A13 13 0 0 1 22.85 7.04Z",
  leaf: "M7.6 37.9C7.8 20 20 8 41 7C41 28 29 40.4 10.1 40.4L6.3 44.2A1.77 1.77 0 0 1 3.8 41.7Z",
  star: "M24 5.5L29.05 18.54L43.02 19.32L32.18 28.16L35.76 41.68L24 34.1L12.24 41.68L15.82 28.16L4.98 19.32L18.95 18.54Z",
};
// Engraved marks on a key's face. They are not part of the outline, so holes do not show them.
const marks: Record<string, string> = {
  leaf: "M12.5 35.5L32 16",
};
type Box = { x: number; y: number; w: number; h: number };
type Paint = [fill: string, edge: string];
type Hole = { shadow: string; floor: string; lip: string };
type Palette = {
  atom: (name: string) => Paint;
  bar: Paint;
  plate: Paint;
  arrow: string;
  hole: Hole;
  pocket: Hole;
};
const atomColors: Record<string, Paint> = {
  sun: ["#E0631F", "#A8410C"],
  moon: ["#2F6FD0", "#1E4C96"],
  leaf: ["#1E9A6C", "#0F6A48"],
  star: ["#C2509E", "#8A2F6E"],
};
// Colours of something you hold. Section 3 of docs/design.md.
const have: Palette = {
  atom: (name) => atomColors[name] ?? ["#6B5E4B", "#6B5E4B"],
  bar: ["#D9A441", "#9C7024"],
  plate: ["#F7F1E6", "#9C7024"],
  arrow: "#6B5E4B",
  hole: { shadow: "#2E261F", floor: "#5E5143", lip: "#FFFFFF" },
  pocket: { shadow: "#A8997E", floor: "#DDD0B8", lip: "#FFFFFF" },
};
// Colours of what an if-then key gives you once its hole is filled.
const pending: Palette = {
  atom: () => ["#CCC4B6", "#AFA696"],
  bar: ["#C4BCAE", "#A9A092"],
  plate: ["#EEE9E0", "#AFA696"],
  arrow: "#AFA696",
  hole: { shadow: "#9D9488", floor: "#BBB2A4", lip: "#FAF8F3" },
  pocket: { shadow: "#C9C1B4", floor: "#E3DDD2", lip: "#FAF8F3" },
};
const ok = "#7CE0B5",
  lit = "#B07A1A";
const n = (v: number) => Math.round(v * 100) / 100;
const clamp = (lo: number, v: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const inset = (b: Box, p: number): Box => ({
  x: b.x + p,
  y: b.y + p,
  w: b.w - 2 * p,
  h: b.h - 2 * p,
});
const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const rect = (b: Box, rx: number, fill: string, edge: string, width = 1) =>
  `<rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.h)}" rx="${n(rx)}" fill="${fill}" stroke="${edge}" stroke-width="${n(width)}" stroke-linejoin="round"/>`;
// Where every part of a formula sits. Computed once, then drawn in several looks.
type Layout =
  | { kind: "fold"; f: Formula; b: Box }
  | { kind: "atom"; f: Formula; b: Box; name: string; size: number }
  | { kind: "pair"; f: Formula; b: Box; parts: [Layout, Layout]; bar: Box }
  | {
      kind: "imp";
      f: Formula;
      b: Box;
      parts: [Layout, Layout];
      margin: number;
      spine: Box;
      arrow: string;
      stroke: number;
    };
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
// A bar of thickness t from the centre of one box to the centre of another.
function band(a: Box, b: Box, t: number): Box {
  const p = centre(a),
    q = centre(b);
  return p.y === q.y
    ? { x: p.x, y: p.y - t / 2, w: q.x - p.x, h: t }
    : { x: p.x - t / 2, y: p.y, w: t, h: q.y - p.y };
}
function layout(f: Formula, b: Box): Layout {
  if (Math.min(b.w, b.h) < 10) return { kind: "fold", f, b };
  if (typeof f === "string")
    return {
      kind: "atom",
      f,
      b,
      name: names[f],
      size: Math.min(b.w, b.h) * 0.92,
    };
  if (f.op === "∧") {
    const { first, second, short } = split(b, (l) => clamp(6, l * 0.1, 16));
    return {
      kind: "pair",
      f,
      b,
      parts: [layout(f.left, first), layout(f.right, second)],
      bar: band(first, second, clamp(4, short * 0.14, 10)),
    };
  }
  const margin = clamp(2, Math.min(b.w, b.h) * 0.07, 7);
  const { first, second, horizontal, gap, short } = split(
    inset(b, margin),
    (l) => clamp(12, l * 0.16, 26),
  );
  const len = Math.max(8, gap - 4),
    head = clamp(3, len * 0.33, 6),
    c = horizontal
      ? { x: first.x + first.w + gap / 2, y: first.y + first.h / 2 }
      : { x: first.x + first.w / 2, y: first.y + first.h + gap / 2 };
  return {
    kind: "imp",
    f,
    b,
    parts: [layout(f.left, first), layout(f.right, second)],
    margin,
    spine: band(first, second, 2 * head),
    arrow: `M${n(-len / 2)} 0H${n(len / 2)}M${n(len / 2 - head)} ${n(-head)}L${n(len / 2)} 0L${n(len / 2 - head)} ${n(head)}" transform="translate(${n(c.x)} ${n(c.y)}) rotate(${horizontal ? 0 : 90})`,
    stroke: clamp(1.8, short * 0.03, 3.5),
  };
}
const place = (l: { b: Box; size: number }) =>
  `transform="translate(${n(l.b.x + (l.b.w - l.size) / 2)} ${n(l.b.y + (l.b.h - l.size) / 2)}) scale(${(l.size / 48).toFixed(4)})"`;
// The outline of a part, grown outward by `grow`, plus an edge `edge` wide.
// An if-then is its parts and spine grown by its margin: a plate that hugs what it holds.
function outline(
  l: Layout,
  grow: number,
  paint: (part: Layout) => Paint,
  edge = 0,
): string {
  const width = 2 * grow + edge;
  const [fill, stroke] = paint(l);
  switch (l.kind) {
    case "fold":
      return rect(inset(l.b, -grow), 4 + grow, fill, stroke, edge);
    case "atom":
      return `<path d="${outlines[l.name]}" ${place(l)} fill="${fill}" stroke="${stroke}" stroke-width="${n((width * 48) / l.size)}" stroke-linejoin="round"/>`;
    case "pair":
      return (
        rect(l.bar, Math.min(l.bar.w, l.bar.h) / 2, fill, stroke, width) +
        outline(l.parts[0], grow, paint, edge) +
        outline(l.parts[1], grow, paint, edge)
      );
    case "imp": {
      const same = () => [fill, stroke] as Paint,
        g = grow + l.margin;
      return (
        rect(
          l.spine,
          Math.min(l.spine.w, l.spine.h) / 2,
          fill,
          stroke,
          2 * g + edge,
        ) +
        outline(l.parts[0], g, same, edge) +
        outline(l.parts[1], g, same, edge)
      );
    }
  }
}
const shift = (dy: number, body: string) =>
  dy ? `<g transform="translate(0 ${n(dy)})">${body}</g>` : body;
let masks = 0;
// Draws an outline as cut in: a bright lip below, a dark rim above inside, then the floor.
function recess(body: (fill: string) => string, depth: number, c: Hole) {
  const id = `kd-cut-${masks++}`;
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3000" height="3000">${body("#fff")}</mask>${shift(depth, body(c.lip))}${body(c.shadow)}<g mask="url(#${id})">${shift(depth * 1.3, body(c.floor))}</g>`;
}
const depthOf = (l: Layout) =>
  l.kind === "imp"
    ? clamp(1.5, Math.min(l.b.w, l.b.h) * 0.04, 4)
    : clamp(1, Math.min(l.b.w, l.b.h) * 0.05, 3.5);
// Paths name parts of a formula: "" is the whole picture, then L or R picks a pair half,
// S the hole of an if-then and T its result. A filled path is drawn with its key seated in it.
export function picture(
  f: Formula,
  w = 184,
  h = 137,
  goal = false,
  filled: string[] = [],
): string {
  const complete = (l: Layout, at: string): boolean =>
    filled.includes(at) ||
    (l.kind === "pair" &&
      complete(l.parts[0], at + "L") &&
      complete(l.parts[1], at + "R"));
  const colours = (p: Palette) => (l: Layout) =>
    l.kind === "atom" ? p.atom(l.name) : l.kind === "pair" ? p.bar : p.plate;
  // The face of a key: what you hold (have) or what you will get (pending).
  function face(
    l: Layout,
    p: Palette,
    path: string,
    full: boolean,
    plate = true,
  ): string {
    switch (l.kind) {
      case "fold":
        return `<text x="${n(l.b.x + l.b.w / 2)}" y="${n(l.b.y + l.b.h / 2)}" text-anchor="middle" dominant-baseline="middle" fill="#6B5E4B">···</text>`;
      case "atom":
        return (
          outline(l, 0, colours(p), 2) +
          (marks[l.name] && p === have
            ? `<path d="${marks[l.name]}" ${place(l)} fill="none" stroke="${p.atom(l.name)[1]}" stroke-width="2.5" stroke-linecap="round"/>`
            : "")
        );
      case "pair":
        return `<g class="pair"><g class="bridge">${rect(l.bar, Math.min(l.bar.w, l.bar.h) / 2, p.bar[0], p.bar[1])}</g>${face(l.parts[0], p, path + "L", full)}${face(l.parts[1], p, path + "R", full)}</g>`;
      case "imp": {
        full ||= complete(l, path);
        // Until its hole is filled, what an if-then gives is drawn grey.
        const result = full ? have : pending;
        return `${plate ? `<g class="plate">${outline(l, 0, () => [p.plate[1], p.plate[1]], 3)}${outline(l, 0, () => [p.plate[0], p.plate[0]])}</g>` : ""}<g class="slot">${hole(l.parts[0], p, path + "S", full || complete(l.parts[0], path + "S"), path === "" && !goal, false)}</g><path class="arrow" d="${l.arrow}" fill="none" stroke="${full ? lit : p.arrow}" stroke-width="${n(l.stroke * (full ? 1.25 : 1))}" stroke-linecap="round" stroke-linejoin="round"/><g class="result">${face(l.parts[1], result, path + "T", full)}</g>`;
      }
    }
  }
  // The same outline cut in. A pair hole is a hole for each half joined by a channel for
  // the bar; an if-then hole is a pocket the shape of the whole key, with its face on the floor.
  function hole(
    l: Layout,
    p: Palette,
    path: string,
    full: boolean,
    glow: boolean,
    door: boolean,
  ): string {
    if (l.kind === "fold") return face(l, p, path, full);
    full ||= complete(l, path);
    const halos = (part: Layout, at: string): string =>
      `<g class="glow" data-path="${at}">${outline(part, 0, () => [ok, ok], 7)}</g>` +
      (door && part.kind === "pair"
        ? halos(part.parts[0], at + "L") + halos(part.parts[1], at + "R")
        : "");
    const cut = (part: Layout): string => {
      const into = (c: string) => outline(part, 0, () => [c, c], 1);
      switch (part.kind) {
        case "fold":
          return face(part, p, "", false);
        case "atom":
          return recess(into, depthOf(part), p.hole);
        case "pair": {
          const t = Math.min(part.bar.w, part.bar.h);
          return `<g class="bridge">${recess((c) => rect(part.bar, t / 2, c, c), clamp(1, t * 0.2, 2.5), p.hole)}</g>${cut(part.parts[0])}${cut(part.parts[1])}`;
        }
        case "imp":
          return `${recess(into, depthOf(part), p.pocket)}<g class="imprint"${door ? "" : ' opacity="0.6"'}>${face(part, p, "~", false, false)}</g>`;
      }
    };
    return `<g class="cut" data-path="${path}">${glow && !full ? halos(l, path) : ""}${cut(l)}${seated(l, path, full)}</g>`;
  }
  // A key seated in its hole sits flush: full size and no thickness, so the lip still
  // shows below it. A pair's bar seats only once both halves have.
  function seated(l: Layout, path: string, full: boolean): string {
    if (full)
      return `<g class="seated">${face(l, have, path + "~", false)}</g>`;
    if (l.kind !== "pair") return "";
    return (
      seated(l.parts[0], path + "L", complete(l.parts[0], path + "L")) +
      seated(l.parts[1], path + "R", complete(l.parts[1], path + "R"))
    );
  }
  const b = { x: 0, y: 0, w, h };
  if (goal) {
    const l = layout(f, inset(b, Math.min(w, h) * 0.08));
    // An if-then door is a pocket the shape of the key that fits it, with that key's face
    // on its floor: tap its hole to borrow that key (if-intro).
    const pocket =
      l.kind === "imp"
        ? recess((c) => outline(l, 0, () => [c, c], 1), depthOf(l), have.pocket)
        : "";
    const door =
      l.kind !== "imp"
        ? hole(l, have, "", false, true, true)
        : complete(l, "")
          ? `<g class="cut" data-path="">${pocket}${face(l, have, "", true, false)}</g>`
          : `<g class="cut" data-path="">${pocket}${face(l, have, "", false, false)}</g>`;
    return `<svg class="picture" viewBox="0 0 ${w} ${h}" aria-hidden="true">${rect(inset(b, 0.5), 6, have.plate[0], "#D9CDB8")}${door}</svg>`;
  }
  const t = clamp(1.5, Math.min(w, h) * 0.05, 4);
  const l = layout(f, { x: 2, y: 2, w: w - 4, h: h - 4 - t });
  const underside = (part: Layout): Paint => {
    const edge = colours(have)(part)[1];
    return [edge, edge];
  };
  return `<svg class="picture" viewBox="0 0 ${w} ${h}" aria-hidden="true"><g class="body">${shift(t, outline(l, 0, underside, 2))}</g>${face(l, have, "", false)}</svg>`;
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
