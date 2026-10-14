import React, { useEffect, useRef } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const heroRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const dividerRef = useRef(null);
  const mottoRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timers = [];
    const elements = [
      { el: logoRef.current, delay: 200 },
      { el: titleRef.current, delay: 500 },
      { el: subtitleRef.current, delay: 750 },
      { el: dividerRef.current, delay: 950 },
      { el: mottoRef.current, delay: 1150 },
      { el: scrollRef.current, delay: 1400 },
    ];

    elements.forEach(({ el, delay }) => {
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
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
              const opacity = Math.max(0, 1 - scrollY / (heroHeight * 0.7));
              const translateY = scrollY * 0.25;
              heroRef.current.style.opacity = opacity;
              heroRef.current.style.transform = `translateY(${translateY}px)`;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="hero-section relative flex flex-col items-center justify-center h-screen overflow-hidden text-center will-change-transform"
    >
      <div className="relative z-10 flex flex-col items-center px-4 -mt-12 md:-mt-16">
        {/* Logo */}
        <div ref={logoRef} className="hero-fade-init mb-1 flex justify-center">
          <img
            src="https://i.ibb.co/Wv1bGqbs/images.jpg"
            alt="Bandaranayake College Logo"
            className="object-cover w-140 h-140 rounded-full md:w-48 md:h-48 lg:w-52 lg:h-52"
          />
        </div>

        {/* College name - Using Geologica Font */}
        <div ref={titleRef} className="hero-fade-init">
          <h1 className="geologica mb-4 text-2xl font-extrabold tracking-normal text-transparent bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text md:text-5xl lg:text-6xl whitespace-nowrap">
            BANDARANAYAKE COLLEGE <br />
            <span ref={subtitleRef} className="block mt-1 text-2xl font-extrabold md:text-5xl lg:text-6xl">
              GAMPAHA
            </span>
          </h1>
        </div>

        {/* Since 1918 */}
        <div
          ref={dividerRef}
          className="hero-fade-init flex items-center justify-center gap-3 my-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
          <span className="text-xl font-black tracking-[0.3em] text-yellow-400 uppercase">
            SINCE 1918
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
        </div>
      </div>

      {/* Motto */}
      <div
        ref={mottoRef}
        className="hero-fade-init absolute bottom-6 z-20 w-full px-4 flex justify-center"
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
        className="hero-fade-init absolute bottom-7 right-8 z-10 flex flex-col items-center gap-2"
      >
        <span className="scroll-indicator-text">Scroll</span>
        <div className="scroll-indicator-bar" />
      </div>
    </section>
  );
};

export default HeroSection;