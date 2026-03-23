document.addEventListener('DOMContentLoaded', function () {
    var body = document.getElementById('post-body');
    if (!body) return;

    // Reading time
    var text = body.innerText || body.textContent || '';
    var words = text.trim().split(/\s+/).length;
    var minutes = Math.max(1, Math.round(words / 200));
    var rtEl = document.getElementById('reading-time');
    if (rtEl) rtEl.textContent = minutes + ' min read';

    // Table of contents — only if 3+ headings
    var headings = body.querySelectorAll('h2, h3');
    if (headings.length < 3) return;

    var tocContainer = document.getElementById('post-toc-container');
    if (!tocContainer) return;

    var tocOl = document.createElement('ol');
    var h2Count = 0;

    headings.forEach(function (h, i) {
        // Give each heading an id for anchor linking
        var slug = h.textContent
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        var id = slug + '-' + i;
        h.id = id;

        // Add anchor link inside heading
        var anchor = document.createElement('a');
        anchor.href = '#' + id;
        anchor.className = 'heading-anchor';
        anchor.textContent = '§';
        anchor.setAttribute('aria-hidden', 'true');
        h.appendChild(anchor);

        // Build ToC entry
        var li = document.createElement('li');
        if (h.tagName === 'H3') {
            li.className = 'toc-h3';
        } else {
            h2Count++;
        }

        var link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = h.textContent.replace('§', '').trim();
        li.appendChild(link);
        tocOl.appendChild(li);
    });

    var toc = document.createElement('div');
    toc.className = 'post-toc';

    var tocTitle = document.createElement('div');
    tocTitle.className = 'post-toc__title';
    tocTitle.textContent = 'Contents';

    toc.appendChild(tocTitle);
    toc.appendChild(tocOl);
    tocContainer.appendChild(toc);
});
