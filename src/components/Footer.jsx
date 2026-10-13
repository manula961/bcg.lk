import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="footer-gradient-bar" />
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
      <div className="section-container footer-content">
        <br/><br/>
        {/* Main Grid */}
        <div className="footer-grid">
          {/* Col 1: Brand Info */}
          <div>
            <div className="footer-brand-header">
              <img
                src="https://i.ibb.co/Wv1bGqbs/images.jpg"
                alt="BCG Logo"
                className="footer-logo"
              />
              <div>
                <div className="footer-brand-title">Bandaranayake College</div>
                <div className="footer-brand-title">Gampaha</div>
              </div>
            </div>
            <p className="footer-brand-desc">
              Nurturing young minds since 1918. A legacy of academic brilliance,
              sportsmanship, and cultural harmony in the heart of Gampaha.
            </p>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
            {/* Social Media SVG Buttons */}
            <div className="footer-socials">
              {/* Facebook */}
              <a href="#" className="footer-social-btn" aria-label="Facebook">
                <svg className="footer-social-icon" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.65 13.75 5.65c1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.23 0-1.61.77-1.61 1.56V12h2.74l-.44 3h-2.3v6.8c4.56-.93 8-4.96 8-9.8z" />
                </svg>
              </a>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
              {/* LinkedIn */}
              <a href="#" className="footer-social-btn" aria-label="LinkedIn">
                <svg className="footer-social-icon" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.7a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
                </svg>
              </a>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
              {/* YouTube */}
              <a href="#" className="footer-social-btn" aria-label="YouTube">
                <svg className="footer-social-icon" viewBox="0 0 24 24">
                  <path d="M21.58 7.19a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.68.49a2.7 2.7 0 0 0-1.9 1.9C2 8.88 2 12 2 12s0 3.12.42 4.81a2.7 2.7 0 0 0 1.9 1.9C6 19.2 12 19.2 12 19.2s6 0 7.68-.49a2.7 2.7 0 0 0 1.9-1.9C22 15.12 22 12 22 12s0-3.12-.42-4.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="footer-col-title">Navigate</h4>
<<<<<<< Updated upstream
            {['Home', 'Explore', 'Academics', 'Extra Curricular', 'News'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '')}`}
                className="footer-link"
              >
                {link}
              </a>
            ))}
=======
            {['Home', 'Explore', 'Academics', 'Extra Curricular', 'News'].map(
              (link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(/\s+/g, '')}`}
                  className="footer-link"
                >
                  {link}
                </a>
              )
            )}
>>>>>>> Stashed changes
          </div>

          {/* Col 3: Academic Sections */}
          <div>
            <h4 className="footer-col-title">Academics</h4>
            {[
              'Primary Section',
              'Middle School',
              'O/L Classes',
              'A/L Classes',
              'Science Stream',
              'Arts Stream',
            ].map((item) => (
              <a key={item} href="#" className="footer-link">
                {item}
              </a>
            ))}
          </div>

          {/* Col 4: Contact Info */}
          <div>
            <h4 className="footer-col-title">Contact Us</h4>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
            {/* Location */}
            <div className="footer-contact-item">
              <svg
                className="footer-contact-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="footer-contact-text">
                Bandaranayake College, Gampaha, Sri Lanka
              </span>
            </div>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
            {/* Phone */}
            <div className="footer-contact-item">
              <svg
                className="footer-contact-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span className="footer-contact-text">+94 33 222 2XXX</span>
            </div>
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
            {/* Email */}
            <div className="footer-contact-item">
              <svg
                className="footer-contact-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="footer-contact-text">info@bcg.lk</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright">
<<<<<<< Updated upstream
            2025 Bandaranayake College, Gampaha. All Rights Reserved.
          </div>
          <div className="footer-tagline">
            bcg.lk   Excellence Since 1918
=======
            © 2025 Bandaranayake College, Gampaha. All Rights Reserved.
          </div>
          <div className="footer-tagline">
            bcg.lk • Excellence Since 1918
>>>>>>> Stashed changes
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;