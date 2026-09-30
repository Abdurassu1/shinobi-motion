import { useEffect, useRef, useState } from "react";
import { TrainingEngine, type Snapshot } from "../game/trainingState";
import { JUTSU } from "../game/jutsuData";
import { CameraError, openCamera, stopCamera } from "../vision/camera";
import type { LandmarkFrame } from "../vision/types";
import { demoFrame } from "../vision/demo";
import { failure } from "../vision/errorEngine";
import { HudRenderer } from "../effects/renderer";
import { GesturePreview } from "./GesturePreview";
import { sound } from "../audio/soundManager";

export function TrainingSession({
  demo,
  onExit,
  onRetry,
  onDemo,
}: {
  demo: boolean;
  onExit: () => void;
  onRetry: () => void;
  onDemo: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(
      demo ? "STARTING DEMONSTRATION" : "CAMERA ACCESS REQUIRED",
    );
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [metrics, setMetrics] = useState({ fps: 0, count: 0, aspect: 4 / 3 }),
    [paused, setPaused] = useState(false);
  const lastSound = useRef(-1);
  useEffect(() => {
    if (state?.phase === "activation" && lastSound.current !== state.index) {
      lastSound.current = state.index;
      sound.play(JUTSU[state.index].id);
    }
  }, [state?.phase, state?.index]);
  useEffect(() => {
    const abort = new AbortController(),
      engine = new TrainingEngine(),
      renderer = new HudRenderer();
    let stream: MediaStream | undefined,
      vision:
        | Awaited<ReturnType<typeof import("../vision/landmarks").createVision>>
        | undefined;
    let raf = 0,
      frame: LandmarkFrame | null = null,
      snapshot: Snapshot | null = null,
      lastInference = -Infinity,
      lastVideo = -1,
      lastUpdate = 0,
      lastFresh = performance.now();
    let frames = 0,
      fpsAt = performance.now(),
      fps = 0,
      finished = false;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const input = document.createElement("canvas");
    const ctx = input.getContext("2d");
    const cleanup = () => {
      cancelAnimationFrame(raf);
      stopCamera(stream);
      vision?.close();
      vision = undefined;
      if (video.current) video.current.srcObject = null;
    };
    const fail = (e: unknown) => {
      if (abort.signal.aborted) return;
      abort.abort();
      cleanup();
      setError(
        e instanceof CameraError
          ? { title: e.title, message: e.message }
          : {
              title: "VISION ENGINE UNAVAILABLE",
              message:
                "The tracking engine could not start or stopped responding. Reload the page or try current Chrome or Edge. You can also explore demo mode.",
            },
      );
    };
    const visibility = () => {
      engine.pause();
      lastFresh = performance.now();
      lastInference = -Infinity;
      setPaused(document.hidden);
    };
    document.addEventListener("visibilitychange", visibility);
    const loop = (now: number) => {
      if (abort.signal.aborted || finished) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      try {
        const v = video.current;
        if (
          now - lastInference >= 50 &&
          (demo || (v && v.readyState >= 2 && v.currentTime !== lastVideo))
        ) {
          lastInference = now;
          lastFresh = now;
          if (demo) {
            const age = now - engine.phaseStarted;
            frame = demoFrame(
              JUTSU[engine.index].id,
              now,
              engine.phase === "calibration" ||
                engine.phase === "activation" ||
                age > 5600,
            );
          } else if (v && vision && ctx) {
            lastVideo = v.currentTime;
            input.width = 640;
            input.height = Math.round((640 * v.videoHeight) / v.videoWidth);
            ctx.drawImage(v, 0, 0, input.width, input.height);
            frame = vision.detect(input, now);
          }
          if (frame) {
            snapshot = engine.update(frame);
            frames++;
          }
          if (now - fpsAt >= 1000) {
            fps = Math.round((frames * 1000) / (now - fpsAt));
            frames = 0;
            fpsAt = now;
          }
        }
        if (!demo && now - lastFresh > 500) {
          engine.pause();
          frame = null;
          fps = 0;
          if (snapshot)
            snapshot = {
              ...snapshot,
              hold: 0,
              result: failure(
                null,
                "STREAM_STALLED",
                "WAITING FOR CAMERA FRAMES",
                "KEEP THE CAMERA CONNECTED",
                [],
                "none",
                true,
              ),
            };
        }
        if (!demo && now - lastFresh > 8000)
          throw new CameraError(
            "CAMERA STREAM INTERRUPTED",
            "Your camera stopped sending frames. Check the connection and try again.",
          );
        if (canvas.current)
          renderer.draw(
            canvas.current,
            frame,
            snapshot,
            now,
            demo,
            reduced,
            demo ? null : video.current,
          );
        if (
          snapshot &&
          (now - lastUpdate > 90 || snapshot.phase === "result")
        ) {
          setState({ ...snapshot });
          setMetrics({
            fps,
            count:
              frame?.pose.filter((p) => (p.visibility ?? 1) >= 0.6).length ?? 0,
            aspect: frame?.aspect ?? 4 / 3,
          });
          lastUpdate = now;
          if (snapshot.phase === "result") {
            finished = true;
            cleanup();
          }
        }
      } catch (e) {
        fail(e);
      }
    };
    const timeout = window.setTimeout(() => {
      fail(
        new CameraError(
          "SETUP IS TAKING TOO LONG",
          "Check camera permission and try again. Models may take a moment on slower devices.",
        ),
      );
    }, 90000);
    async function start() {
      try {
        if (!demo) {
          stream = await openCamera();
          if (abort.signal.aborted) {
            stopCamera(stream);
            return;
          }
          const v = video.current!;
          v.srcObject = stream;
          await v.play();
          if (abort.signal.aborted) {
            stopCamera(stream);
            return;
          }
          setLoading("LOADING VISION ENGINE");
          const { createVision } = await import("../vision/landmarks");
          if (abort.signal.aborted) return;
          vision = await createVision(abort.signal);
          if (abort.signal.aborted) {
            vision.close();
            vision = undefined;
            return;
          }
          stream
            .getVideoTracks()[0]
            .addEventListener(
              "ended",
              () =>
                fail(
                  new CameraError(
                    "CAMERA DISCONNECTED",
                    "Reconnect your camera and try again.",
                  ),
                ),
              { signal: abort.signal },
            );
        }
        clearTimeout(timeout);
        if (abort.signal.aborted) return;
        setLoading("");
        lastFresh = performance.now();
        raf = requestAnimationFrame(loop);
      } catch (e) {
        clearTimeout(timeout);
        fail(e);
      }
    }
    void start();
    return () => {
      abort.abort();
      clearTimeout(timeout);
      cleanup();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [demo]);

  const jutsu = JUTSU[state?.index ?? 0],
    calibrating = !state || state.phase === "calibration",
    active = state?.phase === "activation";
  if (state?.phase === "result") {
    const rank =
      state.mistakes === 0 ? "JONIN" : state.mistakes <= 4 ? "CHUNIN" : "GENIN";
    return (
      <main className="results">
        <div className="eyebrow">
          <span className="status-dot" />{" "}
          {demo ? "DEMO RUN COMPLETE" : "ALL TECHNIQUES VERIFIED"}
        </div>
        <div className="result-heading">
          <div>
            <p className="kicker">TRAINING REPORT / 001</p>
            <h1>
              MISSION
              <br />
              <span>COMPLETE.</span>
            </h1>
          </div>
          <div className="rank-seal">
            <span>認定</span>
            <strong>{rank}</strong>
            <small>SHINOBI RANK</small>
          </div>
        </div>
        <p className="result-copy">
          Four techniques. One step closer to mastery.
        </p>
        <div className="result-stats">
          <div>
            <small>JUTSU MASTERED</small>
            <strong>
              04<span> / 04</span>
            </strong>
          </div>
          <div>
            <small>FORM ACCURACY</small>
            <strong>
              {state.accuracy}
              <span>%</span>
            </strong>
          </div>
          <div>
            <small>FORM MISTAKES</small>
            <strong>{String(state.mistakes).padStart(2, "0")}</strong>
          </div>
          <div>
            <small>TOTAL SCORE</small>
            <strong className="accent">{state.score}</strong>
          </div>
        </div>
        <div className="mastered-list">
          {JUTSU.map((j, i) => (
            <div key={j.id}>
              <span>0{i + 1}</span>
              <strong>{j.name}</strong>
              <span className="success">✓ MASTERED</span>
            </div>
          ))}
        </div>
        <div className="result-actions">
          <button className="primary" onClick={onRetry}>
            TRAIN AGAIN <span>↗</span>
          </button>
          <button className="text-button" onClick={onExit}>
            RETURN TO BASE <span>↗</span>
          </button>
        </div>
        <p className="fineprint">
          {demo
            ? "SIMULATED RESULTS · Demonstration landmarks, not camera recognition."
            : "Accuracy = valid tracked frames / evaluated frames after a 3-second learning grace period."}{" "}
          Score: +100 per technique, −10 per sustained form error.
        </p>
      </main>
    );
  }
  return (
    <main className="training">
      <div className="session-heading">
        <div>
          <span className="kicker">
            {demo
              ? "DEMONSTRATION / SIMULATED LANDMARKS"
              : "LIVE TRAINING / LOCAL PROCESSING"}
          </span>
          <h1>
            {calibrating ? "Find your position." : "Control your chakra."}
          </h1>
        </div>
        <button className="text-button" onClick={onExit}>
          EXIT TRAINING ↗
        </button>
      </div>
      {demo && (
        <div className="demo-banner">
          <b>DEMO MODE</b>
          <span>
            Scripted landmarks demonstrate an error, correction and activation.
            Camera is off.
          </span>
          <button onClick={onRetry}>REPLAY ↻</button>
        </div>
      )}
      <div className="training-grid">
        <section
          className={`camera-panel ${active ? "activated" : ""}`}
          aria-label="Camera and tracking feedback"
        >
          <div className="viewport" style={{ aspectRatio: metrics.aspect }}>
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              aria-label="Mirrored webcam feed"
              aria-hidden={demo}
              style={demo ? { display: "none" } : undefined}
            />
            <div className="camera-grid" />
            {calibrating && !loading && !error && (
              <div className="body-guide" aria-hidden="true">
                <span />
                <i />
              </div>
            )}
            <canvas
              ref={canvas}
              width={Math.round(metrics.aspect >= 1 ? 960 : 960 * metrics.aspect)}
              height={Math.round(metrics.aspect >= 1 ? 960 / metrics.aspect : 960)}
              className="skeleton-canvas"
              aria-label={
                demo
                  ? "Simulated demonstration skeleton"
                  : "Real camera landmark overlay"
              }
            />
            <div className="viewport-top">
              <span>
                CAM 01 <i className={loading || error ? "dot" : "dot live"} />
                {demo
                  ? "SIMULATED"
                  : error
                    ? "OFFLINE"
                    : loading
                      ? "STANDBY"
                      : "LIVE FEED"}
              </span>
              <span>{demo ? "REFERENCE INPUT" : "MIRRORED"}</span>
            </div>
            <div className="viewport-corner tl" />
            <div className="viewport-corner tr" />
            <div className="viewport-corner bl" />
            <div className="viewport-corner br" />
            {!loading && !error && !active && (
              <div className="viewport-bottom">
                <span>
                  ＋ {calibrating ? "ALIGN UPPER BODY" : "LANDMARK TRACKING"}
                </span>
                <span>{metrics.count} / 33 POINTS</span>
              </div>
            )}
            {loading && !error && (
              <div className="camera-message" role="status">
                <div className="loader" />
                <span className="kicker">INITIALIZING SYSTEM</span>
                <h2>{loading}</h2>
                <p>
                  {loading.includes("ACCESS")
                    ? "Allow your browser to use the webcam."
                    : "Preparing local motion detection."}
                </p>
                <button className="text-button" onClick={onDemo}>
                  TRY DEMO MODE ↗
                </button>
              </div>
            )}
            {error && (
              <div className="camera-message" role="alert">
                <span className="error-symbol">!</span>
                <h2>{error.title}</h2>
                <p>{error.message}</p>
                <button className="primary" onClick={onRetry}>
                  TRY AGAIN ↗
                </button>
                <button className="text-button" onClick={onDemo}>
                  TRY DEMO MODE ↗
                </button>
              </div>
            )}
            {paused && (
              <div className="camera-message">
                <h2>TRAINING PAUSED</h2>
                <p>Return to this tab to resume tracking.</p>
              </div>
            )}
            {active && (
              <div
                className={`activation-text effect-${jutsu.id.toLowerCase()}`}
                key={state.index}
              >
                <span className="kicker">
                  {state.phaseTime < 450
                    ? "FORM LOCKED"
                    : state.phaseTime < 850
                      ? "CHAKRA DETECTED"
                      : "JUTSU ACTIVATED"}
                </span>
                {state.phaseTime > 650 && <h2>{jutsu.name}</h2>}
                {state.phaseTime > 1400 && (
                  <p>
                    +100 <span>JUTSU MASTERED</span>
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="telemetry">
            <span>
              <i className={`dot ${metrics.count ? "live" : ""}`} />
              {metrics.count ? "TRACKING ACTIVE" : "SEARCHING FOR POSE"}
            </span>
            <span>{String(metrics.fps).padStart(2, "0")} FPS</span>
            <span>{demo ? "SIMULATION" : "ON-DEVICE VISION"}</span>
          </div>
          <div
            className={`feedback ${state?.result.valid ? "correct" : ""}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="feedback-icon">
              {state?.result.valid
                ? "✓"
                : {
                    up: "↑",
                    down: "↓",
                    in: "→←",
                    out: "←→",
                    forward: "◎",
                    none: "＋",
                  }[state?.result.error?.direction ?? "none"]}
            </div>
            <div>
              <span className="kicker">
                {error
                  ? "SYSTEM OFFLINE"
                  : loading
                    ? "SYSTEM STATUS"
                    : active
                      ? "FORM VERIFIED"
                      : state?.result.valid
                        ? "FORM ALIGNED · KEEP STILL"
                        : calibrating
                          ? "CALIBRATION"
                          : state?.result.error?.positioning
                            ? "POSITION CHECK"
                            : "FORM ERROR"}
              </span>
              <h2>
                {error
                  ? "Retry camera access or explore demo mode"
                  : loading
                    ? "Preparing your training space"
                    : active
                      ? "Technique mastered. Prepare for the next."
                      : state?.result.valid
                        ? "HOLD YOUR POSITION"
                        : (state?.result.error?.instruction ??
                          "Sit or stand comfortably in front of the camera")}
              </h2>
              <p>
                {error
                  ? "No camera frames are being processed."
                  : state?.result.valid
                    ? "Steady movements build stronger techniques."
                    : (state?.result.error?.title ??
                      "Sit or stand comfortably with your shoulders visible.")}
              </p>
            </div>
          </div>
        </section>
        <aside className="technique-panel">
          <div className="technique-top">
            <span className="kicker">
              {calibrating
                ? "SYSTEM CALIBRATION"
                : `JUTSU 0${(state?.index ?? 0) + 1} / 04`}
            </span>
            <span className="japanese">
              {calibrating ? "準備" : jutsu.glyph}
            </span>
          </div>
          <p className="element">
            {calibrating ? "BEFORE WE BEGIN" : jutsu.element}
          </p>
          <h2>{calibrating ? "Get in frame" : jutsu.name}</h2>
          <p className="technique-caption">
            {calibrating ? "Give your movement a little space." : jutsu.caption}
          </p>
          <div className="reference">
            <span className="reference-label">
              {calibrating ? "POSITION REFERENCE" : "GESTURE REFERENCE"}
            </span>
            <GesturePreview id={jutsu.id} />
            <span className="reference-ground" />
          </div>
          <ol className="instructions">
            {(calibrating
              ? [
                  "Sit or stand comfortably in front of the lens.",
                  "Keep both shoulders in a well-lit frame.",
                  "Relax your arms. Small movements are enough.",
                ]
              : jutsu.steps
            ).map((s, i) => (
              <li key={s}>
                <span>0{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="hold-info">
            <span>{calibrating ? "CALIBRATION" : "CHAKRA STABILITY"}</span>
            <b>{Math.round((state?.hold ?? 0) * 100)}%</b>
          </div>
          <div
            className="hold-track"
            role="progressbar"
            aria-label="Gesture stability"
            aria-valuenow={Math.round((state?.hold ?? 0) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${(state?.hold ?? 0) * 100}%` }} />
          </div>
          <p className="fineprint">
            {calibrating
              ? "A clear view of your shoulders for 0.6 seconds."
              : "One easy movement. Just a 0.25-second pause."}{" "}
            Progress is automatic.
          </p>
        </aside>
      </div>
      <div className="training-bottom">
        <nav className="progress" aria-label="Training progress">
          {JUTSU.map((j, i) => (
            <div
              key={j.id}
              className={
                i < (state?.mastered ?? 0)
                  ? "complete"
                  : i === (state?.index ?? 0)
                    ? "current"
                    : ""
              }
            >
              <span>{i < (state?.mastered ?? 0) ? "✓" : `0${i + 1}`}</span>
              <b>{j.name}</b>
              <i />
            </div>
          ))}
        </nav>
        <div className="score">
          <span>SESSION SCORE</span>
          <strong>{String(state?.score ?? 0).padStart(3, "0")}</strong>
        </div>
      </div>
    </main>
  );
}
