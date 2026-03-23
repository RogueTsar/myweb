# How to edit your website

A plain-English reference for everything you'll commonly want to change.

---

## Publishing a blog post

1. Go to the `_posts/` folder
2. Create a new file named exactly like: `YYYY-MM-DD-your-title.md`
   - Example: `2026-04-15-thoughts-on-alignment.md`
3. Paste this at the top, then write below it:

```
---
layout: post
title: "Your Post Title Here"
date: 2026-04-15
---

Your writing goes here. Leave a blank line between paragraphs.
```

4. Deploy (see Deployment section below) — it appears on the blog page automatically.

### Markdown cheatsheet

| What you want | What to type |
|---|---|
| Bold | `**bold**` |
| Italic | `*italic*` |
| Link | `[link text](https://url.com)` |
| Heading | `## Heading` or `### Subheading` |
| Bullet list | `- item one` |
| New paragraph | Leave a blank line |
| Blockquote | `> quoted text` |

---

## Adding a paper or PDF

1. Drop the PDF into `assets/documents/`
2. Link to it from a blog post or any page:

```
[Read the paper](/assets/documents/my-paper.pdf)
```

---

## Editing your bio (home page)

Open `index.html`. The bio is in the `<div class="telescopic-text">` section.

The underlined words that expand when clicked look like this:
```html
<span class="telescope">
  <span class="trigger" onclick="expand(this)">visible text</span>
  <span class="content">expanded text that appears on click</span>
</span>
```

To edit: just change the text inside those spans. The structure stays the same — only edit the words, not the tags.

To add a new sentence, copy a plain `<p>` from an existing paragraph and put it after the others.

---

## Adding work entries

Open `work.html`. Find the `<div class="work-grid">` section. Add a new card inside it:

```html
<div class="work-card">
    <span class="work-card__tag tag--research">Research</span>
    <h3 class="work-card__title">Your Role</h3>
    <p class="work-card__org">Organisation Name</p>
    <p class="work-card__date">Jan 2026 &ndash; Present</p>
    <p class="work-card__desc">What you did.</p>
</div>
```

The tag class controls the colour:
- `tag--research` — for research roles
- `tag--policy` — for policy roles
- `tag--industry` — for industry/internships
- `tag--university` — for university roles

Put the most recent entries at the top.

---

## Changing contact links

Open `index.html`. At the bottom, find:

```html
<div class="contact-info">
    <a href="mailto:...">Email</a>
    <a href="https://linkedin.com/...">LinkedIn</a>
    <a href="https://github.com/...">GitHub</a>
</div>
```

Edit the `href` values.

---

## Changing the navigation

Open `_includes/header.html`. The nav links are listed there. Edit the text or `href` to change what appears in the nav bar.

---

## Deploying (publishing changes live)

From Terminal, in the project folder:

```bash
vercel --prod
```

Takes about a minute. Your live site:

**https://idk-psi-two.vercel.app**

### Preview locally first

```bash
python3 build-preview.py
python3 -m http.server 8000 --directory _site
```

Then open `http://localhost:8000`. Note: the Spotify music data won't load locally — only on the live site.

---

## Custom domain (vaishnavisingh.io)

Your domain shows "Invalid Configuration" because the DNS A record isn't set yet. To fix:

1. Go to wherever you registered `vaishnavisingh.io` (likely Squarespace, GoDaddy, or Namecheap)
2. Find **DNS Settings** or **DNS Records**
3. Add (or update) an **A record**:
   - Name/Host: `@`
   - Value/Points to: `216.198.79.1`
   - TTL: leave as default (or 3600)
4. Wait 10–30 minutes for it to propagate

Once that's set, `vaishnavisingh.io` will load your site.

---

## File map

| What | Where |
|---|---|
| Blog posts | `_posts/YYYY-MM-DD-title.md` |
| PDFs / documents | `assets/documents/` |
| Images | `assets/images/` |
| Home page | `index.html` |
| Work page | `work.html` |
| Music page | `music.html` |
| Blog listing | `blog.html` |
| Navigation | `_includes/header.html` |
| All styles | `assets/css/styles.css` |

---

## Spotify

The music page pulls live data from Spotify automatically. If it ever stops working, the three env vars it needs are in Vercel:

vercel.com → your project → Settings → Environment Variables:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`

To update any of these, delete the old value and re-add it there, then redeploy.
