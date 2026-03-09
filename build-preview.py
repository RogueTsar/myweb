"""
Simple build script to assemble Jekyll templates into flat HTML for local preview.
This is NOT needed for GitHub Pages deployment — Jekyll handles that automatically.
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

def assemble_page(page_file, title=''):
    head = read('_includes/head.html')
    header = read('_includes/header.html')
    footer = read('_includes/footer.html')

    page_content = read(page_file)
    fm = get_front_matter(page_content)
    body = strip_front_matter(page_content)
    page_title = fm.get('title', title)

    # Simple Liquid replacements
    head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}",
                        f"{page_title} | Vaishnavi Singh" if page_title else "Vaishnavi Singh")
    head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy")
    head = head.replace("{{ site.url }}{{ page.url }}", "#")

    # Fix asset paths (remove relative_url filter)
    for template in [head, header, footer, body]:
        pass

    def fix_urls(text):
        text = re.sub(r"\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}", r'\1', text)
        text = re.sub(r"\{\{\s*\"([^\"]+)\"\s*\|\s*relative_url\s*\}\}", r'\1', text)
        return text

    head = fix_urls(head)
    header = fix_urls(header)
    footer = fix_urls(footer)
    body = fix_urls(body)

    # Fix Liquid date in footer
    footer = re.sub(r"\{\{\s*site\.time\s*\|\s*date:\s*'%Y'\s*\}\}", str(datetime.now().year), footer)

    # Handle active page class in nav
    page_url = '/' if page_file == 'index.html' else f'/{page_file}'

    def set_active(nav_html):
        # Remove entire {% if ... %}...{% endif %} blocks (including conditional content)
        nav_html = re.sub(r'\{%\s*if.*?%\}.*?\{%\s*endif\s*%\}', '', nav_html)
        # Remove any remaining Liquid tags
        nav_html = re.sub(r'\{%.*?%\}', '', nav_html)
        # Clean up extra whitespace before >
        nav_html = re.sub(r'"\s+>', '">', nav_html)
        # Add active class based on current page
        if page_file == 'index.html':
            nav_html = nav_html.replace('href="/">', 'href="/" class="active">')
        elif page_file in ['work.html', 'music.html', 'blog.html']:
            nav_html = nav_html.replace(f'href="/{page_file}">', f'href="/{page_file}" class="active">')
        return nav_html

    header = set_active(header)

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
</body>
</html>"""

    return html

# Clean and create _site
if os.path.exists(SITE):
    shutil.rmtree(SITE)
os.makedirs(SITE)

# Build pages
for page in ['index.html', 'work.html', 'music.html', 'blog.html']:
    html = assemble_page(page)

    # For blog.html, inject post listing
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
                    excerpt = post_body.split('\n\n')[0][:150] + '...'
                    posts.append({
                        'title': pfm.get('title', slug),
                        'date': formatted_date,
                        'excerpt': excerpt,
                        'url': f'/blog/{slug}.html'
                    })

        post_list_html = ''
        for p in posts:
            post_list_html += f'''<li>
        <span class="post-date">{p["date"]}</span>
        <h3 class="post-title"><a href="{p["url"]}">{p["title"]}</a></h3>
        <p class="post-excerpt">{p["excerpt"]}</p>
    </li>\n    '''

        # Replace Liquid loop
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
            post_body = strip_front_matter(post_content)
            slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', f.replace('.md', ''))

            # Convert markdown paragraphs to HTML
            paragraphs = post_body.split('\n\n')
            body_html = '\n'.join(f'<p>{p.strip()}</p>' for p in paragraphs if p.strip())

            # Build post page
            head = read('_includes/head.html')
            header_html = read('_includes/header.html')
            footer_html = read('_includes/footer.html')

            head = head.replace("{% if page.title %}{{ page.title }} | {% endif %}{{ site.title }}",
                              f"{pfm.get('title', '')} | Vaishnavi Singh")
            head = head.replace("{{ site.description }}", "Undergraduate researcher in Technical AI Safety and AI Governance & Policy")
            head = head.replace("{{ site.url }}{{ page.url }}", "#")

            def fix_urls(text):
                text = re.sub(r"\{\{\s*'([^']+)'\s*\|\s*relative_url\s*\}\}", r'\1', text)
                text = re.sub(r"\{\{\s*\"([^\"]+)\"\s*\|\s*relative_url\s*\}\}", r'\1', text)
                return text

            head = fix_urls(head)
            header_html = fix_urls(header_html)
            header_html = re.sub(r'\{%.*?%\}', '', header_html)
            # Set blog as active
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
<body>
    {header_html}
    <main class="page-content">
        <article>
            <h2 class="post-page-title">{pfm.get('title', '')}</h2>
            <p class="post-date">{formatted_date}</p>
            <div class="post-body">
                {body_html}
            </div>
            <p class="back-link"><a href="/blog.html">&larr; Back to Blog</a></p>
        </article>
    </main>
    {footer_html}
</body>
</html>"""

            write_out(f'blog/{slug}.html', post_html)

# Copy assets
shutil.copytree(os.path.join(BASE, 'assets'), os.path.join(SITE, 'assets'))
shutil.copy2(os.path.join(BASE, 'favicon.svg'), os.path.join(SITE, 'favicon.svg'))

print(f"Built {len(os.listdir(SITE))} items to _site/")
print("Run: python3 -m http.server 8000 --directory _site")
