// Provisional minimum square touch target, in CSS pixels.
export const TOUCH_TARGET_PX = 48;
// Provisional bar-only hint timing and rotation, disabled for reduced motion.
export const AND_BAR_HINT = {
  firstMs: 2500,
  repeatMs: 6000,
  durationMs: 280,
  angleDeg: 6,
};
// Provisional long-press content: formula only, without miniature pictures.
export const LONG_PRESS_PICTURES = false;
// Provisional completion policy: no bar light until every hollow is filled.
export const AND_BAR_LIGHTS_ON = "all-filled";
// Provisional shared geometry for AND bars on keys and doors.
export const AND_BAR = {
  thickness: 0.18,
  minThickness: 4.5,
  gap: 0.5,
  minGap: 14,
  overlap: 2,
  groovesFrom: 9,
};
