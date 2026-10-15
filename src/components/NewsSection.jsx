import React, { useEffect, useRef, useState } from "react";
import "./NewsSection.css";
import { subscribePublishedNews } from "../lib/newsService";

function toNewsCard(post) {
  const date = (post.publishedAt ?? post.createdAt)?.toDate?.();
  const formattedDate =
    date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  return {
    id: post.id,
    category: post.category === "Announcements" ? "Announcements" : "News",
    title: post.title || "Untitled Post",
    excerpt: post.excerpt || "No summary available for this post.",
    date: formattedDate,
    image: post.imageUrl || "",
    tag: post.tag || post.category || "General",
  };
}

const NewsSection = () => {
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [visible, setVisible] = useState(false);
  const [posts, setPosts] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Drag-to-scroll State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
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

  // Update active dot dynamically based on actual scroll position
  const handleScrollUpdate = () => {
    if (!gridRef.current) return;
    const container = gridRef.current;
    const firstCard = container.querySelector(".news-card");
    if (!firstCard) return;

    const cardWidth = firstCard.offsetWidth + 24; // Width + CSS Gap
    const maxScroll = container.scrollWidth - container.clientWidth;

    if (container.scrollLeft >= maxScroll - 10) {
      setActiveIndex(filtered.length - 1);
    } else {
      const index = Math.round(container.scrollLeft / cardWidth);
      setActiveIndex(Math.min(filtered.length - 1, Math.max(0, index)));
    }
  };

  const handleDotClick = (index) => {
    if (!gridRef.current) return;
    const firstCard = gridRef.current.querySelector(".news-card");
    if (!firstCard) return;

    const cardWidth = firstCard.offsetWidth + 24;
    gridRef.current.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  };

  const handleScroll = (direction) => {
    if (!gridRef.current) return;
    const firstCard = gridRef.current.querySelector(".news-card");
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : 364;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    gridRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setActiveIndex(0);
    if (gridRef.current) {
      gridRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const handleMouseDown = (e) => {
    if (!gridRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - gridRef.current.offsetLeft);
    setScrollLeft(gridRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging || !gridRef.current) return;
    e.preventDefault();
    const x = e.pageX - gridRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    gridRef.current.scrollLeft = scrollLeft - walk;
  };

  const filters = ["All", "Announcements", "News"];
  const filtered =
    activeFilter === "All"
      ? posts
      : posts.filter((p) => p.category === activeFilter);

  return (
    <section id="news" ref={sectionRef} className="news-section">
      <div className="news-bg-texture" />
      <div className="news-container">
        <div className={`news-content-group ${visible ? "visible" : ""}`}>
          <div className="news-header-container">
            <div>
              <div className="news-subtitle">Nayakenz</div>
              <h2 className="news-title">Latest Updates</h2>
              <div className="events-divider-wrap">
                <div className="news-divider-maroon" />
                <div className="news-divider-blue" />
              </div>
            </div>

            <div className="news-controls">
              <div className="news-filters">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFilterChange(f)}
                    className={`filter-btn ${
                      activeFilter === f ? "active" : ""
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filtered.length > 1 && (
                <div className="news-scroll-arrows">
                  <button
                    onClick={() => handleScroll("left")}
                    className="scroll-arrow-btn"
                    aria-label="Scroll left"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleScroll("right")}
                    className="scroll-arrow-btn"
                    aria-label="Scroll right"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            ref={gridRef}
            className="news-grid"
            data-lenis-prevent
            onScroll={handleScrollUpdate}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {filtered.map((post) => (
              <div key={post.id} className="news-card">
                {post.image ? (
                  <div
                    className="news-card-image-wrap"
                    style={{ backgroundImage: `url(${post.image})` }}
                  >
                    <div className="news-card-image-overlay" />
                    <div className="news-card-tag">{post.tag}</div>
                  </div>
                ) : (
                  <div className="news-card-image-wrap" style={{ height: "70px" }}>
                    <div className="news-card-tag">{post.tag}</div>
                  </div>
                )}
                <div className="news-card-content">
                  <div>
                    <div className="news-card-meta">
                      {post.category} {post.date ? ` • ${post.date}` : ""}
                    </div>
                    <h3 className="news-card-title">{post.title}</h3>
                    <p className="news-card-excerpt">{post.excerpt}</p>
                  </div>
                  <span className="news-card-link">
                    Read More <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Navigation Dots Bar */}
          {filtered.length > 1 && (
            <div className="news-dots-container">
              {filtered.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={`news-dot ${activeIndex === i ? "active" : ""}`}
                  aria-label={`Jump to article ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;