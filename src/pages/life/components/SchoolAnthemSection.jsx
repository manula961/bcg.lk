import React, { useState } from 'react';

// To publish the recording, put the licensed/approved audio file at:
// public/audio/school-anthem.mp3 (outside this src-only archive).
const ANTHEM_SRC = '/audio/school-anthem.mp3';

/** Short about-school and official-anthem space, shown only on About Us. */
export default function SchoolAnthemSection() {
  const [audioStatus, setAudioStatus] = useState('loading');

  return (
    <section className="life-detail-anthem" aria-labelledby="school-anthem-title">
      <div className="life-detail-anthem-copy">
        <p className="life-detail-anthem-label">OUR IDENTITY</p>
        <h2 id="school-anthem-title">Our School, Our Anthem</h2>
        <p>
          Founded in 1918, Bandaranayake College, Gampaha has grown through
          generations of learning, service and school spirit. Our school anthem
          is a shared expression of the pride and unity of the Nayakenz community.
        </p>
      </div>
      <div className="life-detail-anthem-player">
        <span className="life-detail-anthem-note">SCHOOL ANTHEM</span>
        <div className="life-detail-anthem-disc" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div className="life-detail-anthem-controls">
          <strong>Bandaranayake College Anthem</strong>
          <audio
            controls
            preload="metadata"
            src={ANTHEM_SRC}
            aria-label="Play Bandaranayake College school anthem"
            onLoadedMetadata={() => setAudioStatus('ready')}
            onError={() => setAudioStatus('missing')}
            style={{ display: audioStatus === 'ready' ? 'block' : 'none' }}
          />
          {audioStatus !== 'ready' && (
            <p role="status" className="life-detail-anthem-placeholder">
              {audioStatus === 'loading' ? 'Checking for the anthem recording…' : 'The anthem recording will be available soon.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
