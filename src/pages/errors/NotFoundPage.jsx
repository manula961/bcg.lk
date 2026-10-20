import React, { useEffect } from 'react';
import MenuBar from '../../components/layout/MenuBar';
import Footer from '../../components/layout/Footer';
import '../life/LifeDetailPage.css';

export default function NotFoundPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found | Bandaranayake College';
    return () => { document.title = previous; };
  }, []);

  function handleNavigation(event) {
    const item = event.target.closest?.('.menu-nav-item');
    const label = item?.querySelector('.menu-title')?.textContent;
    const anchors = { Home: 'home', News: 'news', Academics: 'academics',
      Explore: 'explore', 'Extra Curricular': 'extracurricular' };
    if (anchors[label]) {
      event.stopPropagation();
      window.location.assign('/#' + anchors[label]);
    }
  }

  return (
    <main className="life-detail">
      <a className="life-detail-skip" href="#not-found-main">Skip to content</a>
      <div onClickCapture={handleNavigation}><MenuBar /></div>
      <div className="section-container life-detail-container">
        <div className="life-detail-return">
          <a className="life-detail-return-btn" href="/">← Back to home</a>
        </div>
        <section id="not-found-main" className="life-detail-intro">
          <p className="life-detail-kicker">BANDARANAYAKE COLLEGE</p>
          <h1>Page not found</h1>
          <p className="life-detail-description">This address does not match a published college page.</p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
