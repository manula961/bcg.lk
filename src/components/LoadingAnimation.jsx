import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const LoadingAnimation = ({ onComplete }) => {
  const containerRef = useRef(null);
  const leftCurtainRef = useRef(null);
  const rightCurtainRef = useRef(null);
  const logoWrapperRef = useRef(null);
  const ringRef = useRef(null);
  const titleLettersRef = useRef([]);
  const subtitleRef = useRef(null);
  const yearRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // Initial States
    gsap.set(logoWrapperRef.current, { scale: 0.5, opacity: 0, y: 30 });
    gsap.set(ringRef.current, { scale: 0.8, opacity: 0, rotation: -180 });
    gsap.set(titleLettersRef.current, { y: 40, opacity: 0 });
    gsap.set(subtitleRef.current, { letterSpacing: '0.2em', opacity: 0, y: 15 });
    gsap.set(yearRef.current, { opacity: 0, scale: 0.8 });
    gsap.set(progressBarRef.current, { scaleX: 0 });

    // Infinite Ring Rotation during loading
    const ringSpin = gsap.to(ringRef.current, {
      rotation: 360,
      duration: 10,
      repeat: -1,
      ease: 'none',
    });

    // Main Timeline
    tl.to(logoWrapperRef.current, {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
    })
      .to(
        ringRef.current,
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
        },
        '-=0.8'
      )
      .to(
        titleLettersRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.03,
          ease: 'back.out(1.7)',
        },
        '-=0.5'
      )
      .to(
        subtitleRef.current,
        {
          opacity: 1,
          y: 0,
          letterSpacing: '0.5em',
          duration: 0.8,
          ease: 'power2.out',
        },
        '-=0.4'
      )
      .to(
        yearRef.current,
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
        },
        '-=0.4'
      )
      // Progress Bar Animation
      .to(progressBarRef.current, {
        scaleX: 1,
        duration: 1.2,
        ease: 'power1.inOut',
      })
      .to({}, { duration: 0.4 }) // Short Pause
      // Fade/Exit Content
      .to([logoWrapperRef.current, ringRef.current, yearRef.current], {
        scale: 0.8,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      })
      .to(
        [titleLettersRef.current, subtitleRef.current],
        {
          y: -30,
          opacity: 0,
          duration: 0.4,
          stagger: 0.01,
          ease: 'power2.in',
        },
        '-=0.4'
      )
      // Luxury Curtain Split Reveal (Left & Right)
      .to(leftCurtainRef.current, {
        xPercent: -100,
        duration: 1,
        ease: 'power4.inOut',
      })
      .to(
        rightCurtainRef.current,
        {
          xPercent: 100,
          duration: 1,
          ease: 'power4.inOut',
          onComplete: () => {
            ringSpin.kill();
            if (onComplete) onComplete();
          },
        },
        '-=1'
      );

    return () => {
      tl.kill();
      ringSpin.kill();
    };
  }, [onComplete]);

  const collegeName = "BANDARANAYAKE COLLEGE";

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Left Curtain */}
      <div
        ref={leftCurtainRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, #2a0707 0%, #5a1414 50%, #7B1C1C 100%)',
          zIndex: 10,
          boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
        }}
      />

      {/* Right Curtain */}
      <div
        ref={rightCurtainRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(225deg, #2a0707 0%, #5a1414 50%, #7B1C1C 100%)',
          zIndex: 10,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        }}
      />

      {/* Center Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          gap: '20px',
        }}
      >
        {/* Logo with Decorative Spinning Gold Ring */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer Decorative Ring */}
          <div
            ref={ringRef}
            style={{
              position: 'absolute',
              width: '130px',
              height: '130px',
              borderRadius: '50%',
              border: '2px dashed rgba(201,168,76,0.6)',
              boxShadow: '0 0 25px rgba(201,168,76,0.2)',
            }}
          />

          {/* Logo Container */}
          <div
            ref={logoWrapperRef}
            style={{
              position: 'relative',
              width: '105px',
              height: '105px',
              borderRadius: '50%',
              padding: '4px',
              background: 'linear-gradient(135deg, #C9A84C 0%, #FFE8A3 50%, #8A6D29 100%)',
              boxShadow: '0 0 35px rgba(201,168,76,0.4)',
            }}
          >
            <img
              src="https://i.ibb.co/Wv1bGqbs/images.jpg"
              alt="BCG Logo"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>

        {/* College Name with Staggered Letter Animation */}
        <div style={{ textAlign: 'center', overflow: 'hidden', padding: '0 10px' }}>
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(1.2rem, 3.5vw, 2.2rem)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.12em',
              lineHeight: 1.2,
              textShadow: '0 4px 15px rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {collegeName.split('').map((char, index) => (
              <span
                key={index}
                ref={(el) => (titleLettersRef.current[index] = el)}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {char}
              </span>
            ))}
          </h1>

          <div
            ref={subtitleRef}
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 'clamp(0.8rem, 2vw, 1.1rem)',
              fontWeight: 400,
              color: '#C9A84C',
              marginTop: '8px',
              textTransform: 'uppercase',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            GAMPAHA
          </div>
        </div>

        {/* Year Badge */}
        <div
          ref={yearRef}
          style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.3em',
            fontStyle: 'italic',
            borderTop: '1px solid rgba(201,168,76,0.3)',
            borderBottom: '1px solid rgba(201,168,76,0.3)',
            padding: '4px 16px',
          }}
        >
          EST. 1918
        </div>

        {/* Golden Shimmer Progress Bar */}
        <div
          style={{
            width: '160px',
            height: '2px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '10px',
          }}
        >
          <div
            ref={progressBarRef}
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #8A6D29 0%, #C9A84C 50%, #FFE8A3 100%)',
              transformOrigin: 'left center',
              boxShadow: '0 0 10px rgba(201,168,76,0.8)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;