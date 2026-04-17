# myweb

my personal website B^) it does way too much for a personal website but i genuinely cannot stop adding things to it, i am a frontend crackhead at heart who was one of the Framer OGs and had a website that was basically just one long Apple advertisement (not sorry)

stay tuned to see all the cool apis, integrations and the eventual CMS i will put in lol 

live at **[vaishnavi-singh.com](https://vaishnavi-singh.com)**

---

## pages

- **Home** — holographic Balatro-style tarot cards (they flip!!), about me, work timeline, now playing widget, latest publication, research interests graph. liquid gradient blobs float behind everything in light and dark mode
- **Work** — research and professional experience, with tags and descriptions. still filling this out
- **Music** — full live Spotify dashboard. top artists, top tracks (4 different views: CD carousel, wheel, showcase grid, bar chart), vinyl shelf, playlists with metadata (last played, last updated, top genre, top artist), genres across time, listening personality breakdown with evolution chart, play counts on everything. it's a lot
- **Blog** — writing on AI safety, governance, and policy. coming sooooon

---

## stack

- **Vercel** — hosting + serverless functions
- **Spotify Web API** — OAuth refresh token flow, all the endpoints
- **Vanilla JS** — no frameworks, no build tools beyond the custom `build.cjs` that assembles everything into `_site/`
- **Jekyll-style templates** — a tiny handwritten template engine in `build.cjs` because actual Jekyll was too annoying to configure on Vercel

---

## how the spotify thing works

there's a `/api/spotify.js` serverless function that:
1. refreshes an OAuth token using a stored refresh token (env vars on Vercel)
2. fires 10 parallel Spotify API requests — currently playing, top artists (3 time ranges), top tracks (3 time ranges), recently played, playlists, profile
3. enriches the top 15 playlists with last-updated, top artist, top genre via batched `/artists?ids=` lookups
4. derives play counts from recently-played history + a rank-weighted monthly estimate (Spotify doesn't expose play counts directly, which is annoying)
5. computes a listening personality score (obscurity, mainstream, loyalty, diversity, genre breadth)
6. returns everything as one big JSON blob

there's also `/api/spotify-details.js` for track-level audio features used by the playlist generator.

to get a refresh token locally: `node scripts/get-spotify-token.js`

---

## music history snapshots

the personality evolution chart reads from `/assets/data/history/*.json`. these get created over time — one per month — as the snapshot script runs. currently just one data point (now) so the chart is lonely but it'll grow

---

## env vars needed

```
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REFRESH_TOKEN
```

set these in Vercel project settings. locally they go in `.env` (gitignored).

---

## local dev

```bash
node build.cjs        # builds source → _site/
python3 -m http.server 8000 --directory _site   # serve locally
```

note: the Spotify API calls won't work locally (Vercel functions don't run with the Python server). use the deployed preview URL if you need to test the music dashboard.

---

inspired by david africa's website :')
