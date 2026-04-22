/* ── Bio Loader: renders telescopic bio from /assets/data/bio.json ── */
(function () {
    var bioEl = document.getElementById('bio-text');
    var contactsEl = document.getElementById('bio-contacts');
    if (!bioEl) return;

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
        var html = '';
        data.contacts.forEach(function (c) {
            var cls = c.class ? ' class="' + esc(c.class) + '"' : '';
            var external = c.url.indexOf('mailto:') !== 0;
            var attrs = external ? ' target="_blank" rel="noopener"' : '';
            html += '<a href="' + esc(c.url) + '"' + cls + attrs + '>' + esc(c.label) + '</a>';
        });
        contactsEl.innerHTML = html;
    }
})();
