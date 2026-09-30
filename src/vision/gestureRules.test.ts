import { describe, it, expect } from "vitest";
import { demoFrame } from "./demo";
import { positioning, recognize } from "./gestureRules";
import { StableHold } from "./gestureDetector";
import { cloneGap } from "../effects/renderer";
import { JUTSU } from "../game/jutsuData";
import { TrainingEngine, scoreFor } from "../game/trainingState";

describe("easy gesture rules", () => {
  it.each(JUTSU)("accepts the simple $id movement", ({ id }) =>
    expect(recognize(id, demoFrame(id, 0)).valid).toBe(true),
  );
  it.each(JUTSU)("does not activate $id from resting arms", ({ id }) => {
    const r = recognize(id, demoFrame(id, 0, false));
    expect(r.valid).toBe(false);
    expect(r.error?.direction).toBe("up");
  });
  it("keeps the four techniques distinct", () => {
    for (const a of JUTSU)
      for (const b of JUTSU)
        if (a.id !== b.id)
          expect(
            recognize(a.id, demoFrame(b.id, 0)).valid,
            `${b.id} as ${a.id}`,
          ).toBe(false);
  });
  it("supports seated framing with hips and elbows off-screen", () => {
    for (const { id } of JUTSU) {
      const f = demoFrame(id, 0);
      for (const i of [13, 14, 23, 24])
        f.pose[i] = { x: 0.5, y: 1.3, z: 0, visibility: 0 };
      expect(positioning(f).valid).toBe(true);
      expect(recognize(id, f).valid).toBe(true);
    }
  });
  it("ignores the resting hand outside frame but requires the active hand", () => {
    const f = demoFrame("RASENGAN", 0);
    f.pose[15].visibility = 0;
    expect(recognize("RASENGAN", f).valid).toBe(true);
    f.pose[16].visibility = 0;
    expect(recognize("RASENGAN", f).error?.code).toBe("HANDS_HIDDEN");
  });
  it("rejects missing people, hidden shoulders and invalid aspect", () => {
    const f = demoFrame("KATON", 0);
    expect(positioning({ ...f, pose: [] }).error?.code).toBe("NO_PERSON");
    expect(positioning({ ...f, aspect: 0 }).valid).toBe(false);
    f.pose[11].visibility = 0.1;
    expect(positioning(f).error?.code).toBe("BODY_HIDDEN");
  });
  it("keeps relaxed but usable framing limits", () => {
    const f = demoFrame("KATON", 0);
    f.pose[11].x = 0.54;
    f.pose[12].x = 0.46;
    expect(positioning(f).error?.code).toBe("TOO_FAR");
    f.pose[11].x = 0.9;
    f.pose[12].x = 0.1;
    expect(positioning(f).error?.code).toBe("TOO_CLOSE");
  });
  it("preserves recognition across scale and aspect changes", () => {
    for (const { id } of JUTSU) {
      const f = demoFrame(id, 0);
      f.pose.forEach((p) => {
        p.x = 0.5 + (p.x - 0.5) * 0.85;
        p.y = 0.5 + (p.y - 0.5) * 0.85;
      });
      expect(recognize(id, f).valid).toBe(true);
      const wide = demoFrame(id, 0);
      wide.aspect = 16 / 9;
      wide.pose.forEach((p) => (p.y = 0.38 + ((p.y - 0.38) * 4) / 3));
      expect(recognize(id, wide).valid).toBe(true);
    }
  });
  it("does not require hands model, depth or straight elbows", () => {
    for (const { id } of JUTSU) {
      const f = demoFrame(id, 0);
      f.world = [];
      f.hands = [];
      f.pose[13].visibility = 0;
      f.pose[14].visibility = 0;
      expect(recognize(id, f).valid).toBe(true);
    }
  });
  it("accepts slight asymmetry at shoulder level for clone", () => {
    const f = demoFrame("SHADOW_CLONE", 0);
    f.pose[15].y = 0.49;
    expect(recognize("SHADOW_CLONE", f).valid).toBe(true);
  });
  it("identifies the correct anatomical hand for correction", () => {
    const f = demoFrame("CHIDORI", 0, false);
    const r = recognize("CHIDORI", f);
    expect(r.error?.joints).toEqual([15]);
    expect(r.error?.instruction).toContain("LEFT");
  });
  it("keeps clone copies inside the frame at any distance", () => {
    expect(cloneGap(200, 960)).toBe(192);
    expect(cloneGap(700, 960)).toBe(192);
    expect(cloneGap(0, 960)).toBe(0);
  });
  it("gives inward and outward correction for the two-hand techniques", () => {
    const f = demoFrame("SHADOW_CLONE", 0);
    expect(recognize("KATON", f).error?.direction).toBe("in");
    const near = demoFrame("KATON", 0);
    near.pose[15].y = 0.4;
    near.pose[16].y = 0.4;
    expect(recognize("SHADOW_CLONE", near).error?.direction).toBe("out");
  });
});
describe("brief, genuine temporal confirmation", () => {
  const valid = { gesture: null, valid: true, confidence: 0.9 };
  it("activates at 250ms but never from one frame", () => {
    const h = new StableHold();
    expect(h.update(valid, 0)).toBe(0);
    for (let t = 50; t < 250; t += 50)
      expect(h.update(valid, t)).toBeLessThan(1);
    expect(h.update(valid, 250)).toBe(1);
  });
  it("resets on bad, weak, stale and out-of-order observations", () => {
    for (const issue of ["bad", "confidence", "gap", "reverse"]) {
      const h = new StableHold();
      h.update(valid, 0);
      h.update(valid, 100);
      const r =
        issue === "bad"
          ? { ...valid, valid: false }
          : issue === "confidence"
            ? { ...valid, confidence: 0.4 }
            : valid;
      expect(
        h.update(r, issue === "gap" ? 600 : issue === "reverse" ? 50 : 200),
      ).toBe(0);
    }
  });
});
describe("training progression", () => {
  it("completes all four easy gestures with error and recovery", () => {
    const e = new TrainingEngine();
    let last;
    const seen = new Set();
    for (let t = 0; t < 50000; t += 50) {
      last = e.update(
        demoFrame(
          JUTSU[e.index].id,
          t,
          e.phase === "calibration" ||
            e.phase === "activation" ||
            t - e.phaseStarted > 5600,
        ),
      );
      if (last.phase === "activation") seen.add(last.index);
      if (last.phase === "result") break;
    }
    expect(seen.size).toBe(4);
    expect(last?.phase).toBe("result");
    expect(last?.score).toBe(360);
    expect(last?.mistakes).toBe(4);
  });
  it("charges one sustained error, not every frame", () => {
    const e = new TrainingEngine();
    let last;
    for (let t = 0; t < 20000; t += 50)
      last = e.update(demoFrame("RASENGAN", t, false));
    expect(last?.mistakes).toBe(1);
    expect(last?.mastered).toBe(0);
  });
  it("does not charge for tracking loss", () => {
    const e = new TrainingEngine();
    for (let t = 0; t <= 600; t += 50)
      e.update(demoFrame("RASENGAN", t, false));
    let last;
    for (let t = 650; t < 10000; t += 50)
      last = e.update({ ...demoFrame("RASENGAN", t), pose: [] });
    expect(last?.mistakes).toBe(0);
    expect(last?.mastered).toBe(0);
  });
  it("calibrates in 600ms and prevents a repeated pose completing the next stage", () => {
    const e = new TrainingEngine();
    let last;
    for (let t = 0; t <= 5000; t += 50)
      last = e.update(demoFrame("RASENGAN", t));
    expect(last?.mastered).toBe(1);
    expect(last?.index).toBe(1);
    expect(last?.phase).toBe("training");
  });
  it("clamps score at zero", () => {
    expect(scoreFor(0, 1)).toBe(0);
    expect(scoreFor(4, 3)).toBe(370);
  });
});
