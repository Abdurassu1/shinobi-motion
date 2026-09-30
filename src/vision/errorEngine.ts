import type {
  Direction,
  GestureError,
  GestureId,
  GestureResult,
} from "./types";
export function failure(
  gesture: GestureId | null,
  code: string,
  title: string,
  instruction: string,
  joints: number[] = [],
  direction: Direction = "none",
  positioning = false,
): GestureResult {
  const error: GestureError = {
    code,
    title,
    instruction,
    joints,
    direction,
    positioning,
  };
  return { gesture, confidence: 0, valid: false, error };
}
