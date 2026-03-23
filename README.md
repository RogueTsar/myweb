# myweb

Personal site for Vaishnavi Singh. Built with Jekyll templates, a Python build script for local preview, and Vercel serverless functions.

## Pages

- **Home** — holographic Balatro-style cards
- **Work** — research and professional experience
- **Music** — live Spotify dashboard (top artists, tracks, genres, playlists)
- **Blog** — writing on AI safety, governance, and policy

## Stack

- Jekyll layouts + Liquid templates
- Vercel for hosting + serverless API (`/api/spotify`)
- Spotify Web API (OAuth refresh token flow)
- Vanilla JS, no frameworks

## Local preview

```
python3 build-preview.py
python3 -m http.server 8000 --directory _site
```

Note: the Spotify dashboard requires Vercel's serverless runtime — it shows "Could not load data" locally.

## Deploy

Push to `main` — Vercel builds and deploys automatically.
