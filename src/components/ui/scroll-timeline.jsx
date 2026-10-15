"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ScrollTimeline({ milestones = [] }) {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const triggerPoint = windowHeight * 0.65;
      const totalHeight = rect.height;
      const scrolledPast = triggerPoint - rect.top;

      let progress = scrolledPast / totalHeight;
      progress = Math.max(0, Math.min(1, progress));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8" ref={containerRef}>
      <div className="relative">
        {/* Central Spine Track */}
        <div className="absolute left-4 md:left-1/2 top-8 bottom-8 w-[2px] bg-neutral-200 -translate-x-1/2" />

        {/* Animated Active Progress Line */}
        <div
          className="absolute left-4 md:left-1/2 top-8 w-[2px] bg-[#7B1C1C] -translate-x-1/2 transition-all duration-150 ease-out z-0"
          style={{ height: `${scrollProgress * 100}%` }}
        />

        {/* Milestone Cards */}
        <div className="flex flex-col gap-10 md:gap-12 relative z-10">
          {milestones.map((milestone, index) => {
            const itemThreshold = index / (milestones.length - 1 || 1);
            const isActive = scrollProgress >= itemThreshold - 0.04;
            const isEven = index % 2 === 0;

            return (
              <div
                key={milestone.id || index}
                className={`relative flex flex-col md:flex-row ${
                  isEven ? "md:flex-row-reverse" : ""
                } items-start w-full group`}
              >
                {/* Center Node Dot */}
                <div
                  className={`absolute left-4 md:left-1/2 top-7 w-5 h-5 rounded-full border-2 -translate-x-1/2 z-20 flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? "border-[#7B1C1C] bg-white scale-110 shadow-md shadow-[#7B1C1C]/30"
                      : "border-neutral-300 bg-white scale-100"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isActive ? "bg-[#7B1C1C]" : "bg-neutral-300"
                    }`}
                  />
                </div>

                {/* Horizontal Connector Stem (Desktop) */}
                <div
                  className={`hidden md:block absolute top-9 h-[2px] z-0 transition-colors duration-500 ${
                    isActive ? "bg-[#7B1C1C]/40" : "bg-neutral-200"
                  } ${
                    isEven
                      ? "right-1/2 w-8"
                      : "left-1/2 w-8"
                  }`}
                />

                {/* Desktop Grid Spacer */}
                <div className="hidden md:block w-1/2" />

                {/* Milestone Card */}
                <div
                  className={`w-full md:w-1/2 pl-12 md:pl-0 ${
                    isEven ? "md:pr-10 md:text-right" : "md:pl-10 md:text-left"
                  } transition-all duration-700 ease-out ${
                    isActive
                      ? "opacity-100 translate-y-0"
                      : "opacity-35 translate-y-6"
                  }`}
                >
                  <div
                    className="p-6 sm:p-7 rounded-2xl bg-white border border-black/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.035)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:border-[#7B1C1C]/25 transition-all duration-300"
                    style={{ fontFamily: "'Geologica', sans-serif" }}
                  >
                    {/* Date Tag */}
                    <div className="inline-block px-3 py-1 mb-3 rounded-full border border-[#C9A84C]/40 bg-[#FAF8F5] text-xs font-semibold tracking-wider text-[#7B1C1C] uppercase">
                      {milestone.date}
                    </div>

                    {/* Title */}
                    <h3
                      className="text-lg sm:text-xl font-bold tracking-tight text-[#1a1a1a] leading-snug mb-2"
                      style={{ fontFamily: "'Google Sans Flex', sans-serif" }}
                    >
                      {milestone.title}
                    </h3>

                    {/* Body Text */}
                    <p className="text-xs sm:text-sm text-[#555555] font-light leading-relaxed m-0">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}