import type { LandmarkFrame, Point } from "../vision/types";
import type { Snapshot } from "../game/trainingState";
import { JUTSU } from "../game/jutsuData";
const links = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [15, 17],
  [15, 19],
  [15, 21],
  [16, 18],
  [16, 20],
  [16, 22],
];
/** Deterministic pseudo-random 0..1 so particles do not flicker between frames. */
const rnd = (n: number) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};
/** Clone spacing grows with shoulder width but always stays inside the frame. */
export const cloneGap = (shoulderDistance: number, canvasWidth: number) =>
  Math.min(shoulderDistance * 1.25, canvasWidth * 0.2);
export class HudRenderer {
  private points: Point[] = [];
  private cloneBuffer?: HTMLCanvasElement;
  draw(
    canvas: HTMLCanvasElement,
    frame: LandmarkFrame | null,
    state: Snapshot | null,
    now: number,
    demo: boolean,
    reduced: boolean,
    video?: HTMLVideoElement | null,
  ) {
    const c = canvas.getContext("2d");
    if (!c) return;
    const w = canvas.width,
      h = canvas.height;
    c.clearRect(0, 0, w, h);
    if (!frame?.pose.length || now - frame.timestamp > 500) {
      this.points = [];
      return;
    }
    this.points = frame.pose.map((p, i) => {
      const prev = this.points[i];
      return prev
        ? {
            ...p,
            x: prev.x + (p.x - prev.x) * 0.42,
            y: prev.y + (p.y - prev.y) * 0.42,
          }
        : p;
    });
    const xy = (i: number) => [
      (1 - this.points[i].x) * w,
      this.points[i].y * h,
    ];
    const good = state?.result.valid || state?.phase === "activation";
    const warn = state?.result.error?.joints ?? [];
    if (demo) {
      c.fillStyle = "#252a27";
      c.strokeStyle = "#343a35";
      c.lineWidth = 28;
      c.lineCap = "round";
      links.slice(0, 9).forEach(([a, b]) => {
        const [x, y] = xy(a),
          [xx, yy] = xy(b);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(xx, yy);
        c.stroke();
      });
      const [x, y] = xy(0);
      c.beginPath();
      c.ellipse(x, y + 5, 27, 35, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      [11, 12, 24, 23].forEach((i, n) => {
        const [x, y] = xy(i);
        if (!n) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.closePath();
      c.fill();
    }
    c.lineWidth = 1.4;
    links.forEach(([a, b]) => {
      if (
        (this.points[a].visibility ?? 1) < 0.5 ||
        (this.points[b].visibility ?? 1) < 0.5
      )
        return;
      const [x, y] = xy(a),
        [xx, yy] = xy(b);
      c.strokeStyle = good
        ? "#a7e9bd"
        : warn.includes(a) || warn.includes(b)
          ? "#ff693f"
          : "#deddd1";
      c.shadowColor = c.strokeStyle;
      c.shadowBlur = reduced ? 0 : 5;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(xx, yy);
      c.stroke();
    });
    [11, 12, 13, 14, 15, 16, 23, 24].forEach((i) => {
      if ((this.points[i].visibility ?? 1) < 0.5) return;
      const [x, y] = xy(i);
      c.fillStyle = good ? "#b5ffce" : warn.includes(i) ? "#ff693f" : "#e8e5de";
      c.beginPath();
      c.arc(x, y, i === 15 || i === 16 ? 4 : 2.5, 0, Math.PI * 2);
      c.fill();
    });
    c.shadowBlur = 0;
    if (!good && state?.result.error) {
      const dir = state.result.error.direction;
      warn
        .filter((i) => i === 15 || i === 16)
        .forEach((i) => {
          const [x, y] = xy(i);
          let dx = 0,
            dy = 0;
          if (dir === "up") dy = -38;
          if (dir === "down") dy = 38;
          if (dir === "in") dx = (w / 2 > x ? 1 : -1) * 38;
          if (dir === "out") dx = (w / 2 > x ? -1 : 1) * 38;
          if (dir === "forward") dy = -24;
          if (!dx && !dy) return;
          const len = Math.hypot(dx, dy),
            ux = dx / len,
            uy = dy / len;
          c.strokeStyle = "#ff693f";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x + ux * 13, y + uy * 13);
          c.lineTo(x + dx, y + dy);
          c.lineTo(x + dx - ux * 8 - uy * 5, y + dy - uy * 8 + ux * 5);
          c.moveTo(x + dx, y + dy);
          c.lineTo(x + dx - ux * 8 + uy * 5, y + dy - uy * 8 - ux * 5);
          c.stroke();
        });
    }
    if (state?.phase !== "activation") return;
    const t = state.phaseTime / 1000;
    if (t < 0.45) return;
    const id = JUTSU[state.index].id,
      color = JUTSU[state.index].color;
    let [x, y] = xy(id === "CHIDORI" ? 15 : 16);
    if (id === "KATON") {
      const [a, b] = xy(15);
      x = (x + a) / 2;
      y = (y + b) / 2;
    }
    const intensity = Math.min(1, (t - 0.45) * 4) * Math.min(1, (2.4 - t) * 2);
    c.save();
    c.globalAlpha = intensity;
    c.strokeStyle = color;
    c.fillStyle = color;
    if (reduced) {
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, 45, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      return;
    }
    if (id === "KATON") {
      this.katon(c, x, y, t, intensity);
      c.restore();
      return;
    }
    if (id === "SHADOW_CLONE") {
      if (video && video.readyState >= 2)
        this.videoClones(c, video, w, h, xy, t, intensity);
      else this.clones(c, xy, t, intensity);
      c.restore();
      return;
    }
    const radius = 80;
    const glow = c.createRadialGradient(x, y, 1, x, y, radius);
    glow.addColorStop(0, id === "RASENGAN" ? "#e4faff" : color);
    glow.addColorStop(0.2, color + "99");
    glow.addColorStop(1, color + "00");
    c.fillStyle = glow;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    for (let i = 0; i < 48; i++) {
      const a = i * 2.399 + t * 3,
        r = 20 + ((i * 17 + t * 60) % 85);
      const px = x + Math.cos(a) * r,
        py = y + Math.sin(a) * r * 0.65;
      c.fillStyle = i % 3 === 0 ? "#fff3da" : color;
      c.globalAlpha = intensity * (1 - r / 130);
      c.beginPath();
      c.arc(px, py, 1.7, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = intensity;
    c.lineWidth = 1.5;
    if (id === "RASENGAN")
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(x, y, 35 + i * 4, 13 + i * 5, t * 2 + i, 0, Math.PI * 2);
        c.stroke();
      }
    if (id === "CHIDORI")
      for (let j = 0; j < 8; j++) {
        c.beginPath();
        c.moveTo(x, y);
        for (let i = 1; i < 6; i++) {
          const a = (j * Math.PI) / 4;
          const r = i * 17;
          c.lineTo(
            x + Math.cos(a) * r + Math.sin(t * 35 + i * 8 + j) * 13,
            y + Math.sin(a) * r + Math.cos(t * 25 + i * 5) * 10,
          );
        }
        c.stroke();
      }
    c.restore();
  }

  /** Fireball: growing core, upward flame cone, shockwave ring and a warm screen tint. */
  private katon(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    t: number,
    k: number,
  ) {
    const w = c.canvas.width,
      h = c.canvas.height;
    const grow = Math.min(1, (t - 0.45) / 1.1),
      radius = 45 + 125 * (1 - Math.pow(1 - grow, 3)),
      cy = y - grow * h * 0.08;
    const tint = c.createRadialGradient(x, cy, radius * 0.5, x, cy, Math.max(w, h));
    tint.addColorStop(0, "rgba(255,90,30,0.30)");
    tint.addColorStop(1, "rgba(60,8,0,0.45)");
    c.globalAlpha = k * 0.7;
    c.fillStyle = tint;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 110; i++) {
      const life = (t * 1.1 + rnd(i)) % 1,
        angle = -Math.PI / 2 + (rnd(i + 200) - 0.5) * 2.3,
        dist = life * radius * 1.9,
        size = (1 - life) * (10 + 18 * rnd(i + 400));
      c.globalAlpha = k * (1 - life) * 0.85;
      c.fillStyle = life < 0.3 ? "#fff1c0" : life < 0.6 ? "#ffb020" : "#ff4d1c";
      c.beginPath();
      c.arc(
        x + Math.cos(angle) * dist + Math.sin(t * 9 + i) * 6,
        cy + Math.sin(angle) * dist,
        size,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    const flicker = 1 + Math.sin(t * 30) * 0.04;
    const core = c.createRadialGradient(x, cy, 1, x, cy, radius * flicker);
    core.addColorStop(0, "#fffbe6");
    core.addColorStop(0.25, "#ffc233");
    core.addColorStop(0.65, "rgba(255,80,20,0.65)");
    core.addColorStop(1, "rgba(255,60,0,0)");
    c.globalAlpha = k;
    c.fillStyle = core;
    c.beginPath();
    c.arc(x, cy, radius * flicker, 0, Math.PI * 2);
    c.fill();
    const wave = Math.min(1, (t - 0.45) / 0.9);
    if (wave < 1) {
      c.globalAlpha = k * (1 - wave);
      c.strokeStyle = "#ffd27a";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, cy, radius * (0.6 + wave * 1.6), 0, Math.PI * 2);
      c.stroke();
    }
    c.globalCompositeOperation = "source-over";
  }

  /** Shadow clone: four silhouettes appear one after another, each with a smoke puff. */
  private clones(
    c: CanvasRenderingContext2D,
    xy: (i: number) => number[],
    t: number,
    k: number,
  ) {
    // Keep every clone inside the frame, whatever the distance to the camera.
    const gap = cloneGap(Math.abs(xy(11)[0] - xy(12)[0]), c.canvas.width);
    // Shoulders, not hips: seated players may have no hip landmarks on screen.
    const torso = (xy(11)[1] + xy(12)[1]) / 2;
    [-1, 1, -2, 2].forEach((slot, n) => {
      const local = t - (0.45 + n * 0.22);
      if (local < 0) return;
      const dx = slot * gap;
      c.save();
      c.translate(dx, 0);
      c.globalAlpha = Math.min(1, local * 4) * k * 0.55;
      c.shadowColor = "#7fb4ff";
      c.shadowBlur = 18;
      c.fillStyle = c.strokeStyle = "#cfd8e6";
      c.lineWidth = 24;
      c.lineCap = "round";
      links.slice(0, 9).forEach(([a, b]) => {
        const [x1, y1] = xy(a),
          [x2, y2] = xy(b);
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(x2, y2);
        c.stroke();
      });
      const [hx, hy] = xy(0);
      c.beginPath();
      c.arc(hx, hy, 28, 0, Math.PI * 2);
      c.fill();
      c.restore();
      if (local < 0.7) {
        const sx = (xy(11)[0] + xy(12)[0]) / 2 + dx;
        for (let i = 0; i < 16; i++) {
          const angle = rnd(i + n * 50) * Math.PI * 2,
            reach = local * 130 * (0.4 + rnd(i + 90));
          c.globalAlpha = k * (1 - local / 0.7) * 0.5;
          c.fillStyle = "#dfe3da";
          c.beginPath();
          c.arc(
            sx + Math.cos(angle) * reach,
            torso + Math.sin(angle) * reach * 0.8,
            10 + local * 34,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
      }
    });
  }

  /**
   * Shadow clone: real video copies of the player. Each clone is the mirrored
   * live feed, tinted blue, fading in one after another beside the original —
   * so the player literally sees several versions of themselves.
   */
  private videoClones(
    c: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    w: number,
    h: number,
    xy: (i: number) => number[],
    t: number,
    k: number,
  ) {
    // Silhouettes stay as the spawning smoke backdrop behind the video copies.
    this.clones(c, xy, Math.min(t, 0.45), k * 0.9);
    const aspect = video.videoWidth / video.videoHeight || w / h;
    // Mirror and tint once per frame in an offscreen buffer, same size as the
    // letterboxed video inside this canvas.
    let dw = w,
      dh = h;
    if (aspect > w / h) dh = w / aspect;
    else dw = h * aspect;
    dw = Math.round(dw);
    dh = Math.round(dh);
    const buffer = (this.cloneBuffer ??= document.createElement("canvas"));
    if (buffer.width !== dw || buffer.height !== dh) {
      buffer.width = dw;
      buffer.height = dh;
    }
    const b = buffer.getContext("2d");
    if (!b) return;
    b.clearRect(0, 0, dw, dh);
    b.save();
    b.scale(-1, 1);
    b.drawImage(video, -dw, 0, dw, dh);
    b.restore();
    b.globalCompositeOperation = "source-atop";
    const tint = b.createLinearGradient(0, 0, 0, dh);
    tint.addColorStop(0, "rgba(150,196,255,0.42)");
    tint.addColorStop(1, "rgba(90,140,230,0.30)");
    b.fillStyle = tint;
    b.fillRect(0, 0, dw, dh);
    b.globalCompositeOperation = "source-over";
    const ox = (w - dw) / 2,
      oy = (h - dh) / 2,
      slot = cloneGap(Math.abs(xy(11)[0] - xy(12)[0]), w),
      [hx, hy] = xy(0);
    for (let n = 0; n < 4; n++) {
      const local = t - (0.45 + n * 0.22);
      if (local < 0) return;
      // Clones open outward: ±0.75 slot first, then ±1.75 slots.
      const dx = (n % 2 ? 1 : -1) * slot * (0.75 + (n >> 1));
      c.save();
      c.globalAlpha = Math.min(1, local * 2.4) * k * 0.9;
      c.drawImage(buffer, ox + dx, oy);
      c.restore();
      // Pulsing ring marks the head of each copy.
      c.save();
      c.globalAlpha = Math.min(1, local * 2.4) * k * 0.55;
      c.strokeStyle = "#7fb4ff";
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(hx + dx, hy, 26 + Math.sin(local * 9) * 2, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }
}
