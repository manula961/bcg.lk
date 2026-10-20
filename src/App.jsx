import React, { useState, useEffect, useRef } from 'react';
import LoadingAnimation from './components/LoadingAnimation';
import MenuBar from './components/MenuBar';
import HeroSection from './components/HeroSection';
import NewsSection from './components/NewsSection';
import EventsSection from './components/EventsSection';
import ExploreSection from './components/ExploreSection';
import LifeAsNayaken from './components/LifeAsNayaken';
import Footer from './components/Footer';
import './index.css';

function App() {
  // Capture the requested anchor before the loading curtain delays mounting the homepage.
  const pendingSection = useRef(sessionStorage.getItem('scrollToSection') || window.location.hash.slice(1));
  const [loading, setLoading] = useState(() => {
    // Check if returning from sub-pages or back buttons
    return !sessionStorage.getItem('skipLoading');
  });

  useEffect(() => {
    // Listen for browser Back / Forward buttons and bfcache restoration
    const handlePopState = () => {
      sessionStorage.setItem('skipLoading', 'true');
    };

    const handlePageShow = (e) => {
      if (e.persisted) {
        setLoading(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    // Reset skip loading flag for future fresh visits
    sessionStorage.removeItem('skipLoading');

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  useEffect(() => {
    // Hash links from another page must wait until the homepage sections exist.
    if (loading) return undefined;
    const target = pendingSection.current;
    if (!target) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (target === 'top' || target === 'home') {
        window.scrollTo({ top: 0, behavior });
      } else {
        document.getElementById(target)?.scrollIntoView({ behavior });
      }
      sessionStorage.removeItem('scrollToSection');
      pendingSection.current = '';
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  return (
    <>
      {loading && <LoadingAnimation onComplete={() => setLoading(false)} />}
      {!loading && (
        <main className="bg-[#0a0a0a]">
          <MenuBar />
          <HeroSection />
          <NewsSection />
          <EventsSection />
          <ExploreSection />
          <LifeAsNayaken />
          <Footer />
        </main>
      )}
    </>
  );
}

export default App;