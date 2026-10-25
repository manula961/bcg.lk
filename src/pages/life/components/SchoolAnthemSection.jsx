import React, { useRef, useState } from "react";

// Place Anthem.mp3 at public/audio/school-anthem.mp3.
const ANTHEM_SRC = "/audio/school-anthem.mp3";

export default function SchoolAnthemSection() {
  const audioRef = useRef(null);
  const [audioStatus, setAudioStatus] = useState("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Removed useEffect that called audio.play() on mount

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setAudioStatus("missing");
      }
    } else {
      audio.pause();
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  };

  return (
    <section
      className="life-detail-anthem"
      aria-labelledby="school-anthem-title"
    >
      <div className="life-detail-anthem-copy">
        <p className="life-detail-anthem-label">OUR IDENTITY</p>
        <h2 id="school-anthem-title">Our School, Our Anthem</h2>
        <p>
          Founded in 1918, Bandaranayake College, Gampaha has grown through
          generations of learning, service and school spirit. Our school anthem
          is a shared expression of the pride and unity of the Nayakenz
          community.
        </p>
      </div>
      <div className="life-detail-anthem-player">
        <span className="life-detail-anthem-note">SCHOOL ANTHEM</span>
        <div className="life-detail-anthem-disc" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="life-detail-anthem-controls">
          <strong>Bandaranayake College Anthem</strong>
          <audio
            ref={audioRef}
            src={ANTHEM_SRC}
            preload="metadata"
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration);
              setAudioStatus("ready");
            }}
            onTimeUpdate={(event) =>
              setCurrentTime(event.currentTarget.currentTime)
            }
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setAudioStatus("missing")}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={togglePlayback}
              disabled={audioStatus === "missing"}
              aria-label={isPlaying ? "Pause anthem" : "Play anthem"}
              style={{
                cursor: "pointer",
                border: "1px solid currentColor",
                borderRadius: "999px",
                padding: "8px",
                width: "38px",
                height: "38px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "#8B1E1E",
              }}
            >
              {isPlaying ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5.5a1 1 0 0 1 1.52-.85l10 6.5a1 1 0 0 1 0 1.7l-10 6.5A1 1 0 0 1 8 18.5z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.1"
              value={currentTime}
              aria-label="Anthem playback position"
              onChange={(event) => {
                if (audioRef.current)
                  audioRef.current.currentTime = Number(event.target.value);
              }}
              style={{ flex: 1, minWidth: 0, accentColor: "#8B1E1E" }}
            />
            <span style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          {audioStatus === "missing" && (
            <p role="status" className="life-detail-anthem-placeholder">
              Anthem recording could not be loaded. Check
              public/audio/school-anthem.mp3.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
