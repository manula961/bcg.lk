import { lockPageScroll } from "../../../navigation/clientNavigation";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ANTHEM_SRC = "/audio/school-anthem.mp3";

// Sinhala transcribed from the supplied school song sheet.
// English and Tamil are meaning-based translations, not official singable lyrics.
const LYRICS = {
  si: `නමදිමු බණ්ඩාරනායක විදුහල් මාතා //
බැතිනි - නිතිනි - පුදමු - මව්නි
ඔබ වෙත ගී මල් මාලා
ගයමු සැමදා - ඔබට ගුණ හද බැති පාලා

ඔබ පද සෙවනේ
අප හද සැනහේ
ජය බිම අපගේ
ඔබමය මවුනේ

ඔබ සිරියෙන් සැමදා - දිනේවා
යස - ගොස - රැස - විහිදා
බැතිනි - නිතිනි - පුදමු මව්නි
ඔබ වෙත ගී මල් මාලා
ගයමු - සැමදා - ඔබ ගුණ හද බැති පාලා`,
  en: `Update needed`,
  ta: `Update needed`,
};

const LANGUAGES = [
  { id: "si", label: "සිංහල", lang: "si" },
  { id: "en", label: "English", lang: "en" },
  { id: "ta", label: "தமிழ்", lang: "ta" },
];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function SchoolAnthemSection() {
  const audioRef = useRef(null);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const lyricsBodyRef = useRef(null);
  const triggerRef = useRef(null);
  const [audioStatus, setAudioStatus] = useState("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [language, setLanguage] = useState("si");

  const syncDuration = (audio) => {
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
      setAudioStatus("ready");
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      syncDuration(audio);
    }
  }, []);

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

  useEffect(() => {
    if (!lyricsOpen) return undefined;
    const unlock = lockPageScroll("lyrics");
    modalRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLyricsOpen(false);
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusables = Array.from(
        modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]',
        ),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [lyricsOpen]);

  // Isolate this portal from the site's Lenis wheel handling.
  useEffect(() => {
    if (!lyricsOpen) return undefined;
    const overlay = overlayRef.current;
    const scroller = lyricsBodyRef.current;
    if (!overlay || !scroller) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let target = scroller.scrollTop;
    const clamp = (value) =>
      Math.max(
        0,
        Math.min(value, scroller.scrollHeight - scroller.clientHeight),
      );
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      target = scroller.scrollTop;
    };
    const animate = (time) => {
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
      previousTime = time;
      target = clamp(target);
      const difference = target - scroller.scrollTop;
      if (Math.abs(difference) < 0.5) {
        scroller.scrollTop = target;
        frame = 0;
        previousTime = 0;
        return;
      }
      scroller.scrollTop += difference * (1 - Math.exp(-elapsed / 85));
      frame = requestAnimationFrame(animate);
    };
    const onWheel = (event) => {
      if (event.ctrlKey) return; // Preserve browser pinch zoom.
      event.preventDefault();
      event.stopPropagation();
      const unit =
        event.deltaMode === 1
          ? 20
          : event.deltaMode === 2
            ? scroller.clientHeight
            : 1;
      if (!frame) target = scroller.scrollTop;
      target = clamp(target + event.deltaY * unit);
      if (reducedMotion.matches) {
        scroller.scrollTop = target;
      } else if (!frame) {
        frame = requestAnimationFrame(animate);
      }
    };
    const onTouch = (event) => {
      event.stopPropagation();
      if (!scroller.contains(event.target)) event.preventDefault();
    };
    overlay.addEventListener("wheel", onWheel, { passive: false });
    overlay.addEventListener("touchmove", onTouch, { passive: false });
    scroller.addEventListener("pointerdown", cancel);
    scroller.addEventListener("touchstart", cancel, { passive: true });
    scroller.addEventListener("keydown", cancel);
    return () => {
      cancel();
      overlay.removeEventListener("wheel", onWheel);
      overlay.removeEventListener("touchmove", onTouch);
      scroller.removeEventListener("pointerdown", cancel);
      scroller.removeEventListener("touchstart", cancel);
      scroller.removeEventListener("keydown", cancel);
    };
  }, [lyricsOpen]);

  const showLyrics = () => {
    setLanguage("si");
    setLyricsOpen(true);
    if (audioRef.current?.paused) {
      audioRef.current.play().catch(() => setAudioStatus("missing"));
    }
  };

  return (
    <>
      <section
        className="life-detail-anthem"
        aria-labelledby="school-anthem-title"
      >
        <div className="life-detail-anthem-copy">
          <p className="life-detail-anthem-label">OUR IDENTITY</p>
          <h2 id="school-anthem-title">Our School, Our Anthem</h2>
          <p>
            Founded in 1918, Bandaranayake College, Gampaha has grown through
            generations of learning, service and school spirit. Our school
            anthem is a shared expression of the pride and unity of the Nayakenz
            community.
          </p>
          <button
            type="button"
            ref={triggerRef}
            className="life-detail-lyrics-trigger"
            onClick={showLyrics}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M8 5h11M8 10h11M8 15h7M5 4v16" strokeLinecap="round" />
            </svg>
            Show lyrics
          </button>
        </div>
        <div className="life-detail-anthem-player">
          <span className="life-detail-anthem-note">SCHOOL ANTHEM</span>
          <div className="life-detail-anthem-disc" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
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
                syncDuration(event.currentTarget);
              }}
              onDurationChange={(event) => {
                syncDuration(event.currentTarget);
              }}
              onCanPlay={(event) => {
                syncDuration(event.currentTarget);
              }}
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime);
                if (!duration || !Number.isFinite(duration)) {
                  syncDuration(event.currentTarget);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onError={() => setAudioStatus("missing")}
            />
            <div className="life-detail-anthem-transport">
              <button
                type="button"
                className="life-detail-anthem-play"
                onClick={togglePlayback}
                disabled={audioStatus === "missing"}
                aria-label={isPlaying ? "Pause anthem" : "Play anthem"}
              >
                {isPlaying ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg
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
                max={duration && Number.isFinite(duration) ? duration : 100}
                step="0.1"
                value={duration ? currentTime : 0}
                aria-label="Anthem playback position"
                onChange={(event) => {
                  const newTime = Number(event.target.value);
                  setCurrentTime(newTime);
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                  }
                }}
              />
              <span>
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
      {lyricsOpen &&
        createPortal(
          <div
            ref={overlayRef}
            className="life-lyrics-overlay"
            data-lenis-prevent="true"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLyricsOpen(false);
            }}
          >
            <div
              className="life-lyrics-modal"
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="life-lyrics-title"
              tabIndex={-1}
            >
              <div className="life-lyrics-header">
                <div>
                  <h2 id="life-lyrics-title">School Anthem Lyrics</h2>
                </div>
                <button
                  type="button"
                  className="life-lyrics-close"
                  onClick={() => setLyricsOpen(false)}
                  aria-label="Close lyrics"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div
                className="life-lyrics-tabs"
                role="tablist"
                aria-label="Lyrics language"
              >
                {LANGUAGES.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    role="tab"
                    aria-selected={language === item.id}
                    className={language === item.id ? "active" : ""}
                    onClick={() => setLanguage(item.id)}
                    lang={item.lang}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div
                ref={lyricsBodyRef}
                className="life-lyrics-body"
                data-lenis-prevent="true"
                lang={language}
                role="tabpanel"
                tabIndex={0}
                aria-label="School anthem lyrics"
              >
                <p className="life-lyrics-text">{LYRICS[language]}</p>
              </div>
              <p className="life-lyrics-footnote">
                Sinhala lyrics from the school song sheet. English and Tamil are
                meaning-based translations.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}