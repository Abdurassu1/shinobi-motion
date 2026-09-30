import { mkdir, cp, stat, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/vision/models/", root), { recursive: true });
await cp(
  new URL("node_modules/@mediapipe/tasks-vision/wasm/", root),
  new URL("public/vision/wasm/", root),
  { recursive: true },
);
const models = {
  "pose_landmarker_lite.task":
    "pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
};
for (const [name, remote] of Object.entries(models)) {
  const path = new URL(`public/vision/models/${name}`, root);
  if (
    await stat(path)
      .then((s) => s.size > 1_000_000)
      .catch(() => false)
  )
    continue;
  console.log(`Downloading official MediaPipe model: ${name}`);
  const response = await fetch(
    `https://storage.googleapis.com/mediapipe-models/${remote}`,
    { signal: AbortSignal.timeout(120_000) },
  );
  if (!response.ok)
    throw new Error(
      `Model download failed: ${response.status}. Run npm run setup:vision to retry.`,
    );
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length < 1_000_000) throw new Error(`Incomplete model: ${name}`);
  const temporary = fileURLToPath(path) + ".download";
  try {
    await writeFile(temporary, data);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
console.log("Vision assets ready. Models, WASM and fonts are served locally.");
