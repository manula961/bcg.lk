// GA4 is optional until VITE_GA_MEASUREMENT_ID is configured in Vercel.
// Never include authentication credentials or personal information in analytics events.
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
let initialized = false;
let lastPage = null;

export function trackPageView() {
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '')) return;
  // Never send query strings: they can contain emails, passwords, OAuth codes or tokens.
  // Page-view metrics are deliberately path-only and exclude the admin console.
  const page = window.location.pathname;
  if (/^\/admin(?:\/|$)/.test(page)) return;
  if (page === lastPage) return;
  lastPage = page;

  if (!initialized) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Disable automatic page views: the React router reports them below.
    window.gtag('config', measurementId, { send_page_view: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
    initialized = true;
  }

  window.gtag('event', 'page_view', {
    page_location: window.location.origin + page,
    page_path: page,
    page_title: document.title,
  });
}
