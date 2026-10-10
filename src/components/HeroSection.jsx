import React, { useEffect, useRef } from 'react';

const HeroSection = () => {
  const heroRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const dividerRef = useRef(null);
  const mottoRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
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
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay);
    });

    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      if (scrollY <= heroHeight) {
        const opacity = Math.max(0, 1 - scrollY / (heroHeight * 0.7));
        const translateY = scrollY * 0.25;
        heroRef.current.style.opacity = opacity;
        heroRef.current.style.transform = `translateY(${translateY}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative flex flex-col items-center justify-center h-screen overflow-hidden text-center will-change-transform"
      style={{
        backgroundImage: `url('https://i.ibb.co/C5GVQgsr/Image-jpg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="relative z-10 flex flex-col items-center px-4">

        {/* Logo — no animation, plain */}
        <div ref={logoRef} className="mb-1 flex justify-center" style={{ opacity: 0 }}>
          <img
            src="https://i.ibb.co/Wv1bGqbs/images.jpg"
            alt="Bandaranayake College Logo"
            className="object-cover w-32 h-32 rounded-full md:w-40 md:h-40"
          />
        </div>

        {/* College name */}
        <div ref={titleRef} style={{ opacity: 0 }}>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text md:text-4xl lg:text-5xl whitespace-nowrap">
            BANDARANAYAKE COLLEGE <br />
            <span className="block mt-1 text-3xl font-extrabold md:text-4xl lg:text-5xl">
              GAMPAHA
            </span>
          </h1>
        </div>

        {/* Since 1918 */}
        <div ref={dividerRef} className="flex items-center justify-center gap-3 my-1" style={{ opacity: 0 }}>
          <span className="text-2xl text-yellow-400">•</span>
          <span className="text-xl font-black tracking-[0.3em] text-yellow-400 uppercase">SINCE 1918</span>
          <span className="text-2xl text-yellow-400">•</span>
        </div>
      </div>

      {/* Motto */}
      <div
        ref={mottoRef}
        className="absolute  bottom-6 z-20 w-full px-4 flex justify-center"
        style={{ transform: 'translateX(-50%)', opacity: 0 }}
      >
        <img
          src="https://i.ibb.co/tTxmnTPG/motto.png"
          alt="College Motto"
          className="h-4 w-auto object-contain sm:h-5 md:h-5 lg:h-5"
        />
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-7 right-8 z-10 flex flex-col items-center gap-2"
        style={{ opacity: 0 }}
      >
        <span
          style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: '0.5rem',
            letterSpacing: '0.3em',
            color: 'rgba(201,168,76,0.5)',
            writingMode: 'vertical-rl',
            textTransform: 'uppercase',
          }}
        >
          Scroll
        </span>
        <div
          style={{
            width: '1px',
            height: '44px',
            background: 'linear-gradient(to bottom, #C9A84C, transparent)',
            animation: 'scrollPulse 2s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.8); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;