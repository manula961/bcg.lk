import React from 'react';
import { navigateBack } from './clientNavigation';

/** Keeps each page's existing return-button class and visual treatment. */
export default function BackButton({ fallback = '/', className = '', children = 'BACK' }) {
  const handleBack = (event) => {
    // Preserve open-in-new-tab and browser context-menu behavior for anchors.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateBack(fallback);
  };

  return (
    <a href={fallback} className={className} onClick={handleBack} aria-label="Go back to previous page">
      <svg className="return-arrow-icon" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span>{children}</span>
    </a>
  );
}
