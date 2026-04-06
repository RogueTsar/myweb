/**
 * Build script to assemble Jekyll-style templates into flat HTML.
 * Node.js port of build-preview.py for Vercel compatibility.
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const SITE = path.join(BASE, '_site');

function read(relPath) {
    return fs.readFileSync(path.join(BASE, relPath), 'utf8');
}

function writeOut(relPath, content) {
    const full = path.join(SITE, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
}

function stripFrontMatter(content) {
    if (content.startsWith('---')) {
        const end = content.indexOf('---', 3);
        if (end !== -1) return content.slice(end + 3).trim();
    }
    return content;
}

function getFrontMatter(content) {
    const fm = {};
    if (content.startsWith('---')) {
        const end = content.indexOf('---', 3);
        if (end !== -1) {
            content.slice(3, end).trim().split('\n').forEach(line => {
                const idx = line.indexOf(':');
                if (idx !== -1) {
                    const k = line.slice(0, idx).trim();
                    let v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
                    fm[k] = v;
                }
            });
        }
    }
    return fm;
}

function parseTags(fm) {
    const raw = fm.tags || '';
    // Handle [tag1, tag2] format
    const match = raw.match(/^\[(.+)\]$/);
    if (match) {
        return match[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    // Handle comma-separated
    if (raw.includes(',')) return raw.split(',').map(t => t.trim()).filter(Boolean);
    return raw ? [raw.trim()] : [];
}

function fixUrls(text) {
    text = text.replace(/\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}/g, '$1');
    text = text.replace(/\{\{\s*"([^"]+)"\s*\|\s*relative_url\s*\}\}/g, '$1');
    return text;
}

function inlineMd(text) {
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\[\^(\w+)\](?!:)/g, '<sup id="fnref-$1"><a href="#fn-$1">$1</a></sup>');
    return text;
}

function markdownToHtml(md) {
    const lines = md.split('\n');
    const htmlLines = [];
    let inUl = false;
    let inOl = false;
    let paraLines = [];

    function flushPara() {
        if (paraLines.length) {
            const content = paraLines.join(' ').trim();
            if (content) htmlLines.push(`<p>${inlineMd(content)}</p>`);
            paraLines = [];
        }
    }

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Code blocks
        if (line.startsWith('```')) {
            flushPara();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            htmlLines.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
            i++;
            continue;
        }

        // Headings
        const hMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (hMatch) {
            flushPara();
            const level = hMatch[1].length;
            const tag = level <= 2 ? 'h2' : 'h3';
            htmlLines.push(`<${tag}>${inlineMd(hMatch[2])}</${tag}>`);
            i++;
            continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
            flushPara();
            htmlLines.push('<hr>');
            i++;
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            flushPara();
            htmlLines.push(`<blockquote><p>${inlineMd(line.slice(2))}</p></blockquote>`);
            i++;
            continue;
        }

        // Unordered list
        if (/^[-*]\s+/.test(line)) {
            flushPara();
            if (!inUl) { htmlLines.push('<ul>'); inUl = true; }
            htmlLines.push(`<li>${inlineMd(line.slice(2).trim())}</li>`);
            if (i + 1 < lines.length && /^[-*]\s+/.test(lines[i + 1])) { i++; continue; }
            htmlLines.push('</ul>'); inUl = false;
            i++;
            continue;
        }

        // Ordered list
        if (/^\d+\.\s+/.test(line)) {
            flushPara();
            if (!inOl) { htmlLines.push('<ol>'); inOl = true; }
            const content = line.replace(/^\d+\.\s+/, '');
            htmlLines.push(`<li>${inlineMd(content)}</li>`);
            if (i + 1 < lines.length && /^\d+\.\s+/.test(lines[i + 1])) { i++; continue; }
            htmlLines.push('</ol>'); inOl = false;
            i++;
            continue;
        }

        // Footnote definition
        const fnMatch = line.match(/^\[\^(\w+)\]:\s*(.+)/);
        if (fnMatch) {
            flushPara();
            htmlLines.push(`<div class="footnotes"><ol><li id="fn-${fnMatch[1]}">${inlineMd(fnMatch[2])} <a href="#fnref-${fnMatch[1]}">↩</a></li></ol></div>`);
            i++;
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            flushPara();
            i++;
            continue;
        }

        // Regular text
        paraLines.push(line);
        i++;
    }
    flushPara();
    return htmlLines.join('\n');
}

// ── Read all posts once ──
function readAllPosts() {
    const postsDir = path.join(BASE, '_posts');
    const posts = [];
    if (!fs.existsSync(postsDir)) return posts;

    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md')).sort().reverse();
    for (const f of files) {
        const postContent = read(`_posts/${f}`);
        const pfm = getFrontMatter(postContent);
        const postBody = stripFrontMatter(postContent);
        const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '');
        const dateStr = f.slice(0, 10);
        const dt = new Date(dateStr + 'T00:00:00');
        const formatted = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const rawExcerpt = postBody.split('\n\n')[0].replace(/[#*`>\[\]!]/g, '').slice(0, 150);
        const tags = parseTags(pfm);
        const section = (pfm.section || 'blog').trim();

        posts.push({
            filename: f,
            title: pfm.title || slug,
            date: formatted,
            excerpt: rawExcerpt + '...',
            slug,
            tags,
            section,
            bodyMd: postBody,
            fm: pfm,
        });
    }
    return posts;
}

function buildPostListHtml(posts, baseUrl) {
    let html = '';
    for (const p of posts) {
        const tagsAttr = p.tags.length ? ` data-tags="${p.tags.join(',')}"` : ' data-tags=""';
        const tagsHtml = p.tags.length
            ? `<div class="post-tags">${p.tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>`
            : '';
        html += `<li${tagsAttr}>
    <span class="post-date">${p.date}</span>
    <h3 class="post-title"><a href="${baseUrl}/${p.slug}.html">${p.title}</a></h3>
    ${tagsHtml}
    <p class="post-excerpt">${p.excerpt}</p>
</li>\n`;
    }
    return html;
}

function assemblePage(pageFile, activeNav) {
    let head = read('_includes/head.html');
    let header = read('_includes/header.html');
    let footer = read('_includes/footer.html');

    const pageContent = read(pageFile);
    const fm = getFrontMatter(pageContent);
    const body = stripFrontMatter(pageContent);
    const pageTitle = fm.title || '';

    head = head.replace(
        "{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}",
        pageTitle ? `${pageTitle} | Vaishnavi Singh` : 'Vaishnavi Singh'
    );
    head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy");
    head = head.replace("{{ site.url }}{{ page.url }}", "#");

    head = fixUrls(head);
    header = fixUrls(header);
    footer = fixUrls(footer);
    const bodyFixed = fixUrls(body);

    footer = footer.replace(/\{\{\s*site\.time\s*\|\s*date:\s*'%Y'\s*\}\}/g, String(new Date().getFullYear()));

    // Clean Liquid tags from nav
    header = header.replace(/\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}/gs, '');
    header = header.replace(/\{%.*?%\}/g, '');
    header = header.replace(/"\s+>/g, '">');

    // Set active nav
    const navTarget = activeNav || pageFile;
    if (navTarget === 'index.html') {
        header = header.replace('href="/">', 'href="/" class="active">');
    } else {
        header = header.replace(`href="/${navTarget}">`, `href="/${navTarget}" class="active">`);
    }

    footer = footer.replace(/\{%.*?%\}/g, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${head}
</head>
<body>
    ${header}
    <main class="page-content">
        ${bodyFixed}
    </main>
    ${footer}
    <script src="/assets/js/theme.js"></script>
    <script src="/assets/js/name-scatter.js"></script>
</body>
</html>`;
}

// ── Main Build ──

// Clean and create _site
if (fs.existsSync(SITE)) fs.rmSync(SITE, { recursive: true });
fs.mkdirSync(SITE);

// Read all posts
const allPosts = readAllPosts();
const blogPosts = allPosts.filter(p => p.section !== 'personal');
const personalPosts = allPosts.filter(p => p.section === 'personal');

// Build main pages
for (const page of ['index.html', 'work.html', 'music.html', 'blog.html', 'personal.html']) {
    let html = assemblePage(page);

    if (page === 'blog.html') {
        const postListHtml = buildPostListHtml(blogPosts, '/blog');
        html = html.replace(/\{%\s*for.*?endfor\s*%\}/gs, postListHtml);
        html = html.replace(/\{%\s*if.*?endif\s*%\}/gs, '');
    }

    if (page === 'personal.html') {
        const postListHtml = buildPostListHtml(personalPosts, '/personal');
        html = html.replace(/\{%\s*for.*?endfor\s*%\}/gs, postListHtml);
        html = html.replace(/\{%\s*if.*?endif\s*%\}/gs, '');
    }

    writeOut(page, html);
}

// Build individual post pages
function buildPost(post, section) {
    const bodyHtml = markdownToHtml(post.bodyMd);
    const baseUrl = section === 'personal' ? '/personal' : '/blog';
    const backPage = section === 'personal' ? '/personal.html' : '/blog.html';
    const backLabel = section === 'personal' ? 'Back to Personal' : 'Back to Blog';
    const activeNav = section === 'personal' ? 'personal.html' : 'blog.html';

    let head = read('_includes/head.html');
    let headerHtml = read('_includes/header.html');
    let footerHtml = read('_includes/footer.html');

    head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}", `${post.title} | Vaishnavi Singh`);
    head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy");
    head = head.replace("{{ site.url }}{{ page.url }}", "#");
    head = fixUrls(head);

    headerHtml = fixUrls(headerHtml);
    headerHtml = headerHtml.replace(/\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}/gs, '');
    headerHtml = headerHtml.replace(/\{%.*?%\}/g, '');
    headerHtml = headerHtml.replace(/"\s+>/g, '">');
    headerHtml = headerHtml.replace(`href="/${activeNav}">`, `href="/${activeNav}" class="active">`);

    footerHtml = fixUrls(footerHtml);
    footerHtml = footerHtml.replace(/\{%.*?%\}/g, '');
    footerHtml = footerHtml.replace(/\{\{\s*site\.time\s*\|\s*date:\s*'%Y'\s*\}\}/g, String(new Date().getFullYear()));

    const tagsHtml = post.tags.length
        ? `<div class="post-tags post-tags--detail">${post.tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>`
        : '';

    const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    ${head}
</head>
<body class="post-page">
    <div class="reading-progress" id="reading-progress"></div>
    ${headerHtml}
    <main class="page-content">
        <div class="post-layout">
            <div class="post-sidebar" id="post-sidebar"></div>
            <article class="post-article">
                <h2 class="post-page-title">${post.title}</h2>
                <div class="post-meta-row">
                    <span class="post-date">${post.date}</span>
                    <span class="reading-time" id="reading-time"></span>
                </div>
                ${tagsHtml}
                <div id="post-toc-container"></div>
                <div class="post-body" id="post-body">
                    ${bodyHtml}
                </div>
                <p class="back-link"><a href="${backPage}">&larr; ${backLabel}</a></p>
            </article>
        </div>
    </main>
    ${footerHtml}
    <script src="/assets/js/theme.js"></script>
    <script src="/assets/js/name-scatter.js"></script>
    <script src="/assets/js/post.js"></script>
</body>
</html>`;

    writeOut(`${baseUrl.slice(1)}/${post.slug}.html`, postHtml);
}

for (const post of allPosts) {
    buildPost(post, post.section);
}

// Copy assets
function copyRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyRecursive(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}

copyRecursive(path.join(BASE, 'assets'), path.join(SITE, 'assets'));
fs.copyFileSync(path.join(BASE, 'favicon.svg'), path.join(SITE, 'favicon.svg'));

console.log(`Built ${fs.readdirSync(SITE).length} items to _site/`);
