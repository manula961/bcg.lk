import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './LoadingAnimation.css';

const LoadingAnimation = ({ onComplete }) => {
  const containerRef = useRef(null);
  const leftCurtainRef = useRef(null);
  const rightCurtainRef = useRef(null);
  const logoWrapperRef = useRef(null);
  const titleLettersRef = useRef([]);
  const subtitleRef = useRef(null);
  const yearRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // Initial States
    gsap.set(logoWrapperRef.current, { scale: 0.5, opacity: 0, y: 30 });
    gsap.set(titleLettersRef.current, { y: 40, opacity: 0 });
    gsap.set(subtitleRef.current, { letterSpacing: '0.2em', opacity: 0, y: 15 });
    gsap.set(yearRef.current, { opacity: 0, scale: 0.8 });
    gsap.set(progressBarRef.current, { scaleX: 0 });

    // Main Timeline (Accelerated)
    tl.to(logoWrapperRef.current, {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
    })
      .to(
        titleLettersRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.015,
          ease: 'back.out(1.7)',
        },
        '-=0.35'
      )
      .to(
        subtitleRef.current,
        {
          opacity: 1,
          y: 0,
          letterSpacing: '0.5em',
          duration: 0.4,
          ease: 'power2.out',
        },
        '-=0.2'
      )
      .to(
        yearRef.current,
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        '-=0.2'
      )
      // Progress Bar Animation (Faster)
      .to(progressBarRef.current, {
        scaleX: 1,
        duration: 0.6,
        ease: 'power1.inOut',
      })
      .to({}, { duration: 0.15 }) // Shorter Pause
      // Fade/Exit Content
      .to([logoWrapperRef.current, yearRef.current], {
        scale: 0.8,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      })
      .to(
        [titleLettersRef.current, subtitleRef.current],
        {
          y: -20,
          opacity: 0,
          duration: 0.25,
          stagger: 0.008,
          ease: 'power2.in',
        },
        '-=0.2'
      )
      // Luxury Curtain Split Reveal (Faster)
      .to(leftCurtainRef.current, {
        xPercent: -100,
        duration: 0.6,
        ease: 'power4.inOut',
      })
      .to(
        rightCurtainRef.current,
        {
          xPercent: 100,
          duration: 0.6,
          ease: 'power4.inOut',
          onComplete: () => {
            if (onComplete) onComplete();
          },
        },
        '-=0.6'
      );

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  const collegeName = 'BANDARANAYAKE COLLEGE';

  return (
    <div ref={containerRef} className="loading-container">
      {/* Curtains */}
      <div ref={leftCurtainRef} className="curtain curtain-left" />
      <div ref={rightCurtainRef} className="curtain curtain-right" />

      {/* Center Content */}
      <div className="center-content">
        {/* Logo */}
        <div className="logo-wrapper">
          <div ref={logoWrapperRef} className="logo-container">
            <img
              src="https://i.ibb.co/Wv1bGqbs/images.jpg"
              alt="BCG Logo"
              className="logo-image"
            />
          </div>
        </div>

        {/* College Name */}
        <div className="title-wrapper">
          <h1 className="college-title">
            {collegeName.split('').map((char, index) => (
              <span
                key={index}
                ref={(el) => (titleLettersRef.current[index] = el)}
                className="title-letter"
              >
                {char}
              </span>
            ))}
          </h1>

          <div ref={subtitleRef} className="subtitle">
            GAMPAHA
          </div>
        </div>

        {/* Year Badge */}
        <div ref={yearRef} className="year-badge">
          EST. 1918
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-track">
          <div ref={progressBarRef} className="progress-bar-fill" />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;