/* Blog/Personal tag filtering and search */
(function () {
    var searchInput = document.getElementById('blog-search');
    var tagContainer = document.getElementById('blog-tags');
    var postList = document.getElementById('post-list');
    if (!searchInput || !postList) return;

    var posts = postList.querySelectorAll('li[data-tags]');
    var activeTags = {};

    // Collect all unique tags
    var allTags = {};
    for (var i = 0; i < posts.length; i++) {
        var tags = (posts[i].getAttribute('data-tags') || '').split(',').filter(Boolean);
        for (var j = 0; j < tags.length; j++) {
            allTags[tags[j]] = true;
        }
    }

    // Render tag buttons
    if (tagContainer) {
        var sorted = Object.keys(allTags).sort();
        for (var k = 0; k < sorted.length; k++) {
            var btn = document.createElement('button');
            btn.className = 'tag-btn';
            btn.textContent = sorted[k];
            btn.setAttribute('data-tag', sorted[k]);
            btn.addEventListener('click', toggleTag);
            tagContainer.appendChild(btn);
        }
    }

    function toggleTag(e) {
        var tag = e.target.getAttribute('data-tag');
        if (activeTags[tag]) {
            delete activeTags[tag];
            e.target.classList.remove('tag-btn--active');
        } else {
            activeTags[tag] = true;
            e.target.classList.add('tag-btn--active');
        }
        filterPosts();
    }

    searchInput.addEventListener('input', filterPosts);

    function filterPosts() {
        var query = searchInput.value.toLowerCase().trim();
        var activeTagList = Object.keys(activeTags);

        for (var i = 0; i < posts.length; i++) {
            var post = posts[i];
            var title = (post.querySelector('.post-title') || {}).textContent || '';
            var postTags = (post.getAttribute('data-tags') || '').split(',');

            var matchesSearch = !query || title.toLowerCase().indexOf(query) !== -1;
            var matchesTags = activeTagList.length === 0 || activeTagList.some(function (t) {
                return postTags.indexOf(t) !== -1;
            });

            post.style.display = (matchesSearch && matchesTags) ? '' : 'none';
        }
    }
})();
