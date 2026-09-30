import { JUTSU } from "./jutsuData";
import { positioning, recognize } from "../vision/gestureRules";
import { StableHold } from "../vision/gestureDetector";
import type { GestureResult, LandmarkFrame } from "../vision/types";
export type Phase = "calibration" | "training" | "activation" | "result";
export type Snapshot = {
  phase: Phase;
  index: number;
  hold: number;
  result: GestureResult;
  score: number;
  mistakes: number;
  mastered: number;
  accuracy: number;
  phaseTime: number;
  elapsed: number;
};
export const scoreFor = (mastered: number, mistakes: number) =>
  Math.max(0, mastered * 100 - mistakes * 10);
export class TrainingEngine {
  phase: Phase = "calibration";
  index = 0;
  mistakes = 0;
  mastered = 0;
  phaseStarted = 0;
  private started: number | null = null;
  private hold = new StableHold(600);
  private badSince: number | null = null;
  private charged = false;
  private goodSince: number | null = null;
  private validFrames = 0;
  private trackedFrames = 0;
  pause() {
    this.hold.reset();
    this.badSince = null;
    this.goodSince = null;
  }
  update(frame: LandmarkFrame): Snapshot {
    const now = frame.timestamp;
    if (this.started === null) {
      this.started = now;
      this.phaseStarted = now;
    }
    if (this.phase === "activation" && now - this.phaseStarted >= 2400) {
      if (this.index === 3) this.phase = "result";
      else {
        this.index++;
        this.phase = "training";
        this.hold.reset();
        this.badSince = null;
        this.charged = false;
      }
      this.phaseStarted = now;
    }
    let result =
      this.phase === "calibration"
        ? positioning(frame)
        : recognize(JUTSU[this.index].id, frame);
    let progress = this.phase === "activation" ? 1 : 0;
    if (this.phase === "calibration" || this.phase === "training") {
      progress = this.hold.update(result, now);
      if (
        this.phase === "training" &&
        now - this.phaseStarted > 3000 &&
        !result.error?.positioning
      ) {
        this.trackedFrames++;
        if (result.valid) this.validFrames++;
        if (result.valid) {
          this.goodSince ??= now;
          this.badSince = null;
          if (now - this.goodSince > 350) this.charged = false;
        } else {
          this.goodSince = null;
          this.badSince ??= now;
          if (now - this.badSince >= 1200 && !this.charged) {
            this.mistakes++;
            this.charged = true;
          }
        }
      } else if (result.error?.positioning) {
        this.badSince = null;
        this.goodSince = null;
      }
      if (progress === 1) {
        if (this.phase === "calibration") {
          this.phase = "training";
          this.hold = new StableHold(250);
          result = recognize(JUTSU[0].id, frame);
          progress = 0;
        } else {
          this.phase = "activation";
          this.mastered++;
        }
        this.phaseStarted = now;
      }
    }
    return {
      phase: this.phase,
      index: this.index,
      hold: progress,
      result,
      score: scoreFor(this.mastered, this.mistakes),
      mistakes: this.mistakes,
      mastered: this.mastered,
      accuracy: this.trackedFrames
        ? Math.round((100 * this.validFrames) / this.trackedFrames)
        : 100,
      phaseTime: now - this.phaseStarted,
      elapsed: now - this.started,
    };
  }
}
