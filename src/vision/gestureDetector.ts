import type { GestureResult } from "./types";
/** Invalid frames and inference gaps reset the hold; wall-clock alone cannot trigger it. */
export class StableHold {
  private start: number | null = null;
  private previous: number | null = null;
  constructor(readonly duration = 250) {}
  reset() {
    this.start = null;
    this.previous = null;
  }
  update(result: GestureResult, timestamp: number) {
    if (!result.valid || result.confidence < 0.6) {
      this.reset();
      return 0;
    }
    if (
      this.previous !== null &&
      (timestamp - this.previous > 300 || timestamp <= this.previous)
    )
      this.reset();
    this.start ??= timestamp;
    this.previous = timestamp;
    return Math.min(1, (timestamp - this.start) / this.duration);
  }
}
