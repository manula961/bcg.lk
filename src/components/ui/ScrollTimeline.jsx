import React, { useEffect, useRef, useState } from 'react';

/**
 * Accessible scroll-progress timeline.
 * Text stays fully visible at all times — progress animates the rail/dots only.
 * Styling comes from Timeline.css imported by Timeline.jsx.
 */
export default function ScrollTimeline({ milestones = [] }) {
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [reachedCount, setReachedCount] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      if (!listRef.current) return;

      const rect = listRef.current.getBoundingClientRect();
      const viewportPoint = window.innerHeight * 0.66;
      const track = trackRef.current;
      if (!track) return;
      const trackRect = track.getBoundingClientRect();
      const distance = Math.max(trackRect.height, 1);
      const amount = (viewportPoint - trackRect.top) / distance;
      const nodes = listRef.current.querySelectorAll('.timeline-node');
      let count = 0;
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top + node.offsetHeight / 2 <= viewportPoint) count++;
      });
      setReachedCount((previous) => previous === count ? previous : count);
      setProgress((previous) => {
        const next = Math.min(1, Math.max(0, amount));
        return Math.abs(previous - next) > 0.001 ? next : previous;
      });
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdate)
      : null;
    if (listRef.current) resizeObserver?.observe(listRef.current);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [milestones.length]);

  if (!milestones.length) return null;

  return (
    <div className="timeline-container" ref={listRef}>
      <div className="timeline-track" ref={trackRef} aria-hidden="true">
        <div
          className="timeline-track-progress"
          style={{ transform: `scaleY(${progress})` }}
        />
      </div>

      <ol className="timeline-list">
        {milestones.map((milestone, index) => {
          const reached = index < reachedCount;

          return (
            <li
              className={`timeline-entry ${reached ? 'is-reached' : ''}`}
              key={milestone.id ?? index}
            >
              <span className="timeline-node" aria-hidden="true">
                <span className="timeline-node-center" />
              </span>

              <article className="timeline-entry-card">
                <time className="timeline-entry-date">
                  {milestone.date}
                </time>
                <h3 className="timeline-entry-title">{milestone.title}</h3>

                {Array.isArray(milestone.points) && milestone.points.length ? (
                  <ul className="timeline-entry-points">
                    {milestone.points.map((point, pointIndex) => (
                      <li key={pointIndex}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="timeline-entry-description">
                    {milestone.description}
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
