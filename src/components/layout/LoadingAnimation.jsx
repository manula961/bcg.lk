import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './LoadingAnimation.css';

const COLLEGE_NAME = 'BANDARANAYAKE COLLEGE';

export default function LoadingAnimation({ onComplete }) {
  const rootRef = useRef(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      completeRef.current?.();
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return undefined;
    }

    const ctx = gsap.context(() => {
      const letters = gsap.utils.toArray('.title-letter');
      gsap.set('.logo-container', { autoAlpha: 0, scale: 0.75, y: 20 });
      gsap.set(letters, { autoAlpha: 0, y: 22 });
      gsap.set('.subtitle', { autoAlpha: 0, y: 12 });
      gsap.set('.year-badge', { autoAlpha: 0, y: 8 });
      gsap.set('.progress-bar-fill', { scaleX: 0, transformOrigin: 'left center' });

      gsap.timeline({ onComplete: finish })
        .to('.logo-container', { autoAlpha: 1, scale: 1, y: 0, duration: 0.55, ease: 'power3.out' })
        .to(letters, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.018, ease: 'power2.out' }, '-=0.3')
        .to('.subtitle', { autoAlpha: 1, y: 0, duration: 0.35 }, '-=0.18')
        .to('.year-badge', { autoAlpha: 1, y: 0, duration: 0.3 }, '-=0.2')
        .to('.progress-bar-fill', { scaleX: 1, duration: 0.65, ease: 'power2.inOut' }, '-=0.1')
        .to('.center-content', { autoAlpha: 0, y: -15, duration: 0.35, ease: 'power2.in' }, '+=0.1')
        .to('.curtain-left', { xPercent: -101, duration: 0.85, ease: 'power3.inOut' }, '-=0.05')
        .to('.curtain-right', { xPercent: 101, duration: 0.85, ease: 'power3.inOut' }, '<');
    }, root);

    // Failsafe only; never allow it to invoke completion twice.
    const timer = window.setTimeout(finish, 5000);
    return () => {
      window.clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="loading-container" role="status" aria-label="Loading Bandaranayake College">
      <div className="curtain curtain-left" aria-hidden="true" />
      <div className="curtain curtain-right" aria-hidden="true" />
      <div className="center-content">
        <div className="logo-wrapper">
          <div className="logo-container">
            <img src="/email-assets/school-logo.png" alt="Bandaranayake College crest" className="logo-image" />
          </div>
        </div>
        <div className="title-wrapper">
          <h1 className="college-title" aria-label={COLLEGE_NAME}>
            {COLLEGE_NAME.split('').map((char, index) => (
              <span className="title-letter" aria-hidden="true" key={index}>{char === ' ' ? '\u00a0' : char}</span>
            ))}
          </h1>
          <div className="subtitle">GAMPAHA</div>
        </div>
        <div className="year-badge">EST. 1918</div>
        <div className="progress-bar-track" aria-hidden="true">
          <div className="progress-bar-fill" />
        </div>
      </div>
    </div>
  );
}
