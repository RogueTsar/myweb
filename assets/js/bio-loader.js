/* ── Bio Loader: renders telescopic bio from /assets/data/bio.json ── */
(function () {
    var bioEl = document.getElementById('bio-text');
    var contactsEl = document.getElementById('bio-contacts');
    if (!bioEl) return;

    var ICONS = {
        email: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
        linkedin: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-6a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2z"/></svg>',
        github: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
        twitter: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        instagram: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/></svg>',
        calendar: '<svg class="contact-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z"/></svg>',
    };

    function getIcon(url) {
        if (url.indexOf('mailto:') === 0)        return ICONS.email;
        if (url.indexOf('linkedin.com') !== -1)  return ICONS.linkedin;
        if (url.indexOf('github.com') !== -1)    return ICONS.github;
        if (url.indexOf('x.com') !== -1 || url.indexOf('twitter.com') !== -1) return ICONS.twitter;
        if (url.indexOf('instagram.com') !== -1) return ICONS.instagram;
        return ICONS.calendar;
    }

    var bioVer = '';
    try {
        var s = document.querySelector('script[src*="bio-loader"]');
        var m = s && s.src.match(/[?&]v=([^&]+)/);
        if (m) bioVer = '?v=' + m[1];
    } catch(e) {}

    fetch('/assets/data/bio.json' + bioVer, { cache: 'no-cache' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            renderBio(data);
            renderContacts(data);
        })
        .catch(function () {});

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function parseTelescopic(text) {
        return esc(text).replace(/\{([^|]+)\|([^}]+)\}/g, function (_, trigger, content) {
            return '<span class="telescope"><span class="trigger" onclick="expand(this)">' +
                trigger + '</span><span class="content">' + content + '</span></span>';
        });
    }

    function renderBio(data) {
        if (!data.paragraphs || data.paragraphs.length === 0) return;
        var html = '';
        data.paragraphs.forEach(function (p, i) {
            var mt = i > 0 ? ' style="margin-top: 1.25rem;"' : '';
            html += '<p' + mt + '>' + parseTelescopic(p.text) + '</p>';
        });
        bioEl.innerHTML = html;
    }

    function renderContacts(data) {
        if (!data.contacts || data.contacts.length === 0 || !contactsEl) return;
        var links = '';
        var meetBtn = '';
        data.contacts.forEach(function (c) {
            var external = c.url.indexOf('mailto:') !== 0;
            var attrs = external ? ' target="_blank" rel="noopener"' : '';
            if (c.class === 'meet-btn') {
                meetBtn = '<a href="' + esc(c.url) + '" class="meet-btn"' + attrs + '>' +
                    getIcon(c.url) + esc(c.label) + '</a>';
            } else {
                links += '<a href="' + esc(c.url) + '" class="contact-link"' + attrs + ' title="' + esc(c.label) + '">' +
                    getIcon(c.url) + '<span class="contact-link__label">' + esc(c.label) + '</span></a>';
            }
        });
        contactsEl.innerHTML = '<div class="contact-links">' + links + '</div>' +
            (meetBtn ? '<div class="contact-meet">' + meetBtn + '</div>' : '');
    }
})();
