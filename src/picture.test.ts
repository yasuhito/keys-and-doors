import { it, expect } from "vitest";
import { card, picture } from "./picture";
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
it("marks each pair hole with its path so one hole can glow alone", () => {
  const door = picture(parse("P ∧ Q"), 184, 137, true);
  expect(door).toContain('class="glow" data-path="L"');
  expect(door).toContain('class="glow" data-path="R"');
});
