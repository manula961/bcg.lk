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
    const handlePageShow = event => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Public route scroll/focus is handled centrally after each navigation.
  // Consume the intro-skip flag after the homepage has finished mounting.
  useEffect(() => {
    if (!loading) sessionStorage.removeItem('skipLoading');
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