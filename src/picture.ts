import { type Formula, format } from "./core";
const assets = import.meta.glob("./assets/icons/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export const iconURL = (name: string) => assets[`./assets/icons/${name}.svg`];
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
export function picture(f: Formula, w = 184, h = 137): string {
  function pane(
    f: Formula,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    recessed = false,
  ): string {
    const pad = Math.min(w, h) * 0.07;
    let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${recessed ? "#E2D6C1" : depth % 2 ? "#EDE3D1" : "#F7F1E6"}" stroke="${recessed ? "#A8997E" : "#D9CDB8"}" ${recessed ? 'stroke-dasharray="3 2"' : ""}/>`;
    x += pad;
    y += pad;
    w -= 2 * pad;
    h -= 2 * pad;
    if (Math.min(w, h) < 10)
      return (
        svg +
        `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" fill="#6B5E4B">···</text>`
      );
    if (typeof f === "string") {
      const size = Math.min(w, h) * 0.92;
      return (
        svg +
        `<image href="${iconURL(`atom-${names[f]}`)}" x="${x + (w - size) / 2}" y="${y + (h - size) / 2}" width="${size}" height="${size}"/>`
      );
    }
    const horizontal = w >= h,
      long = horizontal ? w : h;
    const gap =
      f.op === "∧"
        ? Math.max(4, long * 0.06)
        : Math.min(18, Math.max(8, long * 0.12));
    const first = (long - gap) * (f.op === "∧" ? 0.5 : 0.4),
      second = long - gap - first;
    svg += pane(
      f.left,
      x,
      y,
      horizontal ? first : w,
      horizontal ? h : first,
      depth + 1,
      f.op === "→",
    );
    svg += pane(
      f.right,
      x + (horizontal ? first + gap : 0),
      y + (horizontal ? 0 : first + gap),
      horizontal ? second : w,
      horizontal ? h : second,
      depth + 1,
    );
    const cx = x + (horizontal ? first + gap / 2 : w / 2),
      cy = y + (horizontal ? h / 2 : first + gap / 2);
    if (f.op === "∧")
      svg += `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.085}" fill="none" stroke="#9C7024" stroke-width="4"/><circle cx="${cx}" cy="${cy - 1}" r="${Math.min(w, h) * 0.085}" fill="none" stroke="#D9A441" stroke-width="2.5"/>`;
    else
      svg += `<path d="M -3 -5 L 3 0 L -3 5" transform="translate(${cx} ${cy}) rotate(${horizontal ? 0 : 90})" fill="none" stroke="#6B5E4B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return svg;
  }
  return `<svg class="picture" viewBox="0 0 ${w} ${h}" aria-hidden="true">${pane(f, 0, 0, w, h, 0)}</svg>`;
}
export function card(
  f: Formula,
  role: "key" | "door" | "node" = "key",
): string {
  return `<span class="object ${role}">${picture(f, role === "key" ? 88 : 184, role === "key" ? 66 : 137)}</span><span class="caption">${format(f)}</span>`;
}
