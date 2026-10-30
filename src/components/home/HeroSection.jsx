
import React, { useEffect, useRef } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const heroRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const dividerRef = useRef(null);
  const mottoRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timers = [];
    const elements = [
      { el: logoRef.current, delay: 200 },
      { el: titleRef.current, delay: 500 },
      { el: dividerRef.current, delay: 950 },
      { el: mottoRef.current, delay: 1150 },
      { el: scrollRef.current, delay: 1400 },
    ];

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach(({ el }) => {
        if (el) {
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.transition = 'none';
        }
      });
      return undefined;
    }

    elements.forEach(({ el, delay }) => {
      if (!el) return;

      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition =
        'opacity 0.9s ease, transform 0.9s ease';

      const timer = setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay);

      timers.push(timer);
    });

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroRef.current) {
            const scrollY = window.scrollY;
            const heroHeight = window.innerHeight;

            if (scrollY <= heroHeight) {
              const opacity = Math.max(
                0,
                1 - scrollY / (heroHeight * 0.7)
              );
              const translateY = scrollY * 0.25;

              heroRef.current.style.opacity = opacity;
              heroRef.current.style.transform =
                `translateY(${translateY}px)`;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="hero-section relative flex flex-col items-center justify-center min-h-screen h-[100dvh] overflow-hidden text-center will-change-transform px-4"
    >
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl mx-auto -mt-6 sm:-mt-10 md:-mt-16">
        {/* Logo */}
        <div
          ref={logoRef}
          className="hero-fade-init mb-2 sm:mb-4 flex justify-center"
        >
          <img
            src="/email-assets/school-logo.png"
            alt="Bandaranayake College Logo"
            className="object-cover w-60 h-60 sm:w-60 sm:h-60 md:w-60 md:h-60 lg:w-64 lg:h-64 rounded-full"/>
          </div>

        {/* College name */}
        <div
          ref={titleRef}
          className="hero-fade-init w-full px-1"
        >
          <h1 className="geologica mb-2 sm:mb-4 leading-tight">
            <span className="block whitespace-normal sm:whitespace-nowrap text-transparent bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-[1.5rem] xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight sm:tracking-normal">
              BANDARANAYAKE COLLEGE
            </span>

            <span className="block whitespace-normal sm:whitespace-nowrap text-transparent bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-[1.5rem] xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight sm:tracking-normal">
              GAMPAHA
            </span>
          </h1>
        </div>

        {/* Since 1918 */}
        <div
          ref={dividerRef}
          className="hero-fade-init flex items-center justify-center gap-2 sm:gap-3 my-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />

          <span className="text-sm sm:text-lg md:text-xl font-black tracking-[0.1em] text-yellow-400 uppercase">
            SINCE 1918
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
        </div>
      </div>

      {/* Sinhala School Motto */}
      <div
        ref={mottoRef}
        className="hero-fade-init hero-motto-container absolute bottom-4 sm:bottom-6 z-20 w-full px-4 flex justify-center"
      >
        <div className="motto-container">
          <span className="motto-maroon">විද්වාත්</span>
          <span className="motto-blue">සර්වත්‍ර</span>
          <span className="motto-maroon">පූජ්‍යතේ</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="hero-fade-init absolute bottom-4 sm:bottom-7 right-4 sm:right-8 z-10 hidden xs:flex flex-col items-center gap-1 sm:gap-2"
      >
        <span className="scroll-indicator-text">
          Scroll
        </span>
        <div className="scroll-indicator-bar" />
      </div>
    </section>
  );
};

export default HeroSection;
