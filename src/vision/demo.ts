import type { GestureId, LandmarkFrame, Point } from "./types";
/** Synthetic landmarks are only used by the explicitly labeled demo and tests. */
export function demoFrame(
  id: GestureId,
  timestamp: number,
  correct = true,
): LandmarkFrame {
  const pt = (x: number, y: number): Point => ({
    x,
    y,
    z: 0,
    visibility: 0.99,
  });
  const pose = Array.from({ length: 33 }, () => pt(0.5, 0.23));
  pose[0] = pt(0.5, 0.22);
  pose[11] = pt(0.64, 0.38);
  pose[12] = pt(0.36, 0.38);
  pose[13] = pt(0.69, 0.6);
  pose[14] = pt(0.31, 0.6);
  pose[15] = pt(0.72, 0.8);
  pose[16] = pt(0.28, 0.8);
  pose[23] = pt(0.59, 0.8);
  pose[24] = pt(0.41, 0.8);
  if (correct) {
    if (id === "RASENGAN") pose[16] = pt(0.37, 0.49);
    if (id === "CHIDORI") pose[15] = pt(0.63, 0.49);
    if (id === "KATON") {
      pose[15] = pt(0.54, 0.53);
      pose[16] = pt(0.46, 0.53);
    }
    if (id === "SHADOW_CLONE") {
      pose[15] = pt(0.72, 0.41);
      pose[16] = pt(0.28, 0.41);
    }
  }
  for (const [wrist, joints] of [
    [15, [17, 19, 21]],
    [16, [18, 20, 22]],
  ] as [number, number[]][])
    joints.forEach((i, n) => {
      pose[i] = pt(pose[wrist].x + 0.015 * (n - 1), pose[wrist].y - 0.045);
    });
  return { pose, world: [], hands: [], aspect: 4 / 3, timestamp };
}
