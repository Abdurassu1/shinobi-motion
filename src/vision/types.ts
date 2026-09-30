export type GestureId = "RASENGAN" | "CHIDORI" | "KATON" | "SHADOW_CLONE";
export type Point = { x: number; y: number; z: number; visibility?: number };
export type LandmarkFrame = {
  pose: Point[];
  world: Point[];
  hands: Point[][];
  aspect: number;
  timestamp: number;
};
export type Direction = "up" | "down" | "in" | "out" | "forward" | "none";
export type GestureError = {
  code: string;
  title: string;
  instruction: string;
  joints: number[];
  direction: Direction;
  positioning?: boolean;
};
export type GestureResult = {
  gesture: GestureId | null;
  confidence: number;
  valid: boolean;
  error?: GestureError;
};
