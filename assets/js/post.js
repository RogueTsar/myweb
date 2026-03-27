document.addEventListener('DOMContentLoaded', function () {
    var body = document.getElementById('post-body');
    if (!body) return;

    // ── Reading time ──
    var text = body.innerText || body.textContent || '';
    var words = text.trim().split(/\s+/).length;
    var minutes = Math.max(1, Math.round(words / 200));
    var rtEl = document.getElementById('reading-time');
    if (rtEl) rtEl.textContent = minutes + ' min read';

    // ── Reading progress bar ──
    var progressBar = document.getElementById('reading-progress');
    if (progressBar) {
        window.addEventListener('scroll', function () {
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var docHeight = document.documentElement.scrollHeight - window.innerHeight;
            var pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
            progressBar.style.width = pct + '%';
        });
    }

    // ── Table of contents ──
    var headings = body.querySelectorAll('h2, h3');
    if (headings.length < 3) return;

    var tocOl = document.createElement('ol');

    headings.forEach(function (h, i) {
        var slug = h.textContent
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        var id = slug + '-' + i;
        h.id = id;

        var anchor = document.createElement('a');
        anchor.href = '#' + id;
        anchor.className = 'heading-anchor';
        anchor.textContent = '\u00A7';
        anchor.setAttribute('aria-hidden', 'true');
        h.appendChild(anchor);

        var li = document.createElement('li');
        if (h.tagName === 'H3') li.className = 'toc-h3';

        var link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = h.textContent.replace('\u00A7', '').trim();
        link.setAttribute('data-target', id);
        li.appendChild(link);
        tocOl.appendChild(li);
    });

    // ── Sidebar TOC (desktop) vs inline TOC (mobile) ──
    var sidebar = document.getElementById('post-sidebar');
    var inlineContainer = document.getElementById('post-toc-container');
    var isDesktop = window.innerWidth > 900;

    var toc = document.createElement('nav');
    toc.className = 'post-toc';

    var tocTitle = document.createElement('div');
    tocTitle.className = 'post-toc__title';
    tocTitle.textContent = 'Contents';

    toc.appendChild(tocTitle);
    toc.appendChild(tocOl);

    if (isDesktop && sidebar) {
        sidebar.appendChild(toc);
        sidebar.classList.add('post-sidebar--active');
    } else if (inlineContainer) {
        inlineContainer.appendChild(toc);
    }

    // ── Scroll spy: highlight active section ──
    if ('IntersectionObserver' in window) {
        var tocLinks = toc.querySelectorAll('a[data-target]');
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    tocLinks.forEach(function (l) { l.classList.remove('toc-active'); });
                    var active = toc.querySelector('a[data-target="' + entry.target.id + '"]');
                    if (active) active.classList.add('toc-active');
                }
            });
        }, { rootMargin: '-20% 0px -60% 0px' });

        headings.forEach(function (h) { observer.observe(h); });
    }

    // ── Footnote hover tooltips ──
    var fnRefs = document.querySelectorAll('sup[id^="fnref-"] a');
    fnRefs.forEach(function (ref) {
        var targetId = ref.getAttribute('href');
        if (!targetId) return;
        var footnote = document.querySelector(targetId.replace('#', '#'));
        if (!footnote) return;

        var tooltipText = footnote.textContent.replace('\u21A9', '').trim();
        if (!tooltipText) return;

        ref.setAttribute('title', tooltipText);
        ref.classList.add('fn-tooltip-trigger');
    });
});
