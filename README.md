# myweb

my personal website B^) it does way too much for a personal website but i genuinely cannot stop adding things to it, i am a frontend crackhead at heart who was one of the Framer OGs and had a website that was basically just one long Apple advertisement (not sorry)

stay tuned to see all the cool apis, integrations and the eventual CMS i will put in lol 

live at **[vaishnavi-singh.com](https://vaishnavi-singh.com)**

---

## pages

- **Home** — holographic Balatro-style tarot cards (they flip!!), about me, work timeline, latest publication, research interests graph. liquid gradient blobs float behind everything in light and dark mode
- **Work** — research and professional experience, with tags and descriptions. still filling this out
- **Blog** — writing on AI safety, governance, and policy. coming sooooon

---

## stack

- **Vercel** — hosting + serverless functions
- **Vanilla JS** — no frameworks, no build tools beyond the custom `build.cjs` that assembles everything into `_site/`
- **Jekyll-style templates** — a tiny handwritten template engine in `build.cjs` because actual Jekyll was too annoying to configure on Vercel

---

## local dev

```bash
node build.cjs        # builds source → _site/
python3 -m http.server 8000 --directory _site   # serve locally
```

---

inspired by david africa's website :')
