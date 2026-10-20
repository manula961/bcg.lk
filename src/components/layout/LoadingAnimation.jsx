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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (onComplete) onComplete();
      return;
    }

    // Safety timeout to prevent indefinite unmount blocking
    const safetyTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3500);

    const tl = gsap.timeline({
      onComplete: () => {
        clearTimeout(safetyTimer);
        if (onComplete) onComplete();
      },
    });

    // Initial States
    gsap.set(logoWrapperRef.current, { scale: 0.5, opacity: 0, y: 30 });
    gsap.set(titleLettersRef.current, { y: 40, opacity: 0 });
    gsap.set(subtitleRef.current, { letterSpacing: '0.2em', opacity: 0, y: 15 });
    gsap.set(yearRef.current, { opacity: 0, scale: 0.8 });
    gsap.set(progressBarRef.current, { scaleX: 0 });

    // Timeline Animation Sequence
    tl.to(logoWrapperRef.current, {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
    })
      .to(
        titleLettersRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          stagger: 0.015,
          ease: 'back.out(1.7)',
        },
        '-=0.3'
      )
      .to(
        subtitleRef.current,
        {
          opacity: 1,
          y: 0,
          letterSpacing: '0.4em',
          duration: 0.35,
          ease: 'power2.out',
        },
        '-=0.2'
      )
      .to(
        yearRef.current,
        {
          opacity: 1,
          scale: 1,
          duration: 0.25,
          ease: 'power2.out',
        },
        '-=0.2'
      )
      .to(progressBarRef.current, {
        scaleX: 1,
        duration: 0.5,
        ease: 'power1.inOut',
      })
      .to({}, { duration: 0.1 })
      .to([logoWrapperRef.current, yearRef.current], {
        scale: 0.8,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
      })
      .to(
        [titleLettersRef.current, subtitleRef.current],
        {
          y: -20,
          opacity: 0,
          duration: 0.2,
          stagger: 0.008,
          ease: 'power2.in',
        },
        '-=0.15'
      )
      .to(leftCurtainRef.current, {
        xPercent: -100,
        duration: 0.5,
        ease: 'power4.inOut',
      })
      .to(
        rightCurtainRef.current,
        {
          xPercent: 100,
          duration: 0.5,
          ease: 'power4.inOut',
        },
        '-=0.5'
      );

    return () => {
      clearTimeout(safetyTimer);
      tl.kill();
    };
  }, [onComplete]);

  const collegeName = 'BANDARANAYAKE COLLEGE';

  return (
    <div ref={containerRef} className="loading-container">
      <div ref={leftCurtainRef} className="curtain curtain-left" />
      <div ref={rightCurtainRef} className="curtain curtain-right" />
      <div className="center-content">
        <div className="logo-wrapper">
          <div ref={logoWrapperRef} className="logo-container">
            <img
              src="https://i.ibb.co/Wv1bGqbs/images.jpg"
              alt="BCG Crest"
              className="logo-image"
            />
          </div>
        </div>
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
        <div ref={yearRef} className="year-badge">
          EST. 1918
        </div>
        <div className="progress-bar-track">
          <div ref={progressBarRef} className="progress-bar-fill" />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;