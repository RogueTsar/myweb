"""
Simple build script to assemble Jekyll templates into flat HTML for local preview.
This is NOT needed for Vercel deployment — Jekyll handles that automatically.
Usage: python3 build-preview.py
"""
import os
import re
import shutil
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(BASE, '_site')

def read(path):
    with open(os.path.join(BASE, path), 'r') as f:
        return f.read()

def write_out(path, content):
    full = os.path.join(SITE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)

def strip_front_matter(content):
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            return content[end+3:].strip()
    return content

def get_front_matter(content):
    fm = {}
    if content.startswith('---'):
        end = content.find('---', 3)
        if end != -1:
            for line in content[3:end].strip().split('\n'):
                if ':' in line:
                    k, v = line.split(':', 1)
                    fm[k.strip()] = v.strip().strip('"').strip("'")
    return fm

def fix_urls(text):
    text = re.sub(r"\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}", r'\1', text)
    text = re.sub(r"\{\{\s*\"([^\"]+)\"\s*\|\s*relative_url\s*\}\}", r'\1', text)
    return text

def markdown_to_html(md):
    """Basic markdown converter for local preview."""
    lines = md.split('\n')
    html_lines = []
    in_ul = False
    in_ol = False
    in_blockquote = False
    in_pre = False
    para_lines = []

    def flush_para():
        nonlocal para_lines
        if para_lines:
            content = ' '.join(para_lines).strip()
            if content:
                html_lines.append(f'<p>{inline_md(content)}</p>')
            para_lines = []

    def inline_md(text):
        # Images before links
        text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img alt="\1" src="\2">', text)
        # Links
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
        # Bold
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        # Italic
        text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
        # Inline code
        text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
        # Footnote refs
        text = re.sub(r'\[\^(\w+)\](?!:)', r'<sup id="fnref-\1"><a href="#fn-\1">\1</a></sup>', text)
        return text

    i = 0
    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.startswith('```'):
            flush_para()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            html_lines.append(f'<pre><code>{"chr(10)".join(code_lines)}</code></pre>')
            i += 1
            continue

        # Headings
        m = re.match(r'^(#{1,3})\s+(.+)', line)
        if m:
            flush_para()
            level = len(m.group(1))
            tag = 'h2' if level <= 2 else 'h3'
            html_lines.append(f'<{tag}>{inline_md(m.group(2))}</{tag}>')
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^---+$', line.strip()):
            flush_para()
            html_lines.append('<hr>')
            i += 1
            continue

        # Blockquote
        if line.startswith('> '):
            flush_para()
            quote = inline_md(line[2:])
            html_lines.append(f'<blockquote><p>{quote}</p></blockquote>')
            i += 1
            continue

        # Unordered list
        if re.match(r'^[-*]\s+', line):
            flush_para()
            if not in_ul:
                html_lines.append('<ul>')
                in_ul = True
            html_lines.append(f'<li>{inline_md(line[2:].strip())}</li>')
            # Check if next line continues list
            if i + 1 < len(lines) and re.match(r'^[-*]\s+', lines[i+1]):
                i += 1
                continue
            else:
                html_lines.append('</ul>')
                in_ul = False
            i += 1
            continue

        # Ordered list
        if re.match(r'^\d+\.\s+', line):
            flush_para()
            if not in_ol:
                html_lines.append('<ol>')
                in_ol = True
            content = re.sub(r'^\d+\.\s+', '', line)
            html_lines.append(f'<li>{inline_md(content)}</li>')
            if i + 1 < len(lines) and re.match(r'^\d+\.\s+', lines[i+1]):
                i += 1
                continue
            else:
                html_lines.append('</ol>')
                in_ol = False
            i += 1
            continue

        # Footnote definition
        m = re.match(r'^\[\^(\w+)\]:\s*(.+)', line)
        if m:
            flush_para()
            fn_id = m.group(1)
            fn_text = inline_md(m.group(2))
            html_lines.append(f'<div class="footnotes"><ol><li id="fn-{fn_id}">{fn_text} <a href="#fnref-{fn_id}">↩</a></li></ol></div>')
            i += 1
            continue

        # Empty line = paragraph break
        if line.strip() == '':
            flush_para()
            i += 1
            continue

        # Regular text — accumulate into paragraph
        para_lines.append(line)
        i += 1

    flush_para()
    return '\n'.join(html_lines)

def assemble_page(page_file, title=''):
    head = read('_includes/head.html')
    header = read('_includes/header.html')
    footer = read('_includes/footer.html')

    page_content = read(page_file)
    fm = get_front_matter(page_content)
    body = strip_front_matter(page_content)
    page_title = fm.get('title', title)

    head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}",
                        f"{page_title} | Vaishnavi Singh" if page_title else "Vaishnavi Singh")
    head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy")
    head = head.replace("{{ site.url }}{{ page.url }}", "#")

    head = fix_urls(head)
    header = fix_urls(header)
    footer = fix_urls(footer)
    body = fix_urls(body)

    footer = re.sub(r"\{\{\s*site\.time\s*\|\s*date:\s*'%Y'\s*\}\}", str(datetime.now().year), footer)

    def set_active(nav_html):
        nav_html = re.sub(r'\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}', '', nav_html)
        nav_html = re.sub(r'\{%.*?%\}', '', nav_html)
        nav_html = re.sub(r'"\s+>', '">', nav_html)
        if page_file == 'index.html':
            nav_html = nav_html.replace('href="/">', 'href="/" class="active">')
        elif page_file in ['work.html', 'music.html', 'blog.html']:
            nav_html = nav_html.replace(f'href="/{page_file}">', f'href="/{page_file}" class="active">')
        return nav_html

    header = set_active(header)
    footer = re.sub(r'\{%.*?%\}', '', footer)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    {head}
</head>
<body>
    {header}
    <main class="page-content">
        {body}
    </main>
    {footer}
    <script src="/assets/js/theme.js"></script>
</body>
</html>"""

    return html

# Clean and create _site
if os.path.exists(SITE):
    shutil.rmtree(SITE)
os.makedirs(SITE)

# Build main pages
for page in ['index.html', 'work.html', 'music.html', 'blog.html']:
    html = assemble_page(page)

    if page == 'blog.html':
        posts_dir = os.path.join(BASE, '_posts')
        posts = []
        if os.path.exists(posts_dir):
            for f in sorted(os.listdir(posts_dir), reverse=True):
                if f.endswith('.md'):
                    post_content = read(f'_posts/{f}')
                    pfm = get_front_matter(post_content)
                    post_body = strip_front_matter(post_content)
                    slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', f.replace('.md', ''))
                    date_str = f[:10]
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                    formatted_date = dt.strftime('%-d %B %Y')
                    raw_excerpt = re.sub(r'[#*`>\[\]!]', '', post_body.split('\n\n')[0])[:150]
                    posts.append({
                        'title': pfm.get('title', slug),
                        'date': formatted_date,
                        'excerpt': raw_excerpt + '...',
                        'url': f'/blog/{slug}.html'
                    })

        post_list_html = ''
        for p in posts:
            post_list_html += f'''<li>
    <span class="post-date">{p["date"]}</span>
    <h3 class="post-title"><a href="{p["url"]}">{p["title"]}</a></h3>
    <p class="post-excerpt">{p["excerpt"]}</p>
</li>\n'''

        html = re.sub(r'\{%\s*for.*?endfor\s*%\}', post_list_html, html, flags=re.DOTALL)
        html = re.sub(r'\{%\s*if.*?endif\s*%\}', '', html, flags=re.DOTALL)

    write_out(page, html)

# Build blog posts
posts_dir = os.path.join(BASE, '_posts')
if os.path.exists(posts_dir):
    for f in os.listdir(posts_dir):
        if f.endswith('.md'):
            post_content = read(f'_posts/{f}')
            pfm = get_front_matter(post_content)
            post_body_md = strip_front_matter(post_content)
            slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', f.replace('.md', ''))

            body_html = markdown_to_html(post_body_md)

            head = read('_includes/head.html')
            header_html = read('_includes/header.html')
            footer_html = read('_includes/footer.html')

            head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}",
                              f"{pfm.get('title', '')} | Vaishnavi Singh")
            head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy")
            head = head.replace("{{ site.url }}{{ page.url }}", "#")

            head = fix_urls(head)
            header_html = fix_urls(header_html)
            header_html = re.sub(r'\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}', '', header_html)
            header_html = re.sub(r'\{%.*?%\}', '', header_html)
            header_html = re.sub(r'"\s+>', '">', header_html)
            header_html = header_html.replace('href="/blog.html">', 'href="/blog.html" class="active">')
            footer_html = fix_urls(footer_html)
            footer_html = re.sub(r'\{%.*?%\}', '', footer_html)

            date_str = f[:10]
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            formatted_date = dt.strftime('%-d %B %Y')

            post_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    {head}
</head>
<body class="post-page">
    {header_html}
    <main class="page-content">
        <article>
            <h2 class="post-page-title">{pfm.get('title', '')}</h2>
            <div class="post-meta-row">
                <span class="post-date">{formatted_date}</span>
                <span class="reading-time" id="reading-time"></span>
            </div>
            <div id="post-toc-container"></div>
            <div class="post-body" id="post-body">
                {body_html}
            </div>
            <p class="back-link"><a href="/blog.html">&larr; Back to Blog</a></p>
        </article>
    </main>
    {footer_html}
    <script src="/assets/js/theme.js"></script>
    <script src="/assets/js/post.js"></script>
</body>
</html>"""

            write_out(f'blog/{slug}.html', post_html)

# Copy assets
shutil.copytree(os.path.join(BASE, 'assets'), os.path.join(SITE, 'assets'))
shutil.copy2(os.path.join(BASE, 'favicon.svg'), os.path.join(SITE, 'favicon.svg'))

print(f"Built {len(os.listdir(SITE))} items to _site/")
print("Run: python3 -m http.server 8000 --directory _site")
