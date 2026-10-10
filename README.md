# BCG.lk — Bandaranayake College, Gampaha Website

A modern, production-grade frontend for bcg.lk built with React + Vite + GSAP.

## Tech Stack
- **React 18** — UI components
- **Vite** — Build tool & dev server
- **GSAP** — Loading animation (curtain reveal)
- **Tailwind CSS** — Utility classes
- **Google Fonts** — Cinzel, EB Garamond, Oswald (matches design aesthetic)

## Color Palette
| Name | Hex |
|------|-----|
| Maroon | `#7B1C1C` |
| Gold | `#C9A84C` |
| Navy Blue | `#1a3a6b` |
| Dark | `#0a0a0a` |
| White | `#ffffff` |

## File Structure
```
src/
├── components/
│   ├── LoadingAnimation.jsx   # GSAP curtain reveal with college branding
│   ├── MenuBar.jsx            # Floating hamburger → full-screen card menu
│   ├── HeroSection.jsx        # Hero with parallax, spinning logo ring
│   ├── NewsSection.jsx        # Nayakenz Latest Updates (maroon bg)
│   ├── EventsSection.jsx      # Latest Events (white bg, timeline list)
│   ├── ExploreSection.jsx     # Explore the School (dark bg, tab selector)
│   ├── LifeAsNayaken.jsx      # Bento grid + stats (white bg)
│   └── Footer.jsx             # Modern dark footer
├── App.jsx                    # Root — handles loading → main flow
├── main.jsx                   # React DOM entry
└── index.css                  # Global fonts, CSS variables, scrollbar
```

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```
