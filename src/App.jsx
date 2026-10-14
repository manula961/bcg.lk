import React, { useState } from 'react';
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
  const [loading, setLoading] = useState(true);

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