/* ── Admin Dashboard ── */
(function () {
  'use strict';

  var DATA_FILES = {
    'blog-posts': '/assets/data/blog-posts.json',
    'media-log': '/assets/data/media-log.json',
    'playlists': '/assets/data/playlists.json',
    'research': '/assets/data/research-interests.json',
    'faq': '/assets/data/faq.json',
    'testimonials': '/assets/data/testimonials.json',
    'card-quotes': '/assets/data/card-quotes.json'
  };

  var cache = {};
  var dirHandle = null;
  var currentTab = 'dashboard';

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    renderSidebar();
    loadAllData().then(function () {
      switchTab('dashboard');
    });
  });

  /* ── Sidebar ── */
  function renderSidebar() {
    var tabs = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'blog-posts', label: 'Blog Posts' },
      { id: 'media-log', label: 'Media Log' },
      { id: 'playlists', label: 'Mood Playlists' },
      { id: 'faq', label: 'FAQ' },
      { id: 'testimonials', label: 'Testimonials' },
      { id: 'research', label: 'Research Graph' },
      { id: 'card-quotes', label: 'Card Quotes' }
    ];

    var nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    tabs.forEach(function (t) {
      var btn = document.createElement('button');
      btn.textContent = t.label;
      btn.setAttribute('data-tab', t.id);
      if (t.id === currentTab) btn.className = 'active';
      btn.onclick = function () { switchTab(t.id); };
      nav.appendChild(btn);
    });
  }

  function switchTab(id) {
    currentTab = id;
    document.querySelectorAll('.sidebar-nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === id);
    });
    var main = document.getElementById('main');
    switch (id) {
      case 'dashboard': renderDashboard(main); break;
      case 'blog-posts': renderBlogPosts(main); break;
      case 'media-log': renderMediaLog(main); break;
      case 'playlists': renderPlaylists(main); break;
      case 'faq': renderFAQ(main); break;
      case 'testimonials': renderTestimonials(main); break;
      case 'research': renderResearch(main); break;
      case 'card-quotes': renderCardQuotes(main); break;
    }
  }

  /* ── Data Loading ── */
  function loadAllData() {
    var keys = Object.keys(DATA_FILES);
    return Promise.all(keys.map(function (key) {
      return fetch(DATA_FILES[key])
        .then(function (r) { return r.json(); })
        .then(function (d) { cache[key] = d; })
        .catch(function () { cache[key] = null; });
    }));
  }

  /* ── File Save ── */
  async function saveFile(key, data) {
    var json = JSON.stringify(data, null, 2) + '\n';
    cache[key] = data;

    // Try File System Access API
    if (dirHandle) {
      try {
        var parts = DATA_FILES[key].split('/').filter(Boolean);
        var current = dirHandle;
        for (var i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i]);
        }
        var fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });
        var writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
        showToast('Saved ' + key);
        return;
      } catch (e) {
        console.warn('FS write failed, falling back to download', e);
      }
    }

    // Fallback: download
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = DATA_FILES[key].split('/').pop();
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Downloaded ' + key + ' (place in assets/data/)');
  }

  async function requestDirAccess() {
    if (!window.showDirectoryPicker) {
      showToast('Browser doesn\'t support directory access. Files will download instead.');
      return;
    }
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      showToast('Directory access granted');
    } catch (e) {
      showToast('Directory access denied');
    }
  }

  /* ── Toast ── */
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  /* ── Placeholder Scanner ── */
  function scanPlaceholders() {
    var results = [];
    Object.keys(cache).forEach(function (key) {
      var json = JSON.stringify(cache[key] || {});
      var matches = json.match(/\[to be placed\]/g);
      if (matches && matches.length > 0) {
        results.push({ file: key, count: matches.length });
      }
    });
    return results;
  }

  /* ── Highlight placeholders in text ── */
  function hl(text) {
    if (!text) return '';
    return esc(text).replace(/\[to be placed\]/g, '<span class="placeholder-highlight">[to be placed]</span>');
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ──────────────────────────────────────
     TAB: Dashboard
     ────────────────────────────────────── */
  function renderDashboard(el) {
    // Phase progress stored in both keys for compatibility
    var phases = JSON.parse(localStorage.getItem('vs-build-status') || localStorage.getItem('vs-admin-phases') || '{}');
    var statuses = ['not-started', 'in-progress', 'complete', 'tested'];
    var badgeClass = { 'not-started': 'badge-danger', 'in-progress': 'badge-warning', 'complete': 'badge-info', 'tested': 'badge-success' };
    var phaseList = [
      { id: 'p0', name: 'P0: Foundation' },
      { id: 'p1', name: 'P1: Core Components' },
      { id: 'p2', name: 'P2: Advanced' },
      { id: 'p3', name: 'P3: Easter Eggs' },
      { id: 'p4', name: 'P4: Admin App' }
    ];

    var html = '<h2>Dashboard</h2>';
    html += '<button class="btn btn-primary" id="btn-dir-access" style="margin-bottom:16px">Grant Directory Access</button>';
    html += '<h3>Phase Progress Board</h3><div class="phase-grid">';

    phaseList.forEach(function (p) {
      var status = phases[p.id] || 'not-started';
      html += '<div class="card phase-card" data-phase="' + p.id + '">' +
        '<h4>' + p.name + '</h4>' +
        '<span class="badge ' + (badgeClass[status] || '') + '">' + status.replace('-', ' ') + '</span>' +
        '<div style="font-size:10px;color:var(--admin-text-dim);margin-top:6px">Click to cycle status</div>' +
        '</div>';
    });
    html += '</div>';

    // Content Readiness Scanner
    html += '<h3>Content Readiness Scanner</h3>';
    html += '<button class="btn" id="btn-scan"><span style="margin-right:4px">&#128269;</span> Scan for [to be placed]</button>';
    html += '<div id="scan-results" style="margin-top:12px"></div>';

    // Deploy gate
    var placeholders = scanPlaceholders();
    var totalP = placeholders.reduce(function (s, r) { return s + r.count; }, 0);
    var allComplete = phaseList.every(function (p) { return (phases[p.id] || '') === 'tested' || (phases[p.id] || '') === 'complete'; });
    var isReady = totalP === 0 && allComplete;

    html += '<div class="deploy-gate ' + (isReady ? 'ready' : 'not-ready') + '">';
    if (isReady) {
      html += '<span class="badge badge-success" style="font-size:14px;padding:4px 12px">READY TO DEPLOY</span>';
      html += '<div class="deploy-commands" id="deploy-cmd">git checkout main &amp;&amp; git merge staging &amp;&amp; git push origin main</div>';
      html += '<button class="btn btn-sm" id="btn-copy-deploy" style="margin-top:8px">Copy deploy command</button>';
    } else {
      html += '<span class="badge badge-danger" style="font-size:14px;padding:4px 12px">NOT READY</span>';
      if (totalP > 0) html += ' <span style="font-size:13px;color:var(--admin-text-dim)">' + totalP + ' placeholder' + (totalP > 1 ? 's' : '') + ' remaining</span>';
      if (!allComplete) html += ' <span style="font-size:13px;color:var(--admin-text-dim)">&middot; phases incomplete</span>';
      html += '<div class="deploy-commands deploy-disabled" style="opacity:0.4;pointer-events:none">git checkout main &amp;&amp; git merge staging &amp;&amp; git push origin main</div>';
    }
    html += '</div>';

    // Notes
    html += '<h3>Notes</h3>';
    html += '<textarea class="notes-area" id="admin-notes" placeholder="Log your progress here...">' + esc(localStorage.getItem('vs-admin-notes') || '') + '</textarea>';

    el.innerHTML = html;

    // Events
    document.getElementById('btn-dir-access').onclick = requestDirAccess;

    // Copy deploy command
    var copyBtn = document.getElementById('btn-copy-deploy');
    if (copyBtn) {
      copyBtn.onclick = function () {
        var cmd = 'git checkout main && git merge staging && git push origin main';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(cmd).then(function () { showToast('Deploy command copied!'); });
        } else {
          // Fallback
          var ta = document.createElement('textarea');
          ta.value = cmd;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showToast('Deploy command copied!');
        }
      };
    }

    // Scan button
    document.getElementById('btn-scan').onclick = function () {
      var res = scanPlaceholders();
      var div = document.getElementById('scan-results');
      if (res.length === 0) {
        div.innerHTML = '<span class="badge badge-success">All content filled! 0 placeholders found.</span>';
      } else {
        var total = res.reduce(function (s, r) { return s + r.count; }, 0);
        div.innerHTML = '<div style="margin-bottom:8px;font-size:13px"><strong>' + total + '</strong> total placeholder' + (total > 1 ? 's' : '') + ' found across ' + res.length + ' file' + (res.length > 1 ? 's' : '') + ':</div>';
        div.innerHTML += res.map(function (r) {
          return '<div class="scan-result"><a href="#" class="scan-result-file" data-jump-tab="' + r.file + '">' + r.file + '</a> — ' + r.count + ' placeholder' + (r.count > 1 ? 's' : '') + '</div>';
        }).join('');

        // Make file names clickable to jump to that tab
        div.querySelectorAll('[data-jump-tab]').forEach(function (link) {
          link.onclick = function (e) {
            e.preventDefault();
            switchTab(link.getAttribute('data-jump-tab'));
          };
        });
      }
    };

    document.getElementById('admin-notes').oninput = function (e) {
      localStorage.setItem('vs-admin-notes', e.target.value);
    };

    document.querySelectorAll('.phase-card').forEach(function (card) {
      card.onclick = function () {
        var pid = card.getAttribute('data-phase');
        var cur = phases[pid] || 'not-started';
        var next = statuses[(statuses.indexOf(cur) + 1) % statuses.length];
        phases[pid] = next;
        localStorage.setItem('vs-build-status', JSON.stringify(phases));
        localStorage.setItem('vs-admin-phases', JSON.stringify(phases));
        renderDashboard(el);
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: Blog Posts
     ────────────────────────────────────── */
  function renderBlogPosts(el) {
    var posts = cache['blog-posts'] || [];
    var html = '<h2>Blog Posts</h2>';
    html += '<button class="btn btn-primary" id="btn-add-post">+ Add Post</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    posts.forEach(function (p, i) {
      html += '<div class="card"><div class="card-row">' +
        '<div><strong>' + hl(p.title) + '</strong><br>' +
        '<span style="font-size:12px;color:var(--admin-text-dim)">' + p.date + ' &middot; ' + p.readTime + ' min &middot; ' + (p.status || 'draft') + '</span><br>' +
        '<div class="tag-input-area">' + (p.tags || []).map(function (t) { return '<span class="tag-chip">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div style="font-size:12px">' + hl(p.excerpt) + '</div></div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-post" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-post" data-idx="' + i + '">Del</button>' +
        '</div></div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-post').onclick = function () {
      posts.push({
        title: '[to be placed]',
        url: '/blog/new-post.html',
        date: new Date().toISOString().split('T')[0],
        tags: [],
        readTime: 5,
        status: 'draft',
        section: 'blog',
        excerpt: '[to be placed]'
      });
      saveFile('blog-posts', posts).then(function () { renderBlogPosts(el); });
    };

    el.querySelectorAll('[data-action="del-post"]').forEach(function (btn) {
      btn.onclick = function () {
        posts.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('blog-posts', posts).then(function () { renderBlogPosts(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-post"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        showPostEditor(posts, idx, el);
      };
    });
  }

  function showPostEditor(posts, idx, parentEl) {
    var p = posts[idx];
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal">' +
      '<h3>Edit Post</h3>' +
      '<label>Title</label><input id="ep-title" value="' + esc(p.title) + '">' +
      '<label>URL Path</label><input id="ep-url" value="' + esc(p.url) + '">' +
      '<label>Date</label><input id="ep-date" type="date" value="' + esc(p.date) + '">' +
      '<label>Tags (comma-separated, max 3)</label><input id="ep-tags" value="' + (p.tags || []).join(', ') + '">' +
      '<label>Read Time (min)</label><input id="ep-time" type="number" value="' + (p.readTime || 5) + '">' +
      '<label>Status</label><select id="ep-status"><option' + (p.status === 'draft' ? ' selected' : '') + '>draft</option><option' + (p.status === 'coming-soon' ? ' selected' : '') + '>coming-soon</option><option' + (p.status === 'published' ? ' selected' : '') + '>published</option></select>' +
      '<label>Section</label><select id="ep-section"><option' + (p.section === 'blog' ? ' selected' : '') + '>blog</option><option' + (p.section === 'personal' ? ' selected' : '') + '>personal</option></select>' +
      '<label>Excerpt</label><textarea id="ep-excerpt">' + esc(p.excerpt) + '</textarea>' +
      '<div class="modal-actions">' +
      '<button class="btn" id="ep-cancel">Cancel</button>' +
      '<button class="btn btn-primary" id="ep-save">Save</button>' +
      '</div></div>';

    document.body.appendChild(overlay);

    document.getElementById('ep-cancel').onclick = function () { overlay.remove(); };
    document.getElementById('ep-save').onclick = function () {
      var tags = document.getElementById('ep-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 3);
      posts[idx] = {
        title: document.getElementById('ep-title').value,
        url: document.getElementById('ep-url').value,
        date: document.getElementById('ep-date').value,
        tags: tags,
        readTime: parseInt(document.getElementById('ep-time').value) || 5,
        status: document.getElementById('ep-status').value,
        section: document.getElementById('ep-section').value,
        excerpt: document.getElementById('ep-excerpt').value
      };
      overlay.remove();
      saveFile('blog-posts', posts).then(function () { renderBlogPosts(parentEl); });
    };
  }

  /* ──────────────────────────────────────
     TAB: Media Log
     ────────────────────────────────────── */
  function renderMediaLog(el) {
    var items = cache['media-log'] || [];
    var html = '<h2>Media Log</h2>';
    html += '<button class="btn btn-primary" id="btn-add-media">+ Add Entry</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    items.forEach(function (m, i) {
      html += '<div class="card"><div class="card-row">' +
        '<div><strong>' + hl(m.title) + '</strong> <span class="badge badge-info">' + esc(m.type) + '</span><br>' +
        '<span style="font-size:12px;color:var(--admin-text-dim)">' + esc(m.author) + ' &middot; ' + m.date + '</span><br>' +
        '<span style="font-size:12px">' + hl(m.note) + '</span></div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-media" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-media" data-idx="' + i + '">Del</button>' +
        '</div></div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-media').onclick = function () {
      items.push({ title: '[to be placed]', type: 'Book', author: '[to be placed]', date: new Date().toISOString().split('T')[0], url: '#', note: '[to be placed]', cover: '' });
      saveFile('media-log', items).then(function () { renderMediaLog(el); });
    };

    el.querySelectorAll('[data-action="del-media"]').forEach(function (btn) {
      btn.onclick = function () {
        items.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('media-log', items).then(function () { renderMediaLog(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-media"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var m = items[idx];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
          '<div class="modal"><h3>Edit Media Entry</h3>' +
          '<label>Title</label><input id="em-title" value="' + esc(m.title) + '">' +
          '<label>Type</label><select id="em-type"><option' + (m.type === 'Book' ? ' selected' : '') + '>Book</option><option' + (m.type === 'Video' ? ' selected' : '') + '>Video</option><option' + (m.type === 'Podcast' ? ' selected' : '') + '>Podcast</option><option' + (m.type === 'Essay' ? ' selected' : '') + '>Essay</option><option' + (m.type === 'Blog' ? ' selected' : '') + '>Blog</option></select>' +
          '<label>Author</label><input id="em-author" value="' + esc(m.author) + '">' +
          '<label>Date</label><input id="em-date" type="date" value="' + esc(m.date) + '">' +
          '<label>URL</label><input id="em-url" value="' + esc(m.url) + '">' +
          '<label>Note</label><textarea id="em-note">' + esc(m.note) + '</textarea>' +
          '<div class="modal-actions"><button class="btn" id="em-cancel">Cancel</button><button class="btn btn-primary" id="em-save">Save</button></div></div>';
        document.body.appendChild(overlay);
        document.getElementById('em-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('em-save').onclick = function () {
          items[idx] = {
            title: document.getElementById('em-title').value,
            type: document.getElementById('em-type').value,
            author: document.getElementById('em-author').value,
            date: document.getElementById('em-date').value,
            url: document.getElementById('em-url').value,
            note: document.getElementById('em-note').value,
            cover: m.cover || ''
          };
          overlay.remove();
          saveFile('media-log', items).then(function () { renderMediaLog(el); });
        };
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: Playlists
     ────────────────────────────────────── */
  function renderPlaylists(el) {
    var pls = cache['playlists'] || [];
    var html = '<h2>Mood Playlists</h2>';
    html += '<button class="btn btn-primary" id="btn-add-pl">+ Add Playlist</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    pls.forEach(function (p, i) {
      html += '<div class="card">' +
        '<div class="card-row"><div><strong>' + hl(p.name) + '</strong><br><span style="font-size:12px">' + hl(p.description) + '</span></div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-pl" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-pl" data-idx="' + i + '">Del</button>' +
        '</div></div>' +
        '<div style="margin-top:8px">';
      (p.tracks || []).forEach(function (t, ti) {
        html += '<div style="font-size:12px;padding:2px 0;color:var(--admin-text-dim)">' + (ti + 1) + '. ' + hl(t.name) + ' &mdash; ' + hl(t.artist) + ' <span class="badge badge-info" style="font-size:10px">' + hl(t.genre) + '</span></div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-pl').onclick = function () {
      pls.push({ id: 'new-' + Date.now(), name: '[to be placed]', description: '[to be placed]', tracks: [{ name: '[to be placed]', artist: '[to be placed]', genre: '[to be placed]' }] });
      saveFile('playlists', pls).then(function () { renderPlaylists(el); });
    };

    el.querySelectorAll('[data-action="del-pl"]').forEach(function (btn) {
      btn.onclick = function () {
        pls.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('playlists', pls).then(function () { renderPlaylists(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-pl"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var p = pls[idx];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        var tracksHtml = (p.tracks || []).map(function (t, ti) {
          return '<div style="border-top:1px solid var(--admin-border);padding-top:8px;margin-top:8px">' +
            '<label>Track ' + (ti + 1) + ' Name</label><input class="trk-name" value="' + esc(t.name) + '">' +
            '<label>Artist</label><input class="trk-artist" value="' + esc(t.artist) + '">' +
            '<label>Genre</label><input class="trk-genre" value="' + esc(t.genre) + '">' +
            '</div>';
        }).join('');

        overlay.innerHTML =
          '<div class="modal"><h3>Edit Playlist</h3>' +
          '<label>Name</label><input id="epl-name" value="' + esc(p.name) + '">' +
          '<label>Description</label><textarea id="epl-desc">' + esc(p.description) + '</textarea>' +
          '<h3>Tracks</h3><div id="epl-tracks">' + tracksHtml + '</div>' +
          '<button class="btn btn-sm" id="epl-add-track" style="margin-top:8px">+ Add Track</button>' +
          '<div class="modal-actions"><button class="btn" id="epl-cancel">Cancel</button><button class="btn btn-primary" id="epl-save">Save</button></div></div>';
        document.body.appendChild(overlay);

        document.getElementById('epl-add-track').onclick = function () {
          var div = document.createElement('div');
          div.style.cssText = 'border-top:1px solid var(--admin-border);padding-top:8px;margin-top:8px';
          div.innerHTML = '<label>Track Name</label><input class="trk-name" value="">' +
            '<label>Artist</label><input class="trk-artist" value="">' +
            '<label>Genre</label><input class="trk-genre" value="">';
          document.getElementById('epl-tracks').appendChild(div);
        };

        document.getElementById('epl-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('epl-save').onclick = function () {
          var names = overlay.querySelectorAll('.trk-name');
          var artists = overlay.querySelectorAll('.trk-artist');
          var genres = overlay.querySelectorAll('.trk-genre');
          var tracks = [];
          for (var t = 0; t < names.length; t++) {
            if (names[t].value.trim()) {
              tracks.push({ name: names[t].value, artist: artists[t].value, genre: genres[t].value });
            }
          }
          pls[idx] = {
            id: p.id,
            name: document.getElementById('epl-name').value,
            description: document.getElementById('epl-desc').value,
            tracks: tracks
          };
          overlay.remove();
          saveFile('playlists', pls).then(function () { renderPlaylists(el); });
        };
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: FAQ
     ────────────────────────────────────── */
  function renderFAQ(el) {
    var items = cache['faq'] || [];
    var html = '<h2>FAQ</h2>';
    html += '<button class="btn btn-primary" id="btn-add-faq">+ Add Question</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    items.forEach(function (f, i) {
      html += '<div class="card"><div class="card-row">' +
        '<div><strong>Q:</strong> ' + hl(f.question) + '<br><strong>A:</strong> ' + hl(f.answer) + '</div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-faq" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-faq" data-idx="' + i + '">Del</button>' +
        '</div></div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-faq').onclick = function () {
      items.push({ question: '[to be placed]', answer: '[to be placed]' });
      saveFile('faq', items).then(function () { renderFAQ(el); });
    };

    el.querySelectorAll('[data-action="del-faq"]').forEach(function (btn) {
      btn.onclick = function () {
        items.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('faq', items).then(function () { renderFAQ(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-faq"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var f = items[idx];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
          '<div class="modal"><h3>Edit FAQ</h3>' +
          '<label>Question</label><textarea id="efaq-q">' + esc(f.question) + '</textarea>' +
          '<label>Answer</label><textarea id="efaq-a" style="min-height:100px">' + esc(f.answer) + '</textarea>' +
          '<div class="modal-actions"><button class="btn" id="efaq-cancel">Cancel</button><button class="btn btn-primary" id="efaq-save">Save</button></div></div>';
        document.body.appendChild(overlay);
        document.getElementById('efaq-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('efaq-save').onclick = function () {
          items[idx] = { question: document.getElementById('efaq-q').value, answer: document.getElementById('efaq-a').value };
          overlay.remove();
          saveFile('faq', items).then(function () { renderFAQ(el); });
        };
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: Testimonials
     ────────────────────────────────────── */
  function renderTestimonials(el) {
    var items = cache['testimonials'] || [];
    var html = '<h2>Testimonials</h2>';
    html += '<button class="btn btn-primary" id="btn-add-test">+ Add Testimonial</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    items.forEach(function (t, i) {
      html += '<div class="card"><div class="card-row">' +
        '<div>"' + hl(t.quote) + '"<br><span style="font-size:12px;color:var(--admin-text-dim)">&mdash; ' + hl(t.name) + ', ' + hl(t.role) + '</span></div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-test" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-test" data-idx="' + i + '">Del</button>' +
        '</div></div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-test').onclick = function () {
      items.push({ quote: '[to be placed]', name: '[to be placed]', role: '[to be placed]', photo: '' });
      saveFile('testimonials', items).then(function () { renderTestimonials(el); });
    };

    el.querySelectorAll('[data-action="del-test"]').forEach(function (btn) {
      btn.onclick = function () {
        items.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('testimonials', items).then(function () { renderTestimonials(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-test"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var t = items[idx];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
          '<div class="modal"><h3>Edit Testimonial</h3>' +
          '<label>Quote</label><textarea id="et-quote">' + esc(t.quote) + '</textarea>' +
          '<label>Name</label><input id="et-name" value="' + esc(t.name) + '">' +
          '<label>Role / Organization</label><input id="et-role" value="' + esc(t.role) + '">' +
          '<div class="modal-actions"><button class="btn" id="et-cancel">Cancel</button><button class="btn btn-primary" id="et-save">Save</button></div></div>';
        document.body.appendChild(overlay);
        document.getElementById('et-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('et-save').onclick = function () {
          items[idx] = { quote: document.getElementById('et-quote').value, name: document.getElementById('et-name').value, role: document.getElementById('et-role').value, photo: t.photo || '' };
          overlay.remove();
          saveFile('testimonials', items).then(function () { renderTestimonials(el); });
        };
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: Research Graph
     ────────────────────────────────────── */
  function renderResearch(el) {
    var data = cache['research'] || { nodes: [], edges: [] };
    var html = '<h2>Research Interest Graph</h2>';
    html += '<h3>Nodes</h3><button class="btn btn-primary btn-sm" id="btn-add-node">+ Add Node</button>';
    html += '<div class="item-list" style="margin-top:12px">';

    data.nodes.forEach(function (n, i) {
      html += '<div class="card"><div class="card-row">' +
        '<div><strong>' + esc(n.label) + '</strong> <span style="font-size:11px;color:var(--admin-text-dim)">(' + esc(n.id) + ')</span><br>' +
        '<span style="font-size:12px">' + hl(n.description) + '</span></div>' +
        '<div class="item-actions">' +
        '<button class="btn btn-sm" data-action="edit-node" data-idx="' + i + '">Edit</button>' +
        '<button class="btn btn-sm btn-danger" data-action="del-node" data-idx="' + i + '">Del</button>' +
        '</div></div></div>';
    });
    html += '</div>';

    html += '<h3>Edges</h3><button class="btn btn-primary btn-sm" id="btn-add-edge">+ Add Edge</button>';
    html += '<div class="item-list" style="margin-top:12px">';
    data.edges.forEach(function (e, i) {
      html += '<div class="card"><div class="card-row">' +
        '<span style="font-size:13px">' + esc(e.source) + ' &rarr; ' + esc(e.target) + '</span>' +
        '<button class="btn btn-sm btn-danger" data-action="del-edge" data-idx="' + i + '">Del</button>' +
        '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;

    document.getElementById('btn-add-node').onclick = function () {
      var id = prompt('Node ID (slug):');
      if (!id) return;
      data.nodes.push({ id: id, label: id, description: '[to be placed]', link: '', linkType: 'internal' });
      saveFile('research', data).then(function () { renderResearch(el); });
    };

    document.getElementById('btn-add-edge').onclick = function () {
      var src = prompt('Source node ID:');
      var tgt = prompt('Target node ID:');
      if (!src || !tgt) return;
      data.edges.push({ source: src, target: tgt });
      saveFile('research', data).then(function () { renderResearch(el); });
    };

    el.querySelectorAll('[data-action="del-node"]').forEach(function (btn) {
      btn.onclick = function () {
        data.nodes.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('research', data).then(function () { renderResearch(el); });
      };
    });

    el.querySelectorAll('[data-action="del-edge"]').forEach(function (btn) {
      btn.onclick = function () {
        data.edges.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('research', data).then(function () { renderResearch(el); });
      };
    });

    el.querySelectorAll('[data-action="edit-node"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        var n = data.nodes[idx];
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
          '<div class="modal"><h3>Edit Node</h3>' +
          '<label>ID</label><input id="en-id" value="' + esc(n.id) + '">' +
          '<label>Label</label><input id="en-label" value="' + esc(n.label) + '">' +
          '<label>Description</label><textarea id="en-desc">' + esc(n.description) + '</textarea>' +
          '<label>Link</label><input id="en-link" value="' + esc(n.link) + '">' +
          '<label>Link Type</label><select id="en-lt"><option' + (n.linkType === 'internal' ? ' selected' : '') + '>internal</option><option' + (n.linkType === 'external' ? ' selected' : '') + '>external</option></select>' +
          '<div class="modal-actions"><button class="btn" id="en-cancel">Cancel</button><button class="btn btn-primary" id="en-save">Save</button></div></div>';
        document.body.appendChild(overlay);
        document.getElementById('en-cancel').onclick = function () { overlay.remove(); };
        document.getElementById('en-save').onclick = function () {
          data.nodes[idx] = {
            id: document.getElementById('en-id').value,
            label: document.getElementById('en-label').value,
            description: document.getElementById('en-desc').value,
            link: document.getElementById('en-link').value,
            linkType: document.getElementById('en-lt').value
          };
          overlay.remove();
          saveFile('research', data).then(function () { renderResearch(el); });
        };
      };
    });
  }

  /* ──────────────────────────────────────
     TAB: Card Quotes
     ────────────────────────────────────── */
  function renderCardQuotes(el) {
    var data = cache['card-quotes'] || {};
    var cards = ['triboulet', 'canio', 'perkeo'];
    var html = '<h2>Balatro Card Quotes</h2>';

    cards.forEach(function (c) {
      var q = data[c] || { quote: '[to be placed]', author: '[to be placed]' };
      html += '<div class="card">' +
        '<h4 style="text-transform:capitalize;margin-bottom:8px">' + c + '</h4>' +
        '<label>Quote</label><textarea id="cq-' + c + '-q">' + esc(q.quote) + '</textarea>' +
        '<label>Author</label><input id="cq-' + c + '-a" value="' + esc(q.author) + '">' +
        '</div>';
    });

    html += '<button class="btn btn-primary" id="btn-save-quotes">Save All Quotes</button>';
    el.innerHTML = html;

    document.getElementById('btn-save-quotes').onclick = function () {
      var updated = {};
      cards.forEach(function (c) {
        updated[c] = {
          quote: document.getElementById('cq-' + c + '-q').value,
          author: document.getElementById('cq-' + c + '-a').value
        };
      });
      saveFile('card-quotes', updated).then(function () { renderCardQuotes(el); });
    };
  }

})();
