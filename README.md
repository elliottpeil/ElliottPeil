# Personal Website

## Overview
Static personal site with four sections — Music, Videos, Images, and Writing — linked from the landing page. The homepage features an animated ASCII header. No build tools or server-side code required.

## Tech
- HTML/CSS/JavaScript only (no framework)
- Animated ASCII header: `js/ascii-morph.js`
- Site behavior/helpers: `js/app.js`

## Structure
```
.
├── index.html            # Landing page with ASCII header + section links
├── html/
│   ├── music.html        # Music section
│   ├── videos.html       # Videos section
│   ├── images.html       # Images section
│   └── writing.html      # Writing section
├── css/
│   └── main.css          # Global styles (including writing styles)
├── js/
│   ├── ascii-morph.js    # ASCII header animation
│   └── app.js            # Optional enhancements (section links, helpers)
├── images/               # Image assets for the site
├── thumbnails/           # Images for video preview
├── covers/               # Cover images (e.g., for videos/audio)
├── music/                # Audio files
└── videos/               # Video files
```

## Run Locally
- Quick open: double‑click `index.html` in a browser.
- Recommended (avoids some browser file:// issues):
  - Python: `python3 -m http.server 5500` then visit http://localhost:5500

## Customize
- Styles: edit `css/main.css`.
- ASCII header: tune constants and behavior in `js/ascii-morph.js` and the ASCII art blocks embedded in `index.html` (script tags with `class="art"`).
- Section pages: update content in `html/*.html`.
- Optional JS helpers: `js/app.js` includes small utilities for section navigation and a simple music list hook; pages work without it.

## Content
- Place media in the corresponding folders (`images/`, `thumbnails/`, `covers/`, `music/`, `videos/`).
- Reference files using relative paths from the HTML file you are editing (e.g., an image on `images.html` can use `../images/foo.jpg`).

## Deploy
Because it is a static site, you can host the repository root with any static hosting (GitHub Pages, Netlify, Vercel, S3, etc.). The site entry is `index.html` at the project root.

## Notes
- This README reflects the current repository layout (no `public/` directory).
