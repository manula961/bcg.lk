import React from 'react';
import Timeline from './timeline/Timeline';
import PastPapersPreview from './PastPapersPreview';
import ContentDirectory from './ContentDirectory';

/** Content selection for the four /life/:slug pages; shared layout stays in LifeDetailPage. */
export default function LifePageSections({ slug }) {
  switch (slug) {
    case 'about-us':
      return <Timeline />;
    case 'academic-excellence':
      return <PastPapersPreview />;
    case 'sports-societies':
      return (
        <>
          <ContentDirectory kind="societies" />
          <ContentDirectory kind="sports" />
        </>
      );
    case 'leadership':
      return <ContentDirectory kind="leadership" />;
    default:
      return null;
  }
}
