import { useState } from "react";
import { TrainingSession } from "./components/TrainingSession";
import { GesturePreview } from "./components/GesturePreview";
import { JUTSU } from "./game/jutsuData";
import { sound } from "./audio/soundManager";

export default function App() {
  const [mode, setMode] = useState<"home" | "camera" | "demo">("home"),
    [muted, setMuted] = useState(false),
    [session, setSession] = useState(0);
  const begin = (next: "camera" | "demo") => {
    void sound.unlock();
    setSession((s) => s + 1);
    setMode(next);
  };
  return (
    <div className="app-shell">
      <header className="header">
        <button
          className="brand"
          onClick={() => setMode("home")}
          aria-label="Shinobi Motion home"
        >
          <img src={`${import.meta.env.BASE_URL}mark.svg`} alt="" />
          <span>
            SHINOBI<span className="brand-light"> MOTION</span>
          </span>
        </button>
        <div className="header-center">
          <span className="header-line" /> MOTION IS YOUR ONLY INPUT
        </div>
        <div className="header-right">
          <span className="hackathon">
            ADMIT HACKATHON <i>/ 2026</i>
          </span>
          <button
            className="sound-button"
            onClick={() => {
              setMuted((m) => {
                sound.setMuted(!m);
                return !m;
              });
            }}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={muted}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M4 9h4l5-4v14l-5-4H4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              {muted ? (
                <path d="m17 9 5 6m0-6-5 6" stroke="currentColor" />
              ) : (
                <path
                  d="M17 8q5 4 0 8M19 5q8 7 0 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              )}
            </svg>
            <span>{muted ? "OFF" : "ON"}</span>
          </button>
        </div>
      </header>
      {mode === "home" ? (
        <main className="home">
          <div className="home-topline">
            <span>
              <i className="dot live" /> TRAINING SYSTEM ONLINE
            </span>
            <span>VOL. 01 / THE CHAKRA PROTOCOL</span>
          </div>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="small-cross">✳</span> CAMERA-POWERED JUTSU
                TRAINING
              </div>
              <h1>
                SHINOBI
                <br />
                <span>MOTION</span>
                <span className="title-dot">.</span>
              </h1>
              <p className="hero-description">
                Your body is the controller.
                <br />
                Your movement is the technique.
              </p>
              <p className="hero-subcopy">
                Master jutsu using nothing but your body.
                <br />
                Real-time tracking. Instant form correction.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => begin("camera")}>
                  BEGIN TRAINING <span>↗</span>
                </button>
                <button className="text-button" onClick={() => begin("demo")}>
                  TRY DEMO MODE <span>↗</span>
                </button>
              </div>
              <div className="camera-note">
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5h11v10H2zM13 8l5-3v10l-5-3"
                    fill="none"
                    stroke="currentColor"
                  />
                </svg>{" "}
                WEBCAM REQUIRED <span>·</span> NO CONTROLLERS <span>·</span>{" "}
                100% IN-BROWSER
              </div>
            </div>
            <div
              className="hero-visual"
              aria-label="Illustrated preview of body tracking"
            >
              <div className="scan-grid" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <span className="hero-japanese">忍</span>
              <div className="visual-top">
                <span>BODY TRACKING / PREVIEW</span>
                <span>01 — 04</span>
              </div>
              <div className="hero-figure-wrap">
                <GesturePreview hero />
              </div>
              <div className="scan-line" />
              <div className="callout callout-left">
                <span className="callout-line" />
                <small>PRECISION IN EVERY MOVE</small>
                <strong>FORM → FEEDBACK</strong>
              </div>
              <div className="callout callout-right">
                <span className="target-cross">＋</span>
                <small>CHAKRA CONTROL</small>
                <strong>IT STARTS WITH YOU.</strong>
              </div>
              <div className="visual-bottom">
                <span>
                  <i className="dot live" /> HUMAN INPUT. EXTRAORDINARY OUTPUT.
                </span>
                <span>図 01</span>
              </div>
            </div>
          </section>
          <section
            className="technique-strip"
            aria-label="Four techniques to master"
          >
            <div className="strip-intro">
              <span className="kicker">THE TRAINING</span>
              <strong>
                4 TECHNIQUES.
                <br />
                NO SHORTCUTS.
              </strong>
            </div>
            {JUTSU.map((j, i) => (
              <div className="technique-item" key={j.id}>
                <div>
                  <span className="kicker">
                    0{i + 1} / {j.element}
                  </span>
                  <span className="mini-glyph">{j.glyph}</span>
                </div>
                <h2>{j.name}</h2>
                <span className="technique-rule" />
              </div>
            ))}
          </section>
          <section className="home-footnote">
            <span className="cross-mark">＋</span>
            <p>
              The camera doesn't just recognize your jutsu.
              <br />
              <strong>It teaches you how to perform it correctly.</strong>
            </p>
            <div className="privacy">
              <span>PRIVATE BY DESIGN</span>
              <p>
                Camera frames stay on your device.
                <br />
                No recordings. No uploads. Just you.
              </p>
            </div>
          </section>
        </main>
      ) : (
        <TrainingSession
          key={session}
          demo={mode === "demo"}
          onExit={() => setMode("home")}
          onRetry={() => begin(mode)}
          onDemo={() => begin("demo")}
        />
      )}
      <footer className="footer">
        <span>
          SHINOBI MOTION <i>© 2026</i>
        </span>
        <span>
          BUILT FOR MOTION. <b>MADE FOR MASTERY.</b>
        </span>
        <span>忍道 / THE WAY FORWARD</span>
      </footer>
    </div>
  );
}
