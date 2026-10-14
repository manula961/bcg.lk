import React, { useEffect, useRef, useState } from "react";
import "./NewsSection.css";
import { subscribePublishedNews } from "../lib/newsService";

function toNewsCard(post) {
  const date = (post.publishedAt ?? post.createdAt)?.toDate?.();
  const formattedDate =
    date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  return {
    id: post.id,
    category: post.category === "Announcements" ? "Announcements" : "News",
    title: post.title || "",
    excerpt: post.excerpt || "",
    date: formattedDate,
    image: post.imageUrl || "",
    tag: post.tag || "",
  };
}

const NewsSection = () => {
  const sectionRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [visible, setVisible] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribePublishedNews(
        (fetchedPosts) => setPosts(fetchedPosts.map(toNewsCard)),
        (error) => console.error("Unable to load published news:", error)
      );
    } catch (error) {
      console.error("Unable to subscribe to published news:", error);
    }
    return () => unsubscribe();
  }, []);

  const filters = ["All", "Announcements", "News"];
  const filtered =
    activeFilter === "All"
      ? posts
      : posts.filter((p) => p.category === activeFilter);

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