# Infinite Resolution Jar

A contemplative, archival website displaying human resolutions as scrollable marbles.

## Local Development

Simply open `index.html` in a browser, or use a local server:

```bash
python3 -m http.server 8000
# or
npx serve
```

## Deployment

This project is configured for Vercel:

```bash
vercel
```

## Structure

- `index.html` - Main HTML structure
- `styles.css` - All styling with New York-esque palette
- `script.js` - Vanilla JavaScript for interactions
- `resolutions.json` - Resolution data
- `design.md` - Complete design specification

## Features

- Infinite vertical scroll (newest at top, oldest at bottom)
- Intro animation: smooth scroll from bottom to top on load
- Click/tap marbles to expand and view metadata
- Respects `prefers-reduced-motion`
- Clean, maintainable vanilla JavaScript
- Ready for 100+ marbles without virtualization
