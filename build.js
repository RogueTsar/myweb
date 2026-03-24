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
                    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
                    fm[k] = v;
                }
            });
        }
    }
    return fm;
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

function assemblePage(pageFile) {
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
    if (pageFile === 'index.html') {
        header = header.replace('href="/">', 'href="/" class="active">');
    } else if (['work.html', 'music.html', 'blog.html'].includes(pageFile)) {
        header = header.replace(`href="/${pageFile}">`, `href="/${pageFile}" class="active">`);
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
</body>
</html>`;
}

// Clean and create _site
if (fs.existsSync(SITE)) fs.rmSync(SITE, { recursive: true });
fs.mkdirSync(SITE);

// Build main pages
for (const page of ['index.html', 'work.html', 'music.html', 'blog.html']) {
    let html = assemblePage(page);

    if (page === 'blog.html') {
        const postsDir = path.join(BASE, '_posts');
        const posts = [];
        if (fs.existsSync(postsDir)) {
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
                posts.push({ title: pfm.title || slug, date: formatted, excerpt: rawExcerpt + '...', url: `/blog/${slug}.html` });
            }
        }

        let postListHtml = '';
        for (const p of posts) {
            postListHtml += `<li>
    <span class="post-date">${p.date}</span>
    <h3 class="post-title"><a href="${p.url}">${p.title}</a></h3>
    <p class="post-excerpt">${p.excerpt}</p>
</li>\n`;
        }

        html = html.replace(/\{%\s*for.*?endfor\s*%\}/gs, postListHtml);
        html = html.replace(/\{%\s*if.*?endif\s*%\}/gs, '');
    }

    writeOut(page, html);
}

// Build blog posts
const postsDir = path.join(BASE, '_posts');
if (fs.existsSync(postsDir)) {
    for (const f of fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))) {
        const postContent = read(`_posts/${f}`);
        const pfm = getFrontMatter(postContent);
        const postBodyMd = stripFrontMatter(postContent);
        const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '');

        const bodyHtml = markdownToHtml(postBodyMd);

        let head = read('_includes/head.html');
        let headerHtml = read('_includes/header.html');
        let footerHtml = read('_includes/footer.html');

        head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}", `${pfm.title || ''} | Vaishnavi Singh`);
        head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy");
        head = head.replace("{{ site.url }}{{ page.url }}", "#");
        head = fixUrls(head);

        headerHtml = fixUrls(headerHtml);
        headerHtml = headerHtml.replace(/\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}/gs, '');
        headerHtml = headerHtml.replace(/\{%.*?%\}/g, '');
        headerHtml = headerHtml.replace(/"\s+>/g, '">');
        headerHtml = headerHtml.replace('href="/blog.html">', 'href="/blog.html" class="active">');

        footerHtml = fixUrls(footerHtml);
        footerHtml = footerHtml.replace(/\{%.*?%\}/g, '');

        const dateStr = f.slice(0, 10);
        const dt = new Date(dateStr + 'T00:00:00');
        const formatted = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    ${head}
</head>
<body class="post-page">
    ${headerHtml}
    <main class="page-content">
        <article>
            <h2 class="post-page-title">${pfm.title || ''}</h2>
            <div class="post-meta-row">
                <span class="post-date">${formatted}</span>
                <span class="reading-time" id="reading-time"></span>
            </div>
            <div id="post-toc-container"></div>
            <div class="post-body" id="post-body">
                ${bodyHtml}
            </div>
            <p class="back-link"><a href="/blog.html">&larr; Back to Blog</a></p>
        </article>
    </main>
    ${footerHtml}
    <script src="/assets/js/theme.js"></script>
    <script src="/assets/js/post.js"></script>
</body>
</html>`;

        writeOut(`blog/${slug}.html`, postHtml);
    }
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
