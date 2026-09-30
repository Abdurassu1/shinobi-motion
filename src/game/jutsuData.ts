import type { GestureId } from "../vision/types";
export const JUTSU: {
  id: GestureId;
  name: string;
  element: string;
  glyph: string;
  caption: string;
  steps: string[];
  color: string;
}[] = [
  {
    id: "RASENGAN",
    name: "Rasengan",
    element: "WIND RELEASE",
    glyph: "風",
    caption: "Shape the energy. Find your center.",
    steps: [
      "Lift your right hand to chest level.",
      "Let your left arm rest by your side.",
      "A brief pause is enough. Stay relaxed.",
    ],
    color: "#58a6ff",
  },
  {
    id: "CHIDORI",
    name: "Chidori",
    element: "LIGHTNING RELEASE",
    glyph: "雷",
    caption: "One precise motion. Unleash the storm.",
    steps: [
      "Lift your left hand to chest level.",
      "Let your right arm rest by your side.",
      "Keep your elbow comfortably bent.",
    ],
    color: "#a8dcff",
  },
  {
    id: "KATON",
    name: "Katon",
    element: "FIRE RELEASE",
    glyph: "火",
    caption: "Bring the heat. Control the flame.",
    steps: [
      "Bring your hands together at chest level.",
      "No finger seal or palm rotation needed.",
      "Touch lightly, or leave a small gap.",
    ],
    color: "#ff4d1c",
  },
  {
    id: "SHADOW_CLONE",
    name: "Shadow clone",
    element: "CLONE TECHNIQUE",
    glyph: "影",
    caption: "One presence. Infinite possibility.",
    steps: [
      "Lift both hands beside your shoulders.",
      "Keep your elbows bent and relaxed.",
      "No need to reach above your head.",
    ],
    color: "#e8e5de",
  },
];
