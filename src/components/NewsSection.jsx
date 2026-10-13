import React, { useEffect, useRef, useState } from "react";
import "./NewsSection.css";

const dummyPosts = [
  {
    id: 1,
    category: "Announcements",
    title: "G.D. Sarath Bandu Gunasekara Appointed As Principal",
    excerpt:
      "We are proud to announce the appointment of G.D. Sarath Bandu Gunasekara as the new Principal of Bandaranayake College, Gampaha.",
    date: "April 28, 2025",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHFi2ydNxZmDXQRwWkqIV998md4xNiODOXw6bgfDAvvw_Hf2bBJbfhlFs&s=10",
    tag: "Leadership",
  },
  {
    id: 2,
    category: "News",
    title: "Annual Prize Giving Ceremony 2024 - A Night to Remember",
    excerpt:
      "The annual Prize Giving Ceremony celebrated academic excellence, sporting achievements, and cultural contributions of our students.",
    date: "March 15, 2025",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHFi2ydNxZmDXQRwWkqIV998md4xNiODOXw6bgfDAvvw_Hf2bBJbfhlFs&s=10",
    tag: "Events",
  },
  {
    id: 3,
    category: "News",
    title: "BCG Wins Provincial Schools Football Championship",
    excerpt:
      "Our football team has brought glory to the college by winning the Western Province Schools Football Championship for the third consecutive year.",
    date: "February 10, 2025",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHFi2ydNxZmDXQRwWkqIV998md4xNiODOXw6bgfDAvvw_Hf2bBJbfhlFs&s=10",
    tag: "Sports",
  },
];

const NewsSection = () => {
  const sectionRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filters = ["All", "Announcements", "News"];
  const filtered =
    activeFilter === "All"
      ? dummyPosts
      : dummyPosts.filter((p) => p.category === activeFilter);

  return (
    <section id="news" ref={sectionRef} className="news-section">
      {/* Background texture */}
      <div className="news-bg-texture" />

      <div className="news-container">
        {/* Top Header & Horizontal Filters Bar */}
        <div
          className={`news-header-container ${
            visible ? "news-header-visible" : "news-header-init"
          }`}
        >
          {/* Header Title */}
          <div>
            <div className="news-subtitle">Nayakenz</div>
            <h2 className="news-title">LATEST UPDATES</h2>
            <div className="events-divider-wrap">
              <div className="news-divider-maroon" />
              <div className="news-divider-blue" />
            </div>
            
          </div>

          {/* Horizontal Filter Buttons */}
          <div className="news-filters">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`filter-btn ${activeFilter === f ? "active" : ""}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal Card Grid with Vertical Content Layout */}
        <div className="news-grid">
          {filtered.map((post, i) => (
            <div
              key={post.id}
              className={`news-card ${
                visible ? "news-card-visible" : "news-card-init"
              }`}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              {/* Top Image */}
              <div
                className="news-card-image-wrap"
                style={{ backgroundImage: `url(${post.image})` }}
              >
                <div className="news-card-image-overlay" />
                <div className="news-card-tag">{post.tag}</div>
              </div>

              {/* Bottom Vertical Content */}
              <div className="news-card-content">
                <div>
                  <div className="news-card-meta">
                    {post.category} • {post.date}
                  </div>
                  <h3 className="news-card-title">{post.title}</h3>
                  <p className="news-card-excerpt">{post.excerpt}</p>
                </div>

                <span className="news-card-link">Read More →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
