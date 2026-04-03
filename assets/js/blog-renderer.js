/* ── Blog Post Renderer — Nixon Hanna style ── */
(function () {
    var container = document.getElementById('blog-posts-list');
    if (!container) return;

    var filterContainer = document.getElementById('blog-tag-filters');
    var searchInput = document.getElementById('blog-search');
    var posts = [];
    var activeTags = new Set();

    fetch('/assets/data/blog-posts.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            posts = data.sort(function (a, b) {
                return new Date(b.date) - new Date(a.date);
            });
            renderFilters();
            renderPosts();
        })
        .catch(function () {
            container.innerHTML = '<p style="color:var(--text-secondary)">Could not load posts.</p>';
        });

    if (searchInput) {
        searchInput.addEventListener('input', function () { renderPosts(); });
    }

    function renderFilters() {
        if (!filterContainer) return;
        var allTags = new Set();
        posts.forEach(function (p) {
            (p.tags || []).forEach(function (t) { allTags.add(t); });
        });

        var html = '';
        allTags.forEach(function (tag) {
            html += '<button class="tag-filter-btn" data-tag="' + esc(tag) + '">' + esc(tag) + '</button>';
        });
        filterContainer.innerHTML = html;

        filterContainer.querySelectorAll('.tag-filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tag = btn.getAttribute('data-tag');
                if (activeTags.has(tag)) {
                    activeTags.delete(tag);
                    btn.classList.remove('active');
                } else {
                    activeTags.add(tag);
                    btn.classList.add('active');
                }
                renderPosts();
            });
        });
    }

    function renderPosts() {
        var query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        var filtered = posts.filter(function (p) {
            // Hide hidden posts
            if (p.status === 'hidden') return false;

            // Section filter — only show posts matching the page's section
            var pageSection = container.getAttribute('data-section') || 'blog';
            if (p.section && p.section !== pageSection) return false;

            // Tag filter
            if (activeTags.size > 0) {
                var hasTag = (p.tags || []).some(function (t) { return activeTags.has(t); });
                if (!hasTag) return false;
            }
            // Search filter
            if (query) {
                var searchable = (p.title + ' ' + (p.tags || []).join(' ') + ' ' + (p.excerpt || '')).toLowerCase();
                if (searchable.indexOf(query) === -1) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;padding:2rem 0">Coming soon.</p>';
            // Hide search/filters when no posts
            var controls = document.querySelector('.blog-controls');
            if (controls) controls.style.display = 'none';
            return;
        }

        var html = '';
        filtered.forEach(function (p) {
            var dateStr = formatDate(p.date);
            var tagsHtml = (p.tags || []).map(function (t) {
                return '<span class="post-tag">' + esc(t) + '</span>';
            }).join(' ');

            html += '<article class="post-card">' +
                '<a href="' + esc(p.url) + '" class="post-card__link">' +
                    '<div class="post-card__header">' +
                        '<span class="post-card__title">' + esc(p.title) + '</span>' +
                        '<span class="post-card__meta">' + dateStr + ' &middot; ' + (p.readTime || '?') + ' min read</span>' +
                    '</div>' +
                    (tagsHtml ? '<div class="post-card__tags">' + tagsHtml + '</div>' : '') +
                    (p.status === 'coming-soon' ? '<span class="post-card__status">Coming soon</span>' : '') +
                '</a>' +
                '</article>';
        });

        container.innerHTML = html;
    }

    function formatDate(d) {
        var parts = d.split('-');
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
