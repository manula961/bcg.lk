import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./NewsSection.css";
import { subscribePublishedNews } from "../../lib/newsService";

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
  const [loadState, setLoadState] = useState('loading');
  const [retry, setRetry] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const popupRef = useRef(null);
  const overlayRef = useRef(null);

  // Keep the dialog mounted while its exit animation finishes.
  const closePopup = () => {
    if (isPopupClosing || !selectedPost) return;
    setIsPopupClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedPost(null);
      setIsPopupClosing(false);
      closeTimerRef.current = null;
    }, 320);
  };

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Pointer drag state kept in refs to avoid re-rendering on every movement.
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

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
    setLoadState('loading');
    const onError = error => {
      console.error('Unable to load published news:', error);
      setLoadState('error');
    };
    try {
      unsubscribe = subscribePublishedNews(fetchedPosts => {
        setPosts(fetchedPosts.map(toNewsCard));
        setLoadState('ready');
      }, onError);
    } catch (error) {
      onError(error);
    }
    return () => unsubscribe();
  }, [retry]);


  useEffect(() => {
    if (!selectedPost) return;

    const popup = popupRef.current;
    const overlay = overlayRef.current;
    const oldBodyOverflow = document.body.style.overflow;
    const oldHtmlOverflow = document.documentElement.style.overflow;
    const previousFocus = document.activeElement;

    // Lock both potential page scrollers while the dialog is open.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === "Escape") closePopup();
    };

    // Animate wheel scrolling toward a shared target rather than applying
    // each wheel delta immediately (which causes visible jumping).
    let frameId = null;
    let targetScroll = popup?.scrollTop ?? 0;
    let currentScroll = targetScroll;

    const animateScroll = () => {
      if (!popup) return;
      const maxScroll = Math.max(0, popup.scrollHeight - popup.clientHeight);
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      currentScroll += (targetScroll - currentScroll) * 0.18;

      if (Math.abs(targetScroll - currentScroll) < 0.5) {
        currentScroll = targetScroll;
        popup.scrollTop = currentScroll;
        frameId = null;
        return;
      }

      popup.scrollTop = currentScroll;
      frameId = window.requestAnimationFrame(animateScroll);
    };

    const handlePopupWheel = (event) => {
      if (event.ctrlKey) return; // Preserve browser zoom gestures.
      event.preventDefault();
      event.stopPropagation();
      if (!popup) return;
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? popup.clientHeight : 1;
      const maxScroll = Math.max(0, popup.scrollHeight - popup.clientHeight);
      // Keep rapid wheel events moving the target instead of restarting animations.
      if (frameId === null) currentScroll = popup.scrollTop;
      targetScroll = Math.max(0, Math.min(targetScroll + event.deltaY * multiplier, maxScroll));
      if (frameId === null) frameId = window.requestAnimationFrame(animateScroll);
    };

    const preventOverlayWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleEscape);
    popup?.addEventListener("wheel", handlePopupWheel, { passive: false });
    overlay?.addEventListener("wheel", preventOverlayWheel, { passive: false });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldHtmlOverflow;
      window.removeEventListener("keydown", handleEscape);
      popup?.removeEventListener("wheel", handlePopupWheel);
      overlay?.removeEventListener("wheel", preventOverlayWheel);
      previousFocus?.focus?.();
    };
  }, [selectedPost]);

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

  const handlePointerDown = (e) => {
    dragRef.current.moved = false;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Native touch scrolling remains enabled.
    if (e.pointerType !== "mouse") return;
    const grid = gridRef.current;
    if (!grid) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: grid.scrollLeft,
    };
    // Capture only after dragging starts; capturing on mouse-down
    // redirects the link click to the grid instead of the card.
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.active || !gridRef.current) return;
    const delta = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) > 5) {
      drag.moved = true;
      setIsDragging(true);
      if (!gridRef.current.hasPointerCapture(e.pointerId)) {
        gridRef.current.setPointerCapture(e.pointerId);
      }
    }
    if (drag.moved) {
      gridRef.current.scrollLeft = drag.scrollLeft - delta;
    }
  };

  const handlePointerUp = (e) => {
    dragRef.current.active = false;
    setIsDragging(false);
    if (gridRef.current?.hasPointerCapture(e.pointerId)) {
      gridRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleCardClick = (event, post) => {
    event.preventDefault();
    if (dragRef.current.moved) {
      event.stopPropagation();
      // Suppress only the click following a drag.
      dragRef.current.moved = false;
      return;
    }
    setIsPopupClosing(false);
    setSelectedPost(post);
  };

  const dotsList = filtered.length > 1 ? filtered : [];

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
                    aria-pressed={activeFilter === f}
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
                  disabled={filtered.length < 2}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={() => handleScroll("right")}
                  className="scroll-arrow-btn"
                  aria-label="Scroll right"
                  disabled={filtered.length < 2}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {loadState === 'loading' && (
            <p role="status" className="text-white/70 py-8">Loading published updates…</p>
          )}
          {loadState === 'error' && (
            <div role="alert" className="text-white/80 py-8">
              <p>Updates could not be loaded. Please check your connection.</p>
              <button type="button" className="filter-btn mt-3" onClick={() => setRetry(n => n + 1)}>Try again</button>
            </div>
          )}
          {loadState === 'ready' && filtered.length === 0 && (
            <p role="status" className="text-white/70 py-8">
              {posts.length ? 'No updates match this filter.' : 'No published updates yet.'}
            </p>
          )}
          <div
            key={activeFilter}
            ref={gridRef}
            className={`news-grid ${isDragging ? "dragging" : ""}`}
            onScroll={handleScrollUpdate}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
            onDragStart={(e) => e.preventDefault()}
          >
            {filtered.map((post) => (
              <button
                type="button"
                key={post.id}
                className="news-card"
                aria-label={`Read ${post.title}`}
                onClick={(event) => handleCardClick(event, post)}
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
              </button>
            ))}
          </div>

          {dotsList.length > 0 && <div className="news-dots-container">
            {dotsList.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={`news-dot ${activeIndex === i ? "active" : ""}`}
                aria-label={`Jump to article ${i + 1}`}
              />
            ))}
          </div>}
        </div>
      </div>
      {selectedPost && createPortal(
        <div
          className={`news-modal-overlay ${isPopupClosing ? "news-popup-closing" : ""}`}
          ref={overlayRef}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePopup();
          }}
        >
          <div
            className="news-modal-content news-full-popup"
            ref={popupRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-popup-title"
            tabIndex={-1}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="news-modal-close"
              aria-label="Close announcement"
              onClick={closePopup}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            {selectedPost.image && (
              <img
                className="news-modal-img"
                src={selectedPost.image}
                alt={selectedPost.title}
              />
            )}
            <div className="news-modal-body">
              <div className="news-card-meta">
                {selectedPost.category}{selectedPost.date ? ` • ${selectedPost.date}` : ""}
              </div>
              {selectedPost.tag && (
                <div className="news-modal-tag">{selectedPost.tag}</div>
              )}
              <h3 id="news-popup-title" className="news-modal-title">
                {selectedPost.title}
              </h3>
              <div className="news-modal-text">
                {selectedPost.body || selectedPost.excerpt}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default NewsSection;