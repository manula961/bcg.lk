import React, { useEffect, useRef, useState } from 'react';
import './AboutUsPage.css';
import MenuBar from '../components/MenuBar';
import Footer from '../components/Footer';
import ScrollTimeline from '../components/ui/scroll-timeline';

const bannerImage = 'https://bcg.lk/img/banner1.jpg';
const anthemAudioSrc = 'src/components/anthem.mp3';

const collegeMilestones = [
  {
    id: '1',
    date: '18 September 1918',
    title: 'Founding at Henarathgoda',
    description: 'Founded as "Henarathgoda Seewali Buddhist School" at the location where GM/Yashodara Devi Balika Vidyalaya stands today. Mr. Charles Samarasooriya served as the first Principal.'
  },
  {
    id: '2',
    date: '13 February 1923',
    title: 'First Grade Advancement',
    description: 'Advanced as a First Grade School. Achieved 75% passes in the J.S.C. Examination and inaugurated the Junior Cadet Troop.'
  },
  {
    id: '3',
    date: '1924 – 1926',
    title: 'Library Expansion',
    description: 'Inaugurated the school library in 1924 with 86% J.S.C. pass rates. Mr. W.P. Samarasooriya appointed Principal in 1925; new library hall opened June 1926.'
  },
  {
    id: '4',
    date: '1936',
    title: 'Electrification & Co-Curricular Expansion',
    description: 'Electricity launched across campus. Students cultivated 6.5 acres of school land while excelling across Literature, Debating, Drama, Cadet, and Rifle associations.'
  },
  {
    id: '5',
    date: '1948 – 1949',
    title: 'Relocation to Present Grounds',
    description: 'Growing to 592 students under Principal M.A.R. Cooray, the school was re-established at its current location in 1949 as "Henarathgoda Secondary English School" under Principal Jinadasa Munasinghe.'
  },
  {
    id: '6',
    date: '1958',
    title: 'Main Hall Inauguration',
    description: 'The main college hall was officially opened by the Honorable Prime Minister, Mr. S.W.R.D. Bandaranayake.'
  },
  {
    id: '7',
    date: '1963 – 1965',
    title: 'University Entry & School Band',
    description: 'School Band established in 1963 under Mr. D. Thirimanna. In 1965, 21 out of 37 G.C.E. A/L students gained admission to Sri Lankan national universities.'
  },
  {
    id: '8',
    date: '1973 – 1976',
    title: 'BBC Broadcast & Sports Supremacy',
    description: 'The British Broadcasting Corporation (BBC) televised English language teaching and traditional upcountry dancing globally. Won All-Island Senior Volleyball Trophies in 1973 and 1975.'
  },
  {
    id: '9',
    date: '1980 – 1986',
    title: 'Transition & Scout Expansion',
    description: 'Transitioned to a premier boys\' school by 1985. Enrolment reached 2,068 across 57 classrooms under Principal Premasena Udugampola. Purchased 42 perches from Gampaha Municipal Council for sports grounds.'
  },
  {
    id: '10',
    date: '25 May 1993',
    title: 'National School Advancement',
    description: 'Upgraded to a First Grade School and advanced to National Level status as "Bandaranayake College". Celebrated its 75th Anniversary with a student-run FM channel during the exhibition.'
  },
  {
    id: '11',
    date: '1994 – 1999',
    title: 'Herman Loos Victory & X-Ban ’99',
    description: 'Senior Cadet Platoon awarded the prestigious Herman Loos Trophy (1994). Hosted Colors Night with President Chandrika Bandaranaike and organized "X-Ban ’99" exhibition to acquire the college bus.'
  },
  {
    id: '12',
    date: '2001 – 2002',
    title: 'English Medium & Modernization',
    description: 'Under Principal W.M. Jayantha Wickramanayake, English medium classes commenced, Rugby reached A-Division, OBA donated a new computer lab, and BOC "Ran Kekulu" branch opened.'
  },
  {
    id: '13',
    date: '2006 – Present',
    title: 'Modern Infrastructure Era',
    description: 'Ven. Labuthale Sudassana Thero assumed principalship, guiding major development projects including the Olympic-standard swimming pool, modern sports complex, and campus digital transformation.'
  }
];

function AnthemPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.log('Audio playback error:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <section className="anthem-player-card" aria-label="College Anthem Audio Player">
      <audio
        ref={audioRef}
        src={anthemAudioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <div className="anthem-info">
        <span className="about-vm-tag">COLLEGE ANTHEM</span>
        <h3 className="anthem-player-title">School Anthem</h3>
      </div>

      <div className="anthem-controls-row">
        <button
          type="button"
          className="anthem-play-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause Anthem' : 'Play Anthem'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ marginLeft: '2px' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <div className="anthem-progress-wrap">
          <span className="anthem-time-text">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="anthem-seekbar"
            aria-label="Anthem audio progress"
            style={{
              background: `linear-gradient(to right, #7B1C1C 0%, #7B1C1C ${progressPercent}%, #e2ded5 ${progressPercent}%, #e2ded5 100%)`
            }}
          />
          <span className="anthem-time-text">{formatTime(duration)}</span>
        </div>
      </div>
    </section>
  );
}

export default function AboutUsPage() {
  const pageRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'About Us | Bandaranayake College, Gampaha';
    window.scrollTo(0, 0);
    return () => {
      document.title = oldTitle;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05, rootMargin: '0px 0px -10% 0px' }
    );
    if (pageRef.current) observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, []);

  const handleBackToHome = (e) => {
    e.preventDefault();
    sessionStorage.setItem('skipLoading', 'true');
    sessionStorage.setItem('scrollToSection', 'top');
    window.location.assign('/');
  };

  const handleMenuNavigation = (event) => {
    const item = event.target.closest?.('.menu-nav-item');
    if (!item) return;
    const label = item.querySelector('.menu-title')?.textContent;
    if (label === 'About Us') {
      event.stopPropagation();
      window.location.assign('/about-us');
      return;
    }
    const destinations = {
      Home: 'home',
      News: 'news',
      Events: 'events',
      Explore: 'explore',
      'Extra Curricular': 'extracurricular',
    };
    if (destinations[label]) {
      event.stopPropagation();
      sessionStorage.setItem('skipLoading', 'true');
      sessionStorage.setItem('scrollToSection', destinations[label]);
      window.location.assign('/');
    }
  };

  return (
    <main className="about-page">
      <a className="about-skip" href="#about-us-main">Skip to content</a>
      <div onClickCapture={handleMenuNavigation}>
        <MenuBar />
      </div>
      <div ref={pageRef} className="about-top-wrapper">
        <div className={`about-content-group ${visible ? 'visible' : ''}`}>
          <div className="section-container about-return">
            <a href="/" onClick={handleBackToHome} className="about-return-btn">
              <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>BACK</span>
            </a>
          </div>

          {/* Clean Unified Header */}
          <section id="about-us-main" className="about-intro" aria-labelledby="about-us-title">
            <p className="about-kicker">ESTABLISHED 18 SEPTEMBER 1918</p>
            <h1 id="about-us-title">About Bandaranayake College</h1>
            <p className="about-description">
              The premier Buddhist boys' school in Gampaha and one of Sri Lanka's leading national institutions nurturing scholars, leaders, and champions for over a century.
            </p>
          </section>

          <div className="section-container about-container">
            {/* Vision & Mission Grid */}
            <section className="about-vm-grid" aria-label="Vision and Mission">
              <div className="about-vm-card vision">
                <div className="about-vm-header">
                  <span className="about-vm-tag">OUR VISION</span>
                </div>
                <h3>Personality & Global Readiness</h3>
                <p>
                  Nurturing students with strong character and global competence, empowering them to succeed in future challenges while upholding core social values.
                </p>
              </div>

              <div className="about-vm-card mission">
                <div className="about-vm-header">
                  <span className="about-vm-tag">OUR MISSION</span>
                </div>
                <h3>Morals, Virtues & Intellect</h3>
                <p>
                  Empowering an inspiring younger generation fortified with morals, virtues, and intelligence to build a spiritually fertile society.
                </p>
              </div>
            </section>

            {/* Compact School Anthem Audio Player Bar */}
            <AnthemPlayer />

            {/* Main Feature Banner */}
            <section className="about-feature maroon" aria-label="Bandaranayake College History">
              <img className="about-feature-image" src={bannerImage} alt="Bandaranayake College campus" />
              <div className="about-feature-shade" />
              <div className="about-feature-body">
                <span className="about-feature-label">A LEGACY OF EXCELLENCE</span>
                <h2>108+ Years of Service to the Nation</h2>
                <p>
                  Founded as "Henarathgoda Seewali Buddhist School", BCG has evolved into a national citadel of learning. Today, over 5,000 students receive education across 60 parallel classes from Grade 6 to 13, offering 24 subjects across Mathematics, Agriculture, Commerce, and Arts streams.
                </p>
              </div>
            </section>

            {/* Key Metrics & Institutional Highlights */}
            <section className="about-story" aria-labelledby="about-stats-heading">
              <div className="about-section-heading">
                <p className="about-kicker">AT A GLANCE</p>
                <h2 id="about-stats-heading">Institutional Profile</h2>
              </div>

              <div className="about-highlights">
                <div className="about-highlight">
                  <strong>5,000+</strong>
                  <span>Enrolled Students</span>
                </div>
                <div className="about-highlight">
                  <strong>60</strong>
                  <span>Parallel Classes (Grades 6–13)</span>
                </div>
                <div className="about-highlight">
                  <strong>30+</strong>
                  <span>Sports & Societies</span>
                </div>
              </div>

              {/* Pillars Narrative */}
              <div className="about-stories">
                <article className="about-story-card">
                  <span className="about-story-number">01</span>
                  <div>
                    <h3>Academic Scope & English Medium</h3>
                    <p>
                      Since launching English medium classes in 2002, Bandaranayake College has attained outstanding examination results. Students select from 24 subjects in Advanced Level streams, guided by new educational amendments, dedicated ICT labs, dental facilities, and examination preparation programs.
                    </p>
                  </div>
                </article>

                <article className="about-story-card">
                  <span className="about-story-number">02</span>
                  <div>
                    <h3>Co-Curricular & Championship Tradition</h3>
                    <p>
                      With 15 sports and 15 student associations, BCG excels in national and international competitions. Highlights include the Herman Loos Trophy-winning Senior Cadet Platoon (1994), A.E.P. Abesinghe Trophy-winning Eastern Band, President's Scouts, Saukyadana Movement, and international awards in Dancing, Music, and Art.
                    </p>
                  </div>
                </article>

                <article className="about-story-card">
                  <span className="about-story-number">03</span>
                  <div>
                    <h3>Campus Development & Community</h3>
                    <p>
                      Re-energized under the leadership of Ven. Labuthale Sudassana Thero alongside the Past Pupils' Association, Parents, and Well-Wishers, campus facilities include an Olympic-standard swimming pool, renovated sports grounds, volleyball & badminton courts, modern canteen, and official college transport.
                    </p>
                  </div>
                </article>
              </div>
            </section>

            {/* Interactive Scroll Timeline Section */}
            <section className="about-timeline-section" aria-labelledby="about-timeline-heading">
              <div className="about-section-heading">
                <p className="about-kicker">CENTURY OF PROGRESS</p>
                <h2 id="about-timeline-heading">College Journey</h2>
                <p className="about-description">Scroll down to explore the key historic milestones that shaped Bandaranayake College from 1918 to the present day.</p>
              </div>

              {/* Scroll Timeline Component */}
              <ScrollTimeline milestones={collegeMilestones} />
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}