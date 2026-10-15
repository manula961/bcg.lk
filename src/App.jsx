import React, { useState, useEffect } from 'react';
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

    const targetSection = sessionStorage.getItem('scrollToSection') || window.location.hash.replace('#', '');

    if (targetSection) {
      // Clear hash from address bar immediately
      if (window.location.hash && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Scroll smoothly to target once elements are mounted
      setTimeout(() => {
        if (targetSection === 'top' || targetSection === 'home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(targetSection);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
        sessionStorage.removeItem('scrollToSection');
      }, 200);
    } else if (sessionStorage.getItem('skipLoading')) {
      // If returning from a back action without a explicit section, ensure we scroll to top
      window.scrollTo(0, 0);
    }

    // Reset skip loading flag for future fresh visits
    sessionStorage.removeItem('skipLoading');

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

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