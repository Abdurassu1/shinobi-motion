import { failure } from "./errorEngine";
import type { GestureId, GestureResult, LandmarkFrame, Point } from "./types";
const visible = (p: Point | undefined) =>
  !!p &&
  Number.isFinite(p.x + p.y) &&
  (p.visibility ?? 1) >= 0.6 &&
  p.x > 0.02 &&
  p.x < 0.98 &&
  p.y > 0.02 &&
  p.y < 0.98;
/** Seated framing is enough. Hips, elbows and resting hands may be off-screen. */
export function positioning(frame: LandmarkFrame): GestureResult {
  const p = frame.pose;
  if (!p.length)
    return failure(
      null,
      "NO_PERSON",
      "NO SHINOBI IN FRAME",
      "LOOK TOWARD THE CAMERA",
      [],
      "none",
      true,
    );
  if (![11, 12].every((i) => visible(p[i])))
    return failure(
      null,
      "BODY_HIDDEN",
      "SHOULDERS NOT VISIBLE",
      "KEEP BOTH SHOULDERS IN FRAME",
      [11, 12],
      "none",
      true,
    );
  const width = Math.abs(p[11].x - p[12].x);
  if (width < 0.12)
    return failure(
      null,
      "TOO_FAR",
      "YOU ARE TOO FAR AWAY",
      "MOVE A LITTLE CLOSER",
      [],
      "forward",
      true,
    );
  if (width > 0.72)
    return failure(
      null,
      "TOO_CLOSE",
      "YOU ARE TOO CLOSE",
      "MOVE BACK A LITTLE",
      [],
      "out",
      true,
    );
  if (!Number.isFinite(frame.aspect) || frame.aspect <= 0)
    return failure(
      null,
      "FRAME_INVALID",
      "WAITING FOR CAMERA",
      "KEEP THE CAMERA CONNECTED",
      [],
      "none",
      true,
    );
  return {
    gesture: null,
    confidence: Math.min(p[11].visibility ?? 1, p[12].visibility ?? 1),
    valid: true,
  };
}
/** Broad 2D target poses: no palm orientation, depth, straight elbows or symmetry. */
export function recognize(id: GestureId, frame: LandmarkFrame): GestureResult {
  const ready = positioning(frame);
  if (!ready.valid) return { ...ready, gesture: id };
  const p = frame.pose,
    width = Math.abs(p[11].x - p[12].x),
    sy = (p[11].y + p[12].y) / 2;
  const height = (i: number) => (p[i].y - sy) / (width * frame.aspect);
  const required =
    id === "RASENGAN" ? [16] : id === "CHIDORI" ? [15] : [15, 16];
  const missing = required.filter((i) => !visible(p[i]));
  if (missing.length)
    return failure(
      id,
      "HANDS_HIDDEN",
      "GESTURE HAND OUT OF FRAME",
      required.length === 2
        ? "SHOW BOTH HANDS"
        : `SHOW YOUR ${required[0] === 16 ? "RIGHT" : "LEFT"} HAND`,
      missing,
      "none",
      true,
    );
  const fail = (
    code: string,
    title: string,
    instruction: string,
    joints: number[],
    direction: "up" | "down" | "in" | "out" | "none" = "none",
  ) => failure(id, code, title, instruction, joints, direction);
  if (id === "RASENGAN" || id === "CHIDORI") {
    const active = required[0],
      rest = active === 16 ? 15 : 16;
    const side = active === 16 ? "RIGHT" : "LEFT",
      other = active === 16 ? "LEFT" : "RIGHT";
    if (height(active) > 0.55)
      return fail(
        "HAND_LOW",
        `${side} HAND STILL LOWERED`,
        `LIFT YOUR ${side} HAND TO CHEST LEVEL`,
        [active],
        "up",
      );
    if (visible(p[rest]) && height(rest) < 0.65)
      return fail(
        "REST_OTHER_HAND",
        `${other} HAND ALSO RAISED`,
        `RELAX YOUR ${other} ARM AT YOUR SIDE`,
        [rest],
        "down",
      );
  } else {
    const limit = id === "KATON" ? 1 : 0.35;
    const low = required.filter((i) => height(i) > limit);
    if (low.length)
      return fail(
        "HANDS_LOW",
        low.length === 2
          ? "BOTH HANDS STILL LOWERED"
          : `${low[0] === 15 ? "LEFT" : "RIGHT"} HAND STILL LOWERED`,
        id === "KATON"
          ? "BRING YOUR HANDS IN FRONT OF YOUR CHEST"
          : "LIFT BOTH HANDS TO SHOULDER LEVEL",
        low,
        "up",
      );
    const gap = Math.hypot(
      (p[15].x - p[16].x) / width,
      height(15) - height(16),
    );
    if (id === "KATON" && gap > 0.65)
      return fail(
        "HANDS_FAR",
        "HANDS STILL APART",
        "BRING YOUR HANDS TOGETHER",
        [15, 16],
        "in",
      );
    if (id === "SHADOW_CLONE" && Math.abs(p[15].x - p[16].x) / width < 0.85)
      return fail(
        "HANDS_CLOSE",
        "HANDS TOO CLOSE",
        "OPEN YOUR HANDS BESIDE YOUR SHOULDERS",
        [15, 16],
        "out",
      );
  }
  return {
    gesture: id,
    confidence: Math.min(
      ready.confidence,
      ...required.map((i) => p[i].visibility ?? 1),
    ),
    valid: true,
  };
}
