import { it, expect } from "vitest";
import { card, picture, splitBar } from "./picture";
import {
  AND_BAR,
  AND_BAR_LIGHTS_ON,
  LONG_PRESS_PICTURES,
  TOUCH_TARGET_PX,
} from "./tuning";
import { parse, type Formula } from "./core";
it("escapes formula text interpolated into card markup", () => {
  const html = card("<img src=x onerror=alert(1)>" as Formula, "node");
  expect(html).not.toContain("<img");
  expect(html).toContain("&#60;img src=x onerror=alert(1)&#62;");
});
it("draws a door as holes and a key in colour", () => {
  expect(picture("P", 184, 137, true)).toContain('class="cut"');
  expect(picture("P")).not.toContain('class="cut"');
  expect(picture("P")).toContain("#E0631F");
});
it("keeps an if-then result grey until the whole card is filled", () => {
  const sunToMoon = parse("P → Q");
  const seated = picture(sunToMoon, 88, 66, false, ["S"]);
  expect(seated).toContain('class="seated"');
  expect(seated).not.toContain("#2F6FD0");
  const fitted = picture(sunToMoon, 88, 66, false, [""]);
  expect(fitted).toContain("#2F6FD0");
  expect(fitted).toContain('stroke="#B07A1A"');
});
it("keeps the horizontal brass bar plain with only one filled hollow", () => {
  const pair = parse("P ∧ Q");
  const partial = picture(pair, 184, 137, true, ["L"]);
  expect(partial).toContain("#E0631F");
  expect(partial).not.toContain("#2F6FD0");
  expect(partial).toContain('class="joint" data-path=""');
  expect(partial).not.toContain('class="bridge"');
  expect(partial).toContain('fill="#D9A441"');
  const locked = picture(pair, 184, 137, true, ["L", "R"]);
  expect(locked).toContain("#2F6FD0");
  expect(locked).toContain('fill="#D9A441"');
});
it("uses horizontal bars recursively on doors, but recessed channels inside keys and pockets", () => {
  expect(picture(parse("(P ∧ Q) ∧ R"), 184, 137, true)).toContain(
    'class="joint" data-path="L"',
  );
  const key = picture(parse("(P ∧ Q) → R"), 184, 137);
  expect(key).not.toContain('class="joint"');
  expect(key).toContain('class="bridge"');
  const pocket = picture(parse("(P ∧ Q) → R"), 184, 137, true);
  expect(pocket).not.toContain('class="joint"');
  expect(pocket).toContain('class="bridge"');
});
it("exposes only the outer held pair bridge for its independent split button", () => {
  const pair = picture(parse("(P ∧ Q) ∧ R"), 88, 66);
  expect(pair.match(/class="bridge" data-path=""/g)).toHaveLength(1);
  expect(picture(parse("P → (Q ∧ R)"), 88, 66)).not.toContain(
    'class="bridge" data-path=""',
  );
  expect(pair).toContain('<g class="joint-face">');
});
it("identifies the two split source silhouettes independently of extra engraved marks", () => {
  const key = picture(parse("R ∧ (P → Q)"), 88, 66);
  expect(key).toContain('<path data-key-part="L"');
  expect(key).toContain('<g class="plate" data-key-part="R"');
  expect(picture("R", 88, 66)).toContain('<path data-key-part=""');
});
it("provides a brass-coloured outline glow separate from the held face and body", () => {
  const key = picture("P", 88, 66);
  expect(key).toMatch(
    /<g class="body">.*<g class="held-glow">.*stroke="#FFE7A8" stroke-width=/,
  );
  expect(picture("P", 184, 137, true)).not.toContain('class="held-glow"');
});
it("fills nested if-then results recursively", () => {
  const fitted = picture(parse("P → (Q → R)"), 184, 137, false, [""]);
  expect(fitted).toContain('class="seated"');
  expect(fitted).toContain("#1E9A6C");
  expect(fitted).not.toContain("#CCC4B6");
});
it("marks each pair hole with its path so one hole can glow alone", () => {
  const door = picture(parse("P ∧ Q"), 184, 137, true);
  expect(door).toContain('class="glow" data-path="L"');
  expect(door).toContain('class="glow" data-path="R"');
});
it("cuts each door hole with exactly the outline of the key that fits it", () => {
  const outlineOf = (svg: string) => svg.match(/<path d="(M[^"]+Z)"/)![1];
  for (const atom of ["P", "Q", "R", "S"]) {
    const key = picture(atom, 88, 66);
    const door = picture(atom, 184, 137, true);
    expect(door).toContain(`d="${outlineOf(key)}"`);
  }
});
it("draws a key as its own shape, not on a card", () => {
  expect(picture("P", 88, 66)).not.toContain("<rect");
  expect(picture(parse("P ∧ Q"), 88, 66)).toMatch(/<rect[^>]*fill="#D9A441"/);
});
it("seats an if-then key as it is, without using it", () => {
  const seated = picture(parse("(P → Q) → R"), 184, 137, false, ["S"]);
  expect(seated).toContain('class="seated"');
  expect(seated).not.toContain("#2F6FD0");
  expect(seated).not.toContain("#1E9A6C");
});
it("shows if-then halves of a pair door as pockets with the key's face", () => {
  const door = picture(parse("(P → P) ∧ (Q → Q)"), 184, 137, true);
  expect(door.match(/class="imprint"/g)).toHaveLength(2);
});
it("stage-001 draws the specified rounded bar with two grooves above both hollows", () => {
  const door = picture(parse("P ∧ Q"), 184, 137, true);
  expect(door).toContain(
    'x="83.03" y="62.74" width="36" height="11.52" rx="5.76"',
  );
  expect(door).toContain('d="M95.03 65.24v6.52M107.03 65.24v6.52"');
  expect(door.indexOf('class="joint"')).toBeGreaterThan(
    door.lastIndexOf('class="cut" data-path="R"'),
  );
  expect(door).not.toContain("coupler");
  expect(door).not.toContain("tab");
});
it("the key bar uses the same geometry as a door bar and nested ANDs never stack", () => {
  for (const goal of [false, true]) {
    const svg = picture(parse("(P ∧ Q) ∧ R"), 184, 137, goal);
    const bars = [
      ...svg.matchAll(
        /class="joint-face"><rect[^>]*width="([\d.]+)" height="([\d.]+)"/g,
      ),
    ];
    expect(bars.length).toBeGreaterThanOrEqual(2);
    for (const [, width, height] of bars)
      expect(Number(width)).toBeGreaterThan(Number(height));
  }
});
it("provisional stage-001 policies keep formulas picture-free and light only the whole completed bar", () => {
  expect(TOUCH_TARGET_PX).toBeGreaterThanOrEqual(48);
  expect(LONG_PRESS_PICTURES).toBe(false);
  expect(AND_BAR_LIGHTS_ON).toBe("all-filled");
  expect(AND_BAR.thickness).toBe(0.18);
  expect(splitBar(false)).not.toContain('class="and-bar lit"');
  expect(splitBar(true)).toContain('class="and-bar lit"');
});
