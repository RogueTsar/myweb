# Blogging Guide

## Creating a Post

Create a `.md` file in `_posts/` with the naming format:

```
YYYY-MM-DD-slug-name.md
```

Example: `2026-04-01-my-new-post.md`

## Frontmatter

Every post starts with YAML frontmatter between `---` markers:

```yaml
---
layout: post
title: "your post title here"
date: 2026-04-01
tags: [ai-safety, governance]
section: blog
---
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `layout` | Yes | Always `post` |
| `title` | Yes | Post title (lowercase preferred) |
| `date` | Yes | Publication date (YYYY-MM-DD) |
| `tags` | Yes | Array of tags for filtering: `[tag1, tag2]` |
| `section` | Yes | `blog` for Blog page, `personal` for Personal page |

## Available Tags

### Blog tags
`ai-safety`, `ai-control`, `ai-policy`, `ai-law`, `ai-welfare`, `governance`, `international-agreements`, `multi-agent-systems`, `research`, `rationality`, `philosophy-of-mind`, `opinion-in-progress`

### Personal tags
`philosophy`, `history`, `religion`, `politics`, `science`, `poetry`, `math`, `art`, `flora-fauna`, `music`, `food`, `films`, `literature`, `reflections`, `life`, `pictures`

You can create new tags simply by using them — they appear automatically in the tag cloud.

## Markdown Syntax

### Text formatting

```markdown
**bold text**
*italic text*
`inline code`
```

### Headings

```markdown
## Section Heading
### Subsection Heading
```

Headings generate the sidebar table of contents automatically (needs 3+ headings).

### Links

```markdown
[link text](https://example.com)
```

### Images

```markdown
![alt text](/assets/images/photo.jpg)
```

Place images in `assets/images/`. They render full-width with a border. For best results, use images under 500KB.

### Blockquotes

```markdown
> This is a blockquote. Great for highlighting key ideas.
```

### Lists

```markdown
- Unordered item
- Another item

1. Ordered item
2. Another item
```

### Code blocks

````markdown
```
function hello() {
    console.log('hello');
}
```
````

### Horizontal rule

```markdown
---
```

### Footnotes / Citations

In your text, add a reference:

```markdown
This is a claim that needs a source[^1].
```

Then at the bottom of your post, define it:

```markdown
[^1]: Author, "Title", Journal, Year.
```

This creates a numbered superscript that links to the footnote at the bottom. Hovering over the superscript shows a tooltip preview.

## Post Features (automatic)

- **Reading time** — calculated from word count (200 wpm)
- **Reading progress bar** — thin bar at top of page fills as you scroll
- **Table of contents** — appears in sidebar on desktop (sticky) when post has 3+ headings; inline on mobile
- **Scroll spy** — highlights the current section in the TOC as you read
- **Section anchors** — hover over any heading to see a `§` link for sharing

## Building & Deploying

After creating or editing a post:

```bash
node build.js        # Build the site
git add -A
git commit -m "Add post: title"
git push origin main  # Auto-deploys via Vercel
```

Or deploy manually: `vercel --prod`
