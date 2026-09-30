import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { LandmarkFrame } from "./types";
export async function createVision(signal: AbortSignal) {
  const base = new URL(import.meta.env.BASE_URL + "vision/", location.origin)
    .href;
  const files = await FilesetResolver.forVisionTasks(base + "wasm");
  let pose: PoseLandmarker | undefined;
  try {
    pose = await PoseLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: base + "models/pose_landmarker_lite.task",
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.6,
      minPosePresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    const detector = pose;
    return {
      detect(source: HTMLCanvasElement, timestamp: number): LandmarkFrame {
        const body = detector.detectForVideo(source, timestamp);
        return {
          pose: body.landmarks[0] ?? [],
          world: body.worldLandmarks[0] ?? [],
          hands: [],
          aspect: source.width / source.height,
          timestamp,
        };
      },
      close() {
        detector.close();
      },
    };
  } catch (error) {
    pose?.close();
    throw error;
  }
}
