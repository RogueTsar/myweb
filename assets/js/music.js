/* ── Spotify Music Dashboard ── */

var vibeCache = {};

document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/spotify')
        .then(function (res) {
            if (!res.ok) throw new Error('API returned ' + res.status);
            return res.json();
        })
        .then(function (data) {
            renderLastPlayed(data.last_played);
            renderRecentHistory(data.recent_tracks);
            renderInsights(data.audio_features, data.top_artists, data.top_tracks, data.recent_tracks);
            renderBarChart('top-artists', data.top_artists, 'name');
            renderBarChart('top-tracks', data.top_tracks, 'full');
            if (window.MusicViews) window.MusicViews.init(data.top_tracks);
            renderVinylShelf(data.top_tracks);
            renderGenres(data.top_genres);
            renderPlaylists(data.playlists);
            if (data.spotify_url) {
                var link = document.getElementById('spotify-profile-link');
                if (link) link.href = data.spotify_url;
            }
        })
        .catch(function () {
            showError('last-played');
            showError('recent-history');
            showError('top-artists');
            showError('top-tracks');
            showError('top-genres');
            showError('playlists');
        });
});

/* ── Last Played ── */

function renderLastPlayed(data) {
    var container = document.getElementById('last-played');
    if (!data) {
        container.innerHTML = '<p class="music-error">No recent listening data.</p>';
        return;
    }
    var statusClass = data.is_playing ? 'last-played-card__status--playing' : 'last-played-card__status--paused';
    var statusText = data.is_playing ? 'Now Playing' : 'Last Played';
    container.innerHTML =
        '<div class="last-played-card">' +
            '<img class="last-played-card__art" src="' + escapeHtml(data.album_art) + '" alt="Album art">' +
            '<div class="last-played-card__info">' +
                '<div class="last-played-card__track">' + escapeHtml(data.track) + '</div>' +
                '<div class="last-played-card__artist">' + escapeHtml(data.artist) + '</div>' +
                '<div class="last-played-card__album">' + escapeHtml(data.album) + '</div>' +
                '<span class="last-played-card__status ' + statusClass + '">' + statusText + '</span>' +
            '</div>' +
        '</div>';
}

/* ── Recent History ── */

function renderRecentHistory(tracks) {
    var container = document.getElementById('recent-history');
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<p class="music-error">No history available.</p>';
        return;
    }
    var html = '<ul class="history-list">';
    for (var i = 0; i < tracks.length; i++) {
        var t = tracks[i];
        html +=
            '<li class="history-item">' +
                '<img class="history-item__art" src="' + escapeHtml(t.album_art) + '" alt="">' +
                '<div class="history-item__info">' +
                    '<span class="history-item__track">' + escapeHtml(t.track) + '</span>' +
                    '<span class="history-item__artist">' + escapeHtml(t.artist) + '</span>' +
                '</div>' +
            '</li>';
    }
    html += '</ul>';
    container.innerHTML = html;
}

/* ── Listening Insights (Pudding-style) ── */

var INSIGHT_LABELS = {
    obscurity: [
        [20, 'You listen to the radio'],
        [40, 'Spotify Wrapped basic'],
        [60, 'Hipster adjacent'],
        [80, 'Underground explorer'],
        [101, 'Nobody has heard of your artists']
    ],
    loyalty: [
        [20, 'Genre tourist'],
        [40, 'Casual sampler'],
        [60, 'Has favorites'],
        [80, 'Ride or die fan'],
        [101, 'Obsessive repeater']
    ],
    diversity: [
        [20, 'Genre monogamist'],
        [40, 'Stays in their lane'],
        [60, 'Eclectic dabbler'],
        [80, 'Genre nomad'],
        [101, 'Chaotic completionist']
    ],
    mainstream: [
        [25, 'Deep underground'],
        [50, 'Knows the B-sides'],
        [75, 'Charts-adjacent'],
        [101, 'Main pop girl energy']
    ]
};

/* Icon SVGs — use currentColor so they flip with dark/light mode */
var INSIGHT_ICONS = {
    obscurity: '<svg class="insight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    mainstream: '<svg class="insight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    loyalty: '<svg class="insight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    diversity: '<svg class="insight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'
};

function getLabel(metric, value) {
    var tiers = INSIGHT_LABELS[metric];
    for (var i = 0; i < tiers.length; i++) {
        if (value < tiers[i][0]) return { text: tiers[i][1] };
    }
    return { text: tiers[tiers.length - 1][1] };
}

function renderInsights(audioFeatures, topArtists, topTracks, recentTracks) {
    var section = document.getElementById('insights-section');
    var teaser = document.getElementById('insights-teaser');
    var grid = document.getElementById('insights-grid');

    if ((!topArtists || topArtists.length === 0) && (!topTracks || topTracks.length === 0)) return;

    // Obscurity: inverse of average artist popularity
    var obscurity = 50;
    if (topArtists && topArtists.length > 0) {
        var popSum = 0;
        topArtists.forEach(function (a) { popSum += (a.popularity || 50); });
        obscurity = Math.round(100 - popSum / topArtists.length);
    }

    // Mainstream: average popularity directly
    var mainstream = 50;
    if (topArtists && topArtists.length > 0) {
        var ms = 0;
        topArtists.forEach(function (a) { ms += (a.popularity || 50); });
        mainstream = Math.round(ms / topArtists.length);
    }

    // Loyalty: how many times same artist appears in top tracks vs unique artists
    var loyalty = 50;
    if (topTracks && topTracks.length > 1) {
        var artistSet = {};
        topTracks.forEach(function (t) { artistSet[t.artist] = true; });
        var uniqueRatio = Object.keys(artistSet).length / topTracks.length;
        loyalty = Math.round((1 - uniqueRatio) * 100);
    }

    // Diversity: unique artists across recent + top combined
    var diversity = 50;
    var allArtists = {};
    (topArtists || []).forEach(function (a) { allArtists[a.name] = true; });
    (recentTracks || []).forEach(function (t) { allArtists[t.artist] = true; });
    var totalSlots = (topArtists ? topArtists.length : 0) + (recentTracks ? recentTracks.length : 0);
    if (totalSlots > 0) {
        diversity = Math.round((Object.keys(allArtists).length / totalSlots) * 100);
    }

    // If we have audio features (older apps), compute those too
    var hasAudio = audioFeatures && audioFeatures.length > 0;
    var audioMetrics = {};
    if (hasAudio) {
        var sum = { energy: 0, danceability: 0, valence: 0, tempo: 0 };
        audioFeatures.forEach(function (f) {
            sum.energy += f.energy;
            sum.danceability += f.danceability;
            sum.valence += f.valence;
            sum.tempo += f.tempo;
        });
        var n = audioFeatures.length;
        audioMetrics = {
            energy: Math.round((sum.energy / n) * 100),
            danceability: Math.round((sum.danceability / n) * 100),
            valence: Math.round((sum.valence / n) * 100),
            tempo: Math.round(sum.tempo / n)
        };
    }

    // Build personality headline from the two most distinctive metrics
    var allMetrics = [
        { key: 'obscurity', score: obscurity, dist: Math.abs(obscurity - 50) },
        { key: 'mainstream', score: mainstream, dist: Math.abs(mainstream - 50) },
        { key: 'loyalty', score: loyalty, dist: Math.abs(loyalty - 50) },
        { key: 'diversity', score: diversity, dist: Math.abs(diversity - 50) }
    ];
    // Sort by distance from 50 (most distinctive first), drop mainstream if obscurity is picked
    allMetrics.sort(function (a, b) { return b.dist - a.dist; });
    var headlineTraits = [];
    var usedKeys = {};
    for (var hi = 0; hi < allMetrics.length && headlineTraits.length < 2; hi++) {
        var m = allMetrics[hi];
        if (m.key === 'mainstream' && usedKeys['obscurity']) continue;
        if (m.key === 'obscurity' && usedKeys['mainstream']) continue;
        headlineTraits.push(getLabel(m.key, m.score).text.toLowerCase());
        usedKeys[m.key] = true;
    }

    var headline = headlineTraits.length > 0
        ? 'You\'re a <em>' + headlineTraits[0] + '</em>' + (headlineTraits[1] ? ' with <em>' + headlineTraits[1] + '</em> streak' : '') + '.'
        : 'Your taste is... <em>eclectic</em>.';

    section.style.display = '';
    teaser.innerHTML = '<p class="insights-headline">' + headline + '</p>';

    // Metric cards
    var metrics = [
        { key: 'obscurity', label: 'Obscurity', value: obscurity, max: 100 },
        { key: 'mainstream', label: 'Mainstream', value: mainstream, max: 100 },
        { key: 'loyalty', label: 'Artist Loyalty', value: loyalty, max: 100 },
        { key: 'diversity', label: 'Diversity', value: diversity, max: 100 }
    ];

    var html = '<div class="insights-cards">';
    metrics.forEach(function (m) {
        var info = getLabel(m.key, m.value);
        var icon = INSIGHT_ICONS[m.key] || '';
        var pct = Math.min(Math.round((m.value / m.max) * 100), 100);
        html +=
            '<div class="insight-card">' +
                '<div class="insight-card__header">' +
                    '<span class="insight-card__icon">' + icon + '</span>' +
                    '<span class="insight-card__label">' + m.label + '</span>' +
                    '<span class="insight-card__value">' + m.value + '%</span>' +
                '</div>' +
                '<div class="insight-card__bar-bg">' +
                    '<div class="insight-card__bar" data-width="' + pct + '%"></div>' +
                '</div>' +
                '<div class="insight-card__desc">' + escapeHtml(info.text) + '</div>' +
            '</div>';
    });
    html += '</div>';
    grid.innerHTML = html;

    requestAnimationFrame(function () {
        var bars = grid.querySelectorAll('.insight-card__bar');
        for (var k = 0; k < bars.length; k++) {
            bars[k].style.width = bars[k].getAttribute('data-width');
        }
    });
}

/* ── Bar Chart ── */

function renderBarChart(containerId, items, mode) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="music-error">No data available.</p>';
        return;
    }
    var total = items.length;
    var html = '<div class="bar-chart">';
    for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var pct = Math.round(100 - ((item.rank - 1) / total) * 72);

        // Build styled label: song name (maroon) + artist (highlighted) + genre tags
        var labelHtml;
        if (mode === 'full') {
            labelHtml = '<span class="bar-chart-row__name">' + escapeHtml(item.name) + '</span> ' +
                '<span class="bar-chart-row__artist-hl">' + escapeHtml(item.artist) + '</span>';
        } else {
            labelHtml = '<span class="bar-chart-row__name">' + escapeHtml(item.name) + '</span>';
        }

        // Genre tags
        var genreHtml = '';
        if (item.genres && item.genres.length > 0) {
            item.genres.forEach(function (g) {
                genreHtml += ' <span class="bar-chart-row__genre-hl">' + escapeHtml(g) + '</span>';
            });
        }

        html +=
            '<div class="bar-chart-row">' +
                '<span class="bar-chart-row__rank">' + item.rank + '</span>' +
                '<span class="bar-chart-row__label">' + labelHtml + genreHtml + '</span>' +
                '<div class="bar-chart-row__bar-container">' +
                    '<div class="bar-chart-row__bar" data-width="' + pct + '%"></div>' +
                '</div>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    requestAnimationFrame(function () {
        var bars = container.querySelectorAll('.bar-chart-row__bar');
        for (var k = 0; k < bars.length; k++) {
            bars[k].style.width = bars[k].getAttribute('data-width');
        }
    });
}

/* ── Vinyl Record Shelf ── */

function renderVinylShelf(topTracks) {
    var section = document.getElementById('vinyl-section');
    var container = document.getElementById('vinyl-shelf');
    if (!topTracks || topTracks.length === 0) return;

    // Deduplicate by album name
    var seen = {};
    var albums = [];
    topTracks.forEach(function (t) {
        if (t.album_art && t.album && !seen[t.album]) {
            seen[t.album] = true;
            albums.push({ album: t.album, artist: t.artist, art: t.album_art });
        }
    });
    if (albums.length === 0) return;

    section.style.display = '';
    var html = '<div class="vinyl-shelf-scroll">';
    albums.forEach(function (a, i) {
        html +=
            '<div class="vinyl-slot" style="--i:' + i + '">' +
                '<div class="vinyl-sleeve">' +
                    '<div class="vinyl-record">' +
                        '<div class="vinyl-grooves"></div>' +
                        '<div class="vinyl-label">' +
                            '<img src="' + escapeHtml(a.art) + '" alt="' + escapeHtml(a.album) + '" loading="lazy">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="vinyl-info">' +
                    '<span class="vinyl-album">' + escapeHtml(a.album) + '</span>' +
                    '<span class="vinyl-artist">' + escapeHtml(a.artist) + '</span>' +
                '</div>' +
            '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

/* ── Genres ── */

function renderGenres(genres) {
    var container = document.getElementById('top-genres');
    var section = container && container.closest('.music-section');
    if (!genres || genres.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    var html = '<div class="genre-tags">';
    for (var i = 0; i < genres.length; i++) {
        html += '<span class="genre-tag">' + escapeHtml(genres[i]) + '</span>';
    }
    html += '</div>';
    container.innerHTML = html;
}

/* ── Playlists with Vibe ── */

function renderPlaylists(playlists) {
    var container = document.getElementById('playlists');
    var section = document.getElementById('playlists-section');
    if (!playlists || playlists.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    var html = '<div class="playlist-drawer">';
    for (var i = 0; i < playlists.length; i++) {
        var p = playlists[i];
        var imgHtml = p.image
            ? '<img class="playlist-drawer-card__img" src="' + escapeHtml(p.image) + '" alt="" loading="lazy">'
            : '<div class="playlist-drawer-card__img playlist-drawer-card__img--placeholder"></div>';
        var countText = p.track_count > 0 ? p.track_count + ' tracks' : '';
        var descHtml = p.description ? '<div class="playlist-drawer-card__desc">' + escapeHtml(p.description) + '</div>' : '';
        html +=
            '<a class="playlist-drawer-card" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener">' +
                imgHtml +
                '<div class="playlist-drawer-card__body">' +
                    '<div class="playlist-drawer-card__name">' + escapeHtml(p.name) + '</div>' +
                    (countText ? '<div class="playlist-drawer-card__count">' + countText + '</div>' : '') +
                    descHtml +
                '</div>' +
            '</a>';
    }
    html += '</div>';
    container.innerHTML = html;
}

function handlePlaylistClick(e) {
    var card = e.currentTarget;
    var id = card.getAttribute('data-playlist-id');
    var panel = document.getElementById('vibe-panel-' + id);

    // If panel already showing, open Spotify link
    if (card.classList.contains('playlist-card--expanded')) {
        window.open(card.getAttribute('data-url'), '_blank');
        return;
    }

    // Collapse any other expanded card
    var expanded = document.querySelector('.playlist-card--expanded');
    if (expanded && expanded !== card) {
        expanded.classList.remove('playlist-card--expanded');
    }

    card.classList.toggle('playlist-card--expanded');

    if (!card.classList.contains('playlist-card--expanded')) return;

    // Check cache
    if (vibeCache[id]) {
        renderVibePanel(id, vibeCache[id]);
        return;
    }

    panel.innerHTML = '<div class="loading-skeleton" style="height:60px;margin-top:0.5rem;"></div>';

    fetch('/api/spotify-details?type=playlist-vibe&id=' + id)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.vibe) {
                vibeCache[id] = data.vibe;
                renderVibePanel(id, data.vibe);
                // Also set badge
                var badge = document.getElementById('vibe-badge-' + id);
                if (badge) badge.textContent = data.vibe.emoji + ' ' + data.vibe.label;
            } else {
                panel.innerHTML = '<p class="music-error" style="font-size:0.75rem;">No vibe data</p>';
            }
        })
        .catch(function () {
            panel.innerHTML = '<p class="music-error" style="font-size:0.75rem;">Could not load vibe</p>';
        });
}

function renderVibePanel(id, vibe) {
    var panel = document.getElementById('vibe-panel-' + id);
    var badge = document.getElementById('vibe-badge-' + id);
    if (badge) badge.textContent = vibe.emoji + ' ' + vibe.label;

    var bars = [
        { label: 'Energy', value: vibe.energy },
        { label: 'Dance', value: vibe.danceability },
        { label: 'Mood', value: vibe.mood }
    ];

    var html =
        '<div class="vibe-details">' +
            '<div class="vibe-details__bpm">' + vibe.bpm + ' bpm</div>' +
            '<div class="vibe-details__bars">';
    bars.forEach(function (b) {
        html +=
            '<div class="vibe-bar-row">' +
                '<span class="vibe-bar-row__label">' + b.label + '</span>' +
                '<div class="vibe-bar-row__bg">' +
                    '<div class="vibe-bar-row__fill" style="width:' + b.value + '%"></div>' +
                '</div>' +
                '<span class="vibe-bar-row__val">' + b.value + '</span>' +
            '</div>';
    });
    html +=
            '</div>' +
            '<div class="vibe-details__label">' + vibe.emoji + ' ' + vibe.label + '</div>' +
        '</div>';

    panel.innerHTML = html;
}

/* ── Utilities ── */

function showError(containerId) {
    var container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<p class="music-error">Could not load data.</p>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
