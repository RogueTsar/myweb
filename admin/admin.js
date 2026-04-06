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
    'card-quotes': '/assets/data/card-quotes.json',
    'bio': '/assets/data/bio.json'
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
      { id: 'card-quotes', label: 'Card Quotes' },
      { id: 'bio', label: 'Bio Editor' },
      { id: 'spotify', label: 'Spotify' }
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
      case 'bio': renderBioEditor(main); break;
      case 'spotify': renderSpotify(main); break;
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
    var phases = JSON.parse(localStorage.getItem('vs-admin-phases') || '{}');
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
    html += '<h3>Phase Progress</h3><div class="phase-grid">';

    phaseList.forEach(function (p) {
      var status = phases[p.id] || 'not-started';
      html += '<div class="card phase-card" data-phase="' + p.id + '">' +
        '<h4>' + p.name + '</h4>' +
        '<span class="badge ' + (badgeClass[status] || '') + '">' + status + '</span>' +
        '</div>';
    });
    html += '</div>';

    // Scan
    html += '<h3>Content Readiness</h3>';
    html += '<button class="btn" id="btn-scan">Scan for [to be placed]</button>';
    html += '<div id="scan-results" style="margin-top:12px"></div>';

    // Deploy gate
    var placeholders = scanPlaceholders();
    var totalP = placeholders.reduce(function (s, r) { return s + r.count; }, 0);
    var allComplete = phaseList.every(function (p) { return (phases[p.id] || '') === 'tested' || (phases[p.id] || '') === 'complete'; });

    html += '<div class="deploy-gate ' + (totalP === 0 && allComplete ? 'ready' : 'not-ready') + '">';
    if (totalP === 0 && allComplete) {
      html += '<span class="badge badge-success">READY TO DEPLOY</span>';
    } else {
      html += '<span class="badge badge-danger">NOT READY</span>';
      if (totalP > 0) html += ' <span style="font-size:13px;color:var(--admin-text-dim)">' + totalP + ' placeholders remaining</span>';
    }
    html += '<div class="deploy-commands">git checkout main\ngit merge redesign/2026-04-01\ngit push origin main</div>';
    html += '</div>';

    // Notes
    html += '<h3>Notes</h3>';
    html += '<textarea class="notes-area" id="admin-notes" placeholder="Log your progress here...">' + esc(localStorage.getItem('vs-admin-notes') || '') + '</textarea>';

    el.innerHTML = html;

    // Events
    document.getElementById('btn-dir-access').onclick = requestDirAccess;
    document.getElementById('btn-scan').onclick = function () {
      var res = scanPlaceholders();
      var div = document.getElementById('scan-results');
      if (res.length === 0) {
        div.innerHTML = '<span class="badge badge-success">All content filled!</span>';
      } else {
        div.innerHTML = res.map(function (r) {
          return '<div class="scan-result"><span class="scan-result-file">' + r.file + '</span> — ' + r.count + ' placeholder' + (r.count > 1 ? 's' : '') + '</div>';
        }).join('');
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
    var data = cache['card-quotes'] || { cards: [] };
    if (!data.cards) data.cards = [];

    var html = '<h2>Balatro Cards</h2>';
    html += '<p style="color:var(--admin-text-dim);font-size:13px;margin-bottom:16px">Each card has separate quotes for light and dark mode. Add as many cards as you want.</p>';
    html += '<button class="btn btn-primary btn-sm" id="btn-add-card">+ Add Card</button>';
    html += '<div class="item-list" style="margin-top:16px">';

    data.cards.forEach(function (c, i) {
      html += '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-row" style="margin-bottom:12px">' +
          '<h4 style="text-transform:capitalize;margin:0">' + esc(c.id) + '</h4>' +
          '<button class="btn btn-sm btn-danger" data-action="del-card" data-idx="' + i + '">Delete Card</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<div>' +
            '<label style="color:var(--admin-accent)">Light Mode Image Path</label>' +
            '<input id="cq-' + i + '-limg" value="' + esc(c.lightImage || '') + '" placeholder="/assets/images/card.png">' +
          '</div>' +
          '<div>' +
            '<label style="color:var(--admin-accent)">Dark Mode Image Path</label>' +
            '<input id="cq-' + i + '-dimg" value="' + esc(c.darkImage || '') + '" placeholder="/assets/images/card-dark.png">' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">' +
          '<div style="border:1px solid var(--admin-border);border-radius:8px;padding:12px">' +
            '<h5 style="margin:0 0 8px;color:var(--admin-text-dim)">Light Mode Quote</h5>' +
            '<label>Quote</label><textarea id="cq-' + i + '-lq" rows="3">' + esc(c.light ? c.light.quote : '') + '</textarea>' +
            '<label>Author, Work, Year. Context.</label><textarea id="cq-' + i + '-la" rows="2">' + esc(c.light ? c.light.author : '') + '</textarea>' +
          '</div>' +
          '<div style="border:1px solid var(--admin-border);border-radius:8px;padding:12px">' +
            '<h5 style="margin:0 0 8px;color:var(--admin-text-dim)">Dark Mode Quote</h5>' +
            '<label>Quote</label><textarea id="cq-' + i + '-dq" rows="3">' + esc(c.dark ? c.dark.quote : '') + '</textarea>' +
            '<label>Author, Work, Year. Context.</label><textarea id="cq-' + i + '-da" rows="2">' + esc(c.dark ? c.dark.author : '') + '</textarea>' +
          '</div>' +
        '</div>' +
        '</div>';
    });

    html += '</div>';
    html += '<button class="btn btn-primary" id="btn-save-quotes" style="margin-top:12px">Save All Cards</button>';
    el.innerHTML = html;

    document.getElementById('btn-add-card').onclick = function () {
      var id = prompt('Card ID (slug, e.g. "emperor"):');
      if (!id) return;
      data.cards.push({
        id: id,
        lightImage: '/assets/images/' + id + '.png',
        darkImage: '/assets/images/' + id + '-dark.png',
        light: { quote: '', author: '' },
        dark: { quote: '', author: '' }
      });
      saveFile('card-quotes', data).then(function () { renderCardQuotes(el); });
    };

    el.querySelectorAll('[data-action="del-card"]').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-idx'));
        if (confirm('Delete card "' + data.cards[idx].id + '"?')) {
          data.cards.splice(idx, 1);
          saveFile('card-quotes', data).then(function () { renderCardQuotes(el); });
        }
      };
    });

    document.getElementById('btn-save-quotes').onclick = function () {
      data.cards.forEach(function (c, i) {
        c.lightImage = document.getElementById('cq-' + i + '-limg').value;
        c.darkImage = document.getElementById('cq-' + i + '-dimg').value;
        c.light = {
          quote: document.getElementById('cq-' + i + '-lq').value,
          author: document.getElementById('cq-' + i + '-la').value
        };
        c.dark = {
          quote: document.getElementById('cq-' + i + '-dq').value,
          author: document.getElementById('cq-' + i + '-da').value
        };
      });
      saveFile('card-quotes', data).then(function () { renderCardQuotes(el); });
    };
  }

  /* ──────────────────────────────────────
     TAB: Bio Editor
     ────────────────────────────────────── */
  function renderBioEditor(el) {
    var data = cache['bio'] || { paragraphs: [], contacts: [] };
    if (!data.paragraphs) data.paragraphs = [];
    if (!data.contacts) data.contacts = [];

    var html = '<h2>Bio Editor</h2>';
    html += '<p style="color:var(--admin-text-dim);font-size:13px;margin-bottom:16px">' +
      'Use <code>{trigger text|expanded text}</code> syntax for telescopic (click-to-expand) words. ' +
      'Example: <code>I study {Law|Law with a double major in Political Science}</code></p>';

    html += '<h3>Paragraphs</h3>';
    html += '<button class="btn btn-primary btn-sm" id="btn-add-para">+ Add Paragraph</button>';
    html += '<div class="item-list" style="margin-top:12px">';
    data.paragraphs.forEach(function (p, i) {
      html += '<div class="card"><div class="card-row" style="margin-bottom:8px">' +
        '<strong>Paragraph ' + (i + 1) + '</strong>' +
        '<button class="btn btn-sm btn-danger" data-action="del-para" data-idx="' + i + '">Delete</button>' +
        '</div>' +
        '<textarea id="bio-p-' + i + '" rows="4" style="width:100%">' + esc(p.text) + '</textarea>' +
        '</div>';
    });
    html += '</div>';

    html += '<h3>Contact Links</h3>';
    html += '<button class="btn btn-primary btn-sm" id="btn-add-contact">+ Add Link</button>';
    html += '<div class="item-list" style="margin-top:12px">';
    data.contacts.forEach(function (c, i) {
      html += '<div class="card"><div style="display:grid;grid-template-columns:1fr 2fr 1fr auto;gap:8px;align-items:center">' +
        '<input id="bio-c-' + i + '-label" value="' + esc(c.label) + '" placeholder="Label">' +
        '<input id="bio-c-' + i + '-url" value="' + esc(c.url) + '" placeholder="URL">' +
        '<input id="bio-c-' + i + '-class" value="' + esc(c.class || '') + '" placeholder="CSS class (optional)">' +
        '<button class="btn btn-sm btn-danger" data-action="del-contact" data-idx="' + i + '">Del</button>' +
        '</div></div>';
    });
    html += '</div>';

    html += '<button class="btn btn-primary" id="btn-save-bio" style="margin-top:16px">Save Bio</button>';
    html += '<div id="bio-preview" style="margin-top:24px;padding:20px;border:1px solid var(--admin-border);border-radius:8px;background:var(--admin-surface)"></div>';
    el.innerHTML = html;

    // Preview
    updateBioPreview(data);

    document.getElementById('btn-add-para').onclick = function () {
      data.paragraphs.push({ text: '' });
      saveFile('bio', data).then(function () { renderBioEditor(el); });
    };

    document.getElementById('btn-add-contact').onclick = function () {
      data.contacts.push({ label: '', url: '', class: '' });
      saveFile('bio', data).then(function () { renderBioEditor(el); });
    };

    el.querySelectorAll('[data-action="del-para"]').forEach(function (btn) {
      btn.onclick = function () {
        data.paragraphs.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('bio', data).then(function () { renderBioEditor(el); });
      };
    });

    el.querySelectorAll('[data-action="del-contact"]').forEach(function (btn) {
      btn.onclick = function () {
        data.contacts.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveFile('bio', data).then(function () { renderBioEditor(el); });
      };
    });

    document.getElementById('btn-save-bio').onclick = function () {
      data.paragraphs.forEach(function (p, i) {
        p.text = document.getElementById('bio-p-' + i).value;
      });
      data.contacts.forEach(function (c, i) {
        c.label = document.getElementById('bio-c-' + i + '-label').value;
        c.url = document.getElementById('bio-c-' + i + '-url').value;
        c.class = document.getElementById('bio-c-' + i + '-class').value || undefined;
      });
      saveFile('bio', data).then(function () {
        renderBioEditor(el);
        showToast('Bio saved! Push to GitHub to deploy.');
      });
    };

    // Live preview on input
    el.querySelectorAll('textarea, input').forEach(function (input) {
      input.addEventListener('input', function () {
        var preview = { paragraphs: [], contacts: [] };
        data.paragraphs.forEach(function (p, i) {
          var textarea = document.getElementById('bio-p-' + i);
          preview.paragraphs.push({ text: textarea ? textarea.value : p.text });
        });
        updateBioPreview(preview);
      });
    });
  }

  function updateBioPreview(data) {
    var container = document.getElementById('bio-preview');
    if (!container || !data.paragraphs) return;
    var html = '<h4 style="color:var(--admin-text-dim);margin-bottom:8px;font-size:12px">PREVIEW</h4>';
    data.paragraphs.forEach(function (p) {
      var rendered = esc(p.text).replace(/\{([^|]+)\|([^}]+)\}/g, function (_, trigger, expanded) {
        return '<u style="color:var(--admin-accent);cursor:help" title="Expands to: ' + expanded + '">' + trigger + '</u>';
      });
      html += '<p style="margin-bottom:0.75rem;line-height:1.6">' + rendered + '</p>';
    });
    container.innerHTML = html;
  }

  /* ──────────────────────────────────────
     TAB: Spotify
     ────────────────────────────────────── */
  function renderSpotify(el) {
    var html = '<h2>Spotify Integration</h2>';

    // Health check
    html += '<h3>API Health Check</h3>';
    html += '<button class="btn btn-primary" id="btn-spotify-check">Check Spotify API</button>';
    html += '<div id="spotify-status" style="margin-top:12px"></div>';

    // Auto-check toggle
    var autoCheck = localStorage.getItem('vs-spotify-autocheck') === 'true';
    html += '<div style="margin-top:12px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
      '<input type="checkbox" id="spotify-autocheck"' + (autoCheck ? ' checked' : '') + '> ' +
      '<span style="font-size:13px">Auto-check every 5 minutes when admin is open</span></label></div>';

    // Fix guide
    html += '<h3 style="margin-top:24px">If Spotify Is Not Working</h3>';
    html += '<div class="card" style="font-size:13px;line-height:1.6">';
    html += '<p><strong>Step 1: Check the API</strong><br>Click "Check Spotify API" above. If it says "Could not load" or shows an error, your refresh token is expired.</p>';
    html += '<p style="margin-top:8px"><strong>Step 2: Generate a new token</strong><br>Open terminal and run:</p>';
    html += '<pre style="background:var(--admin-bg);padding:12px;border-radius:6px;margin:8px 0;overflow-x:auto;font-size:12px">cd ~/myweb\nnode scripts/get-spotify-token.js</pre>';
    html += '<p>It will open Spotify in your browser. Log in and approve. The script prints your new token.</p>';
    html += '<p style="margin-top:8px"><strong>Step 3: Update Vercel</strong></p>';
    html += '<ol style="padding-left:20px;margin:4px 0">';
    html += '<li>Go to <a href="https://vercel.com" target="_blank" style="color:var(--admin-accent)">Vercel Dashboard</a> > your project > Settings > Environment Variables</li>';
    html += '<li>Delete the old <code>SPOTIFY_REFRESH_TOKEN</code></li>';
    html += '<li>Add the new one from the script output</li>';
    html += '<li>Redeploy: push any change to <code>main</code> or click "Redeploy" in Vercel</li>';
    html += '</ol>';
    html += '<p style="margin-top:8px"><strong>Step 4: Verify</strong><br>Wait 1 minute, then click "Check Spotify API" again.</p>';
    html += '</div>';

    // Current API response preview
    html += '<h3 style="margin-top:24px">Current API Response</h3>';
    html += '<div id="spotify-raw" style="max-height:400px;overflow:auto;font-size:11px;background:var(--admin-bg);padding:12px;border-radius:6px;border:1px solid var(--admin-border)">Click "Check Spotify API" to load.</div>';

    el.innerHTML = html;

    document.getElementById('btn-spotify-check').onclick = function () { checkSpotify(); };
    document.getElementById('spotify-autocheck').onchange = function () {
      localStorage.setItem('vs-spotify-autocheck', this.checked ? 'true' : 'false');
      if (this.checked) startAutoCheck();
      else stopAutoCheck();
    };

    if (autoCheck) startAutoCheck();
  }

  var spotifyCheckInterval = null;

  function startAutoCheck() {
    stopAutoCheck();
    spotifyCheckInterval = setInterval(checkSpotify, 5 * 60 * 1000);
  }

  function stopAutoCheck() {
    if (spotifyCheckInterval) clearInterval(spotifyCheckInterval);
    spotifyCheckInterval = null;
  }

  function checkSpotify() {
    var statusEl = document.getElementById('spotify-status');
    var rawEl = document.getElementById('spotify-raw');
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--admin-text-dim)">Checking...</span>';

    fetch('/api/spotify')
      .then(function (res) {
        if (!res.ok) throw new Error('API returned ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (statusEl) {
          var trackCount = (data.top_tracks || []).length;
          var artistCount = (data.top_artists || []).length;
          var playlistCount = (data.playlists || []).length;
          var lastPlayed = data.last_played ? data.last_played.track + ' by ' + data.last_played.artist : 'None';
          statusEl.innerHTML =
            '<span class="badge badge-success">WORKING</span>' +
            '<div style="margin-top:8px;font-size:13px;color:var(--admin-text-dim)">' +
              'Top tracks: ' + trackCount + ' | Top artists: ' + artistCount + ' | Playlists: ' + playlistCount +
              '<br>Last played: ' + esc(lastPlayed) +
            '</div>';
        }
        if (rawEl) rawEl.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (err) {
        if (statusEl) {
          statusEl.innerHTML =
            '<span class="badge badge-danger">NOT WORKING</span>' +
            '<div style="margin-top:8px;font-size:13px;color:var(--admin-danger)">' + esc(err.message) + '</div>' +
            '<p style="margin-top:8px;font-size:13px">Follow the fix guide below to regenerate your Spotify token.</p>';
        }
        if (rawEl) rawEl.textContent = 'Error: ' + err.message;
      });
  }

})();

