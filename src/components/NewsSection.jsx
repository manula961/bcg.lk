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
    title: post.title || "Untitled Announcement",
    excerpt: post.excerpt || "No summary available for this announcement.",
    body: post.body || "",
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
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Drag-to-scroll State
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const isMouseDown = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

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
        (fetchedPosts) => { setPosts(fetchedPosts.map(toNewsCard)); setLoadError(false); },
        (error) => { console.error("Unable to load published news:", error); setLoadError(true); }
      );
    } catch (error) {
      console.error("Unable to subscribe to published news:", error);
      setLoadError(true);
    }
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDown.current) {
        isMouseDown.current = false;
        setIsDragging(false);
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const filters = ["All", "Announcements", "News"];
  const filtered =
    activeFilter === "All"
      ? posts
      : posts.filter((p) => p.category === activeFilter);

  const handleScrollUpdate = () => {
    if (!gridRef.current) return;
    const container = gridRef.current;
    const firstCard = container.querySelector(".news-card");
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 20;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }
    if (container.scrollLeft >= maxScroll - 10) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    } else {
      const index = Math.round(container.scrollLeft / cardWidth);
      setActiveIndex(Math.min(Math.max(0, filtered.length - 1), Math.max(0, index)));
    }
  };

  const handleDotClick = (index) => {
    if (!gridRef.current) return;
    const firstCard = gridRef.current.querySelector(".news-card");
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 20;
    gridRef.current.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  };

  const handleScroll = (direction) => {
    if (!gridRef.current) return;
    const firstCard = gridRef.current.querySelector(".news-card");
    const cardWidth = firstCard ? firstCard.offsetWidth + 20 : 340;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    gridRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleFilterChange = (filter) => {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
    setActiveIndex(0);
    if (gridRef.current) {
      gridRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const handleMouseDown = (e) => {
    if (!gridRef.current) return;
    isMouseDown.current = true;
    setHasDragged(false);
    dragStartX.current = e.pageX - gridRef.current.offsetLeft;
    dragScrollLeft.current = gridRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown.current || !gridRef.current) return;
    const x = e.pageX - gridRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
      setHasDragged(true);
    }
    gridRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
    setIsDragging(false);
  };

  const handleCardClick = (event) => {
    if (hasDragged || isMouseDown.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const dotsList = filtered;

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
            </div>
          </div>

          <div
            key={activeFilter}
            ref={gridRef}
            className={`news-grid ${isDragging ? "dragging" : ""}`}
            onScroll={handleScrollUpdate}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseUp}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {loadError && <p role="alert">News could not be loaded. Please try again later.</p>}
            {!loadError && filtered.length === 0 && <p>No published updates are available.</p>}
            {filtered.map((post) => (
              <a
                key={post.id}
                className="news-card"
                href={`/updates/${encodeURIComponent(post.id)}`}
                aria-label={`Read ${post.title}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
                onClick={handleCardClick}
              >
                {post.image ? (
                  <div
                    className="news-card-image-wrap"
                    style={{ backgroundImage: `url(${post.image})` }}
                  >
                    <div className="news-card-image-overlay" />
                    <div className="news-card-tag">{post.tag}</div>
                  </div>
                ) : (
                  <div className="news-card-image-wrap news-card-no-img">
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
                    Read More
                    <svg
                      className="news-card-link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="news-dots-container">
            {dotsList.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={`news-dot ${activeIndex === i ? "active" : ""}`}
                aria-label={`Jump to article ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;