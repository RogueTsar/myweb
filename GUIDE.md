# Site Guide

How to modify, maintain, and deploy this site.

---

## Site Structure

```
.
├── index.html          # Home page (holographic cards + telescopic bio)
├── work.html           # Work/research page
├── music.html          # Spotify dashboard + SoundCloud embed
├── blog.html           # Blog listing page
├── _includes/
│   ├── head.html       # <head> tag (meta, CSS, favicon)
│   ├── header.html     # Navigation bar
│   └── footer.html     # Footer with copyright
├── _layouts/
│   └── default.html    # Base page layout (wraps all pages)
├── _posts/             # Blog posts (Markdown files)
├── assets/
│   ├── css/styles.css  # All styles (numbered sections)
│   ├── js/             # JavaScript (holo-cards, telescopic, music)
│   ├── images/         # Card images, etc.
│   └── documents/      # PDFs
├── api/
│   └── spotify.js      # Vercel serverless function for Spotify API
├── build-preview.py    # Local build script (assembles Jekyll templates)
├── vercel.json         # Vercel deployment config
└── package.json        # Node.js config (for Vercel serverless)
```

---

## Modifying Pages

Each page (`index.html`, `work.html`, `music.html`, `blog.html`) has a front matter block at the top:

```yaml
---
layout: default
title: "Page Title"
---
```

Edit the HTML below the front matter to change page content. The layout wraps your content in the header, footer, and `<head>`.

### Navigation

Edit `_includes/header.html` to change nav links. Each link looks like:

```html
<a href="{{ '/page.html' | relative_url }}" {% if page.url == '/page.html' %}class="active"{% endif %}>Label</a>
```

If you add or remove a page, also update `build-preview.py`:
- Line with `for page in [...]` — add/remove the filename
- The `set_active` function — add/remove the elif condition

---

## Adding Blog Posts

1. Create a file in `_posts/` named `YYYY-MM-DD-your-slug.md`:

```markdown
---
layout: post
title: "Your Post Title"
date: 2026-03-15
---

Your post content in Markdown. Paragraphs are separated by blank lines.

Second paragraph here.
```

2. The blog listing page auto-generates from all `.md` files in `_posts/`.
3. Post URLs become `/blog/your-slug.html`.
4. Rebuild locally to preview: `python3 build-preview.py`

---

## CSS Structure

`assets/css/styles.css` is organized in numbered sections:

1. Base / Reset
2. Typography
3. Layout
4. Header / Nav
5. Telescopic Text
6. Holographic Cards (home page)
7. Work Page
8. Music Page (bar charts, last-played card, loading skeletons)
9. Blog
10. *(deleted — was CV)*
11. Footer
12. Responsive (`@media max-width: 600px`)

When editing styles, find the relevant section number. Keep changes within the section to maintain organization.

---

## Spotify Configuration

### How it works

1. The client (`assets/js/music.js`) calls `/api/spotify`
2. The serverless function (`api/spotify.js`) uses a refresh token to get a fresh Spotify access token
3. It fetches 3 endpoints in parallel: currently playing, top artists, top tracks
4. Results are cached for 3 minutes by Vercel's CDN

### Environment Variables (set in Vercel dashboard)

- `SPOTIFY_CLIENT_ID` — from your Spotify Developer app
- `SPOTIFY_CLIENT_SECRET` — from your Spotify Developer app
- `SPOTIFY_REFRESH_TOKEN` — obtained via OAuth flow (see below)

### Changing what's displayed

In `api/spotify.js`:
- Change `time_range=short_term` to `medium_term` (6 months) or `long_term` (all time)
- Change `limit=10` to show more/fewer items

In `assets/js/music.js`:
- Modify `renderBarChart()` to change bar chart styling
- Modify `renderLastPlayed()` to change the now-playing card

### Getting a Spotify Refresh Token

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Set the redirect URI to `http://localhost:3000/callback`
3. Note your Client ID and Client Secret
4. Open this URL in your browser (replace `YOUR_CLIENT_ID`):

```
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/callback&scope=user-read-currently-playing%20user-read-recently-played%20user-top-read
```

5. After authorizing, you'll be redirected to `localhost:3000/callback?code=LONG_CODE_HERE`
6. Copy the `code` parameter and run:

```bash
curl -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

7. The response contains a `refresh_token`. Save it — this is your `SPOTIFY_REFRESH_TOKEN`.
8. Add all three env vars in Vercel: Settings > Environment Variables.

---

## Local Development

### Without Spotify (static preview)

```bash
python3 build-preview.py
python3 -m http.server 8000 --directory _site
```

Open `http://localhost:8000`. The music page will show loading skeletons then error state (no API available locally).

### With Spotify (full preview via Vercel CLI)

```bash
npm i -g vercel
vercel env pull .env.local    # pulls env vars from Vercel
vercel dev                     # runs dev server with serverless functions
```

---

## Deployment

The site deploys to **Vercel** (free tier).

### Initial setup

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com), import the repo
3. Vercel auto-detects `vercel.json` — no framework, build command is `python3 build-preview.py`, output dir is `_site`
4. Add Spotify env vars in Settings > Environment Variables
5. Deploy

### Ongoing

- Push to `main` branch — auto-deploys
- Or run `vercel --prod` from the command line

### Custom domain

In Vercel dashboard: Settings > Domains > Add your domain.

---

## Holographic Cards (Home Page)

The three Balatro cards on the home page are in `index.html`. To change:

- **Card images**: Replace files in `assets/images/` (joker.png, canio.png, perkeo.png). Keep them 142x190px for pixel art crispness.
- **Quotes**: Edit the `.holo-card__quote` and `.holo-card__author` text in `index.html`
- **Effects**: Edit `assets/js/holo-cards.js` for tilt/shine behavior, `assets/css/styles.css` Section 6 for visual styling
