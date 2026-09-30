import type { GestureId } from "../vision/types";
/** Drop your own files into public/audio/ with these names; missing files fall back to the built-in synth. */
const FILES: Record<GestureId, string> = {
  RASENGAN: "audio/rasengan.mp3",
  CHIDORI: "audio/chidori.mp3",
  KATON: "audio/katon.mp3",
  SHADOW_CLONE: "audio/clone.m4a",
};
class SoundManager {
  private context?: AudioContext;
  private files = new Map<GestureId, HTMLAudioElement>();
  muted = false;
  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Visual feedback remains available if audio is blocked. */
    }
    // Safari/iOS unlock each element with a user gesture; a later play()
    // from the game loop is then allowed. Chrome needs none of this.
    await Promise.all(
      (Object.keys(FILES) as GestureId[]).map(async (id) => {
        const audio =
          this.files.get(id) ?? new Audio(import.meta.env.BASE_URL + FILES[id]);
        this.files.set(id, audio);
        audio.preload = "auto";
        audio.volume = 0;
        try {
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.85;
        } catch {
          /* This technique falls back to the synth instead. */
        }
      }),
    );
  }
  play(id: GestureId) {
    if (this.muted) return;
    const audio =
      this.files.get(id) ?? new Audio(import.meta.env.BASE_URL + FILES[id]);
    this.files.set(id, audio);
    audio.volume = 0.85;
    try {
      audio.currentTime = 0;
    } catch {
      /* Metadata may not be ready yet; play() starts from zero anyway. */
    }
    audio.play().catch(() => this.synth(id));
  }
  private synth(id: GestureId) {
    const ctx = this.context;
    if (!ctx || this.muted || ctx.state !== "running") return;
    const t = ctx.currentTime,
      gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = id === "CHIDORI" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(
      id === "KATON" ? 75 : id === "SHADOW_CLONE" ? 140 : 220,
      t,
    );
    osc.frequency.exponentialRampToValueAtTime(
      id === "RASENGAN" ? 680 : 45,
      t + 1.3,
    );
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 1.5);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate),
      samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value =
      id === "CHIDORI" ? 3200 : id === "KATON" ? 450 : 900;
    filter.Q.value = 0.8;
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + 1.4);
    // Original ascending confirmation chime.
    [523, 659, 784].forEach((hz, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.055, t + 1.4 + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.8 + i * 0.1);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + 1.4 + i * 0.1);
      o.stop(t + 1.9 + i * 0.1);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
    };
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.context) {
      if (value) void this.context.suspend();
      else void this.context.resume();
    }
  }
}
export const sound = new SoundManager();
