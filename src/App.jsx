import React, { useState, useEffect } from 'react';
import LoadingAnimation from './components/layout/LoadingAnimation';
import MenuBar from './components/layout/MenuBar';
import HeroSection from './components/home/HeroSection';
import NewsSection from './components/home/NewsSection';
import EventsSection from './components/home/EventsSection';
import ExploreSection from './components/home/ExploreSection';
import LifeAsNayaken from './components/home/LifeAsNayaken';
import Footer from './components/layout/Footer';
import './index.css';

function App() {
  const [loading, setLoading] = useState(() => {
    // Check if returning from sub-pages or back buttons
    return !sessionStorage.getItem('skipLoading') && !window.location.hash &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const handlePopState = () => {
      sessionStorage.setItem('skipLoading', 'true');
    };
    const handlePageShow = event => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Section targets must be resolved after the loading curtain is removed and
  // the homepage sections are mounted. Direct /#news and /#events visits
  // bypass the curtain so browser deep links work on first arrival.
  useEffect(() => {
    if (loading) return undefined;
    const targetSection = sessionStorage.getItem('scrollToSection') ||
      decodeURIComponent(window.location.hash.slice(1));
    const returnedToHome = sessionStorage.getItem('skipLoading');
    sessionStorage.removeItem('skipLoading');
    if (!targetSection && !returnedToHome) return undefined;
    const timer = window.setTimeout(() => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto' : 'smooth';
      const target = targetSection && targetSection !== 'home' && targetSection !== 'top'
        ? document.getElementById(targetSection) : null;
      if (target) target.scrollIntoView({ behavior, block: 'start' });
      else window.scrollTo({ top: 0, behavior });
      sessionStorage.removeItem('scrollToSection');
    }, 100);
    return () => window.clearTimeout(timer);
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