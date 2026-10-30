import React from "react";
import "./Footer.css";

const quickLinks = [
  ["Home", "/"],
  ["News", "/#news"],
  ["Events", "/#events"],
  ["Explore", "/#explore"],
];
const collegeLinks = [
  ["Academics", "/life/academic-excellence"],
  ["Sports & Societies", "/life/sports-societies"],
  ["School Leadership", "/life/leadership"],
  ["About Us", "/life/about-us"],
];

// Add confirmed profile URLs below when available. Icons without URLs are decorative,
// not dead links. Replace null with a verified URL to activate an icon.
const socials = [
  {
    name: "Facebook",
    url: "https://web.facebook.com/bandaranayakecollege/",
    icon: "facebook",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/bandaranayake_college/",
    icon: "instagram",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/school/bc-gampaha/",
    icon: "linkedin",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@bandaranayakecollege",
    icon: "youtube",
  }
];
const paths = {
  facebook: (
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
  ),
  instagram: (
    <>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="17.5" cy="6.5" r="1.2" />
    </>
  ),
  linkedin: (
    <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1ZM8.4 18H5.8V9.8h2.6V18ZM7.1 8.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM18.2 18h-2.6v-4c0-1-.02-2.2-1.35-2.2-1.34 0-1.55 1.05-1.55 2.14V18h-2.6V9.8h2.5v1.12h.04c.35-.66 1.2-1.35 2.47-1.35 2.65 0 3.1 1.74 3.1 4V18Z" />
  ),
  youtube: (
    <path d="M21.5 7.2a2.7 2.7 0 0 0-1.9-1.9C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.5 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.7 2.7 0 0 0 1.9-1.9c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
  ),
};
const mapUrl =
  "https://www.google.com/maps/search/?api=1&query=Bandaranayake+College+Gampaha+Sri+Lanka";
function LinkColumn({ title, items }) {
  return (
    <nav className="footer-column" aria-label={title}>
      <h2 className="footer-col-title">{title}</h2>
      <ul className="footer-link-list">
        {items.map(([label, href]) => (
          <li key={href}>
            <a className="footer-link" href={href}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
function SocialIcon({ social }) {
  const content = (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="currentColor"
      aria-hidden="true"
    >
      {paths[social.icon]}
    </svg>
  );
  return social.url ? (
    <a
      className="footer-social-btn"
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.name}
      title={social.name}
    >
      {content}
    </a>
  ) : (
    <span
      className="footer-social-btn footer-social-pending"
      title={`${social.name} — link coming soon`}
      aria-label={`${social.name} link coming soon`}
    >
      {content}
    </span>
  );
}
export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="footer-gradient-bar" aria-hidden="true" />
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-brand">
            <a
              href="/"
              className="footer-brand-header"
              aria-label="Bandaranayake College homepage"
            >
              <img
                src="/email-assets/school-logo.png"
                alt="Bandaranayake College crest"
                className="footer-logo"
                loading="lazy"
              />
              <span className="footer-brand-name">
                <strong>Bandaranayake College</strong>
                <span>Gampaha, Sri Lanka</span>
              </span>
            </a>
            <p className="footer-brand-desc">
              A proud tradition of knowledge, character, leadership and
              brotherhood since 1918.
            </p>
            <p className="footer-social-label">Connect with us</p>
            <div className="footer-socials">
              {socials.map((s) => (
                <SocialIcon key={s.name} social={s} />
              ))}
            </div>
          </div>
          <LinkColumn title="Quick Links" items={quickLinks} />
          <LinkColumn title="Explore More" items={collegeLinks} />
          <div className="footer-column footer-contact">
            <h2 className="footer-col-title">Find Us</h2>
            <a
              className="footer-contact-link"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="footer-contact-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>Bandaranayake College, Gampaha, Sri Lanka</span>
            </a>
            <a className="footer-contact-link" href="tel:+94332222202">
              <svg className="footer-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.25a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92Z" /></svg>
              <span>+94 33 222 2202</span>
            </a>
            <a className="footer-contact-link" href="mailto:info@bcg.lk">
              <svg className="footer-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" /></svg>
              <span>info@bcg.lk</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <p>
            © {new Date().getFullYear()} Bandaranayake College, Gampaha. All
            rights reserved.
          </p>
          <p>
            <img
              src="/email-assets/BCCS-Logo.png"
              alt="#TeamBCCS"
              className="footer-bottom-logo"
            />
            <span className="footer-bottom-dot" aria-hidden="true" />
            Excellence since 1918
          </p>
        </div>
      </div>
    </footer>
  );
}
