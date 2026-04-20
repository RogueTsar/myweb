/* ── Spotify Music Dashboard ── */

var vibeCache = {};

document.addEventListener('DOMContentLoaded', function () {
    var spotifyReq = fetch('/api/spotify')
        .then(function (res) {
            if (!res.ok) {
                return res.json().then(function (body) {
                    throw new Error(body.error || ('API returned ' + res.status));
                }).catch(function (e) {
                    if (e.message && e.message !== '[object Object]') throw e;
                    throw new Error('API returned ' + res.status);
                });
            }
            return res.json();
        });

    var lastfmReq = fetch('/api/lastfm')
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });

    Promise.allSettled([spotifyReq, lastfmReq]).then(function (results) {
        var spotifyResult = results[0];
        var lfmResult     = results[1];

        if (spotifyResult.status === 'rejected') {
            var msg = spotifyResult.reason && spotifyResult.reason.message
                ? spotifyResult.reason.message : 'Could not load data.';
            var lp = document.getElementById('last-played');
            if (lp) lp.innerHTML = '<p class="music-error">' + escapeHtml(msg) + '</p>';
            showError('recent-history');
            showError('top-artists');
            showError('top-tracks');
            showError('top-genres');
            showError('playlists');
            return;
        }

        var data    = spotifyResult.value;
        var lfmData = lfmResult.status === 'fulfilled' ? lfmResult.value : null;

        window.__musicData   = data;
        window.__lastfmData  = lfmData;

        renderLastPlayed(data.last_played);
        renderRecentHistory(data.recent_tracks);
        renderInsights(data.audio_features, data.top_artists, data.top_tracks, data.recent_tracks, data.personality, lfmData);
        renderF1Podium(data.top_artists);
        renderBarChart('top-tracks', data.top_tracks, 'full');
        if (window.MusicViews) window.MusicViews.init(data.top_tracks);
        renderVinylShelf(data.top_tracks);
        renderGenres(data.top_genres);
        renderGenresAcrossTime(data.genres_by_range, data.top_artists_by_range);
        renderPlaylists(data.playlists);

        if (lfmData && lfmData.monthly_history && lfmData.monthly_history.length > 0) {
            renderLastfmHistory(lfmData.monthly_history);
        } else {
            loadPastMonths();
        }

        if (data.spotify_url) {
            var link = document.getElementById('spotify-profile-link');
            if (link) link.href = data.spotify_url;
        }
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

function renderInsights(audioFeatures, topArtists, topTracks, recentTracks, serverPersonality, lfmData) {
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

    // Richer metadata row: genre breadth, unique artist count, top genre
    var uniqueArtists = Object.keys(allArtists).length;
    // Prefer Last.fm user tag count (scrobble-based, far more accurate than Spotify's sparse genre data)
    var genreBreadth = null;
    if (lfmData && lfmData.user_top_tags && lfmData.user_top_tags.length > 0) {
        genreBreadth = lfmData.user_top_tags.length;
    } else if (serverPersonality && serverPersonality.genre_breadth != null) {
        genreBreadth = serverPersonality.genre_breadth;
    }
    html += '<div class="insights-meta">';
    html += '<div class="insights-meta__item"><span class="insights-meta__num">' + uniqueArtists + '</span><span class="insights-meta__label">unique artists seen</span></div>';
    if (genreBreadth != null) {
        html += '<div class="insights-meta__item"><span class="insights-meta__num">' + genreBreadth + '</span><span class="insights-meta__label">distinct genres</span></div>';
    }
    html += '<div class="insights-meta__item"><span class="insights-meta__num">' + (topTracks ? topTracks.length : 0) + '</span><span class="insights-meta__label">top tracks this month</span></div>';
    html += '</div>';

    grid.innerHTML = html;

    requestAnimationFrame(function () {
        var bars = grid.querySelectorAll('.insight-card__bar');
        for (var k = 0; k < bars.length; k++) {
            bars[k].style.width = bars[k].getAttribute('data-width');
        }
    });

    // Evolution chart: Last.fm version (drawn later) takes priority; only use static snapshots as fallback
    if (!lfmData || !lfmData.monthly_history || lfmData.monthly_history.length === 0) {
        renderPersonalityEvolution({
            obscurity: obscurity, mainstream: mainstream, loyalty: loyalty, diversity: diversity
        });
    }
}

/* ── Personality Evolution (reads /assets/data/history/*.json snapshots) ── */

function renderPersonalityEvolution(currentMetrics) {
    var target = document.getElementById('insights-evolution');
    if (!target) return;

    fetch('/assets/data/history/index.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (months) {
            if (!months || months.length === 0) {
                // Show just the current month as a single point with a note
                var nowLabel = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
                var singlePoint = [{ month: 'current', label: nowLabel + ' (now)', p: currentMetrics }];
                drawEvolutionChart(target, singlePoint);
                target.insertAdjacentHTML('beforeend',
                    '<p class="insights-evolution__empty" style="margin-top:0.5rem;">Chart will grow as monthly snapshots accumulate.</p>');
                return;
            }
            // Load each snapshot & compute metrics
            return Promise.all(months.slice(0, 12).map(function (m) {
                return fetch('/assets/data/history/' + m.month + '.json')
                    .then(function (r) { return r.ok ? r.json() : null; })
                    .catch(function () { return null; });
            })).then(function (snapshots) {
                var points = snapshots.filter(Boolean).map(function (s) {
                    // Try to use stored personality; else compute from snapshot data
                    if (s.personality) return { month: s.month, label: s.label, p: s.personality };
                    // Fallback compute
                    var ta = s.top_artists || [];
                    var tt = s.top_tracks || [];
                    var popAvg = ta.length ? Math.round(ta.reduce(function (x, a) { return x + (a.popularity || 50); }, 0) / ta.length) : 50;
                    var aset = {}; tt.forEach(function (t) { aset[t.artist] = true; });
                    var loy = tt.length ? Math.round((1 - Object.keys(aset).length / tt.length) * 100) : 50;
                    return {
                        month: s.month, label: s.label,
                        p: { obscurity: 100 - popAvg, mainstream: popAvg, loyalty: loy, diversity: 50 }
                    };
                });

                // Append current month as the most recent point
                var nowLabel = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
                points.push({ month: 'current', label: nowLabel + ' (now)', p: currentMetrics });

                drawEvolutionChart(target, points);
            });
        })
        .catch(function () {
            target.innerHTML = '';
        });
}

function drawEvolutionChart(target, points) {
    if (points.length === 0) return;

    var w = 520, h = 190, pad = { t: 18, r: 24, b: 34, l: 38 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;

    var METRICS = [
        { key: 'obscurity',  label: 'Obscurity',  color: '#818cf8' },
        { key: 'mainstream', label: 'Mainstream', color: '#94a3b8' },
        { key: 'loyalty',    label: 'Loyalty',    color: '#fbbf24' },
        { key: 'diversity',  label: 'Diversity',  color: '#34d399' },
    ];

    function xPos(i) { return pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw); }
    function yPos(v) { return pad.t + ih - Math.max(0, Math.min(100, v)) / 100 * ih; }

    // Smooth cubic bezier through a list of {x,y} points
    function smoothLine(pts) {
        if (pts.length === 0) return '';
        if (pts.length === 1) return 'M' + pts[0].x + ',' + pts[0].y;
        var d = 'M' + pts[0].x + ',' + pts[0].y;
        for (var i = 1; i < pts.length; i++) {
            var mx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.45;
            d += ' C' + mx + ',' + pts[i - 1].y + ' ' + mx + ',' + pts[i].y + ' ' + pts[i].x + ',' + pts[i].y;
        }
        return d;
    }

    var svg = '<svg class="insights-evolution__svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">';

    // Gradient defs
    svg += '<defs>';
    METRICS.forEach(function (m) {
        svg += '<linearGradient id="evo-grad-' + m.key + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="' + m.color + '" stop-opacity="0.22"/>' +
            '<stop offset="100%" stop-color="' + m.color + '" stop-opacity="0.01"/>' +
            '</linearGradient>';
    });
    svg += '</defs>';

    // Horizontal grid
    [0, 25, 50, 75, 100].forEach(function (v) {
        var yy = yPos(v);
        svg += '<line x1="' + pad.l + '" y1="' + yy + '" x2="' + (w - pad.r) + '" y2="' + yy +
            '" stroke="rgba(255,255,255,0.055)" stroke-width="1"/>';
        svg += '<text x="' + (pad.l - 6) + '" y="' + (yy + 3.5) + '" font-size="9" fill="rgba(255,255,255,0.22)" text-anchor="end">' + v + '</text>';
    });

    // X labels — skip every other if crowded
    var skipEvery = points.length > 8 ? 2 : 1;
    points.forEach(function (p, i) {
        if (i % skipEvery !== 0 && i !== points.length - 1) return;
        var lbl = (p.label || p.month).replace(' (now)', '*');
        svg += '<text x="' + xPos(i) + '" y="' + (h - 8) + '" font-size="9" fill="rgba(255,255,255,0.3)" text-anchor="middle">' + lbl + '</text>';
    });

    // "Now" dashed vertical
    if (points.length > 1) {
        var nx = xPos(points.length - 1);
        svg += '<line x1="' + nx + '" y1="' + pad.t + '" x2="' + nx + '" y2="' + (h - pad.b) +
            '" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="4,3"/>';
    }

    // Draw each metric
    METRICS.forEach(function (m) {
        // Collect only points with real (non-null) values
        var validPts = [];
        points.forEach(function (p, i) {
            var v = p.p ? p.p[m.key] : null;
            if (v != null) validPts.push({ x: xPos(i), y: yPos(v) });
        });
        if (validPts.length === 0) return;

        var linePath = smoothLine(validPts);

        // Area fill
        if (validPts.length > 1) {
            var areaPath = linePath +
                ' L' + validPts[validPts.length - 1].x + ',' + (h - pad.b) +
                ' L' + validPts[0].x + ',' + (h - pad.b) + ' Z';
            svg += '<path d="' + areaPath + '" fill="url(#evo-grad-' + m.key + ')"/>';
        }

        // Line
        svg += '<path d="' + linePath + '" fill="none" stroke="' + m.color +
            '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

        // Dots with ring
        validPts.forEach(function (pt) {
            svg += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="4" fill="#0d1117" stroke="' + m.color + '" stroke-width="2"/>';
        });
    });

    svg += '</svg>';

    var legend = '<div class="insights-evolution__legend">' +
        METRICS.map(function (m) {
            return '<span class="insights-evolution__key">' +
                '<span class="insights-evolution__dot" style="background:' + m.color + '"></span>' +
                m.label + '</span>';
        }).join('') + '</div>';

    target.innerHTML = '<div class="insights-evolution__title">Evolution over time</div>' + svg + legend;
}

/* ── F1 Podium (Top Artists) — broadcast graphic style ── */

var F1_DRIVERS = {
    p1: { name: 'Fernando Alonso', short: 'ALO', team: 'Aston Martin',   flag: '🇪🇸', color: '#00897b', logo: '/assets/img/teams/aston-martin.svg' },
    p2: { name: 'Lewis Hamilton',  short: 'HAM', team: 'Ferrari',         flag: '🇬🇧', color: '#e8002d', logo: '/assets/img/teams/ferrari.svg'       },
    p3: { name: 'Max Verstappen',  short: 'VER', team: 'Red Bull Racing', flag: '🇳🇱', color: '#3671c6', logo: '/assets/img/teams/red-bull.svg'       },
};

/* P4–P10 drivers — fixed roster, cycling through artist slots */
var F1_LB_DRIVERS = [
    { name: 'Charles Leclerc',  short: 'LEC', team: 'Ferrari',         flag: '🇲🇨', color: '#e8002d', logo: '/assets/img/teams/ferrari.svg'       },
    { name: 'Kimi Räikkönen',   short: 'RAI', team: 'Alfa Romeo',      flag: '🇫🇮', color: '#9b0000', logo: '/assets/img/teams/alfa-romeo.svg'    },
    { name: 'Jenson Button',    short: 'BUT', team: 'McLaren',         flag: '🇬🇧', color: '#ff8000', logo: '/assets/img/teams/mclaren.svg'       },
    { name: 'Mark Webber',      short: 'WEB', team: 'Red Bull Racing', flag: '🇦🇺', color: '#3671c6', logo: '/assets/img/teams/red-bull.svg'       },
    { name: 'Oscar Piastri',    short: 'PIA', team: 'McLaren',         flag: '🇦🇺', color: '#ff8000', logo: '/assets/img/teams/mclaren.svg'       },
    { name: 'Sebastian Vettel', short: 'VET', team: 'Red Bull Racing', flag: '🇩🇪', color: '#3671c6', logo: '/assets/img/teams/red-bull.svg'       },
    { name: 'Lando Norris',     short: 'NOR', team: 'McLaren',         flag: '🇬🇧', color: '#ff8000', logo: '/assets/img/teams/mclaren.svg'       },
];

function renderF1Podium(artists) {
    var container = document.getElementById('top-artists');
    if (!container) return;
    if (!artists || artists.length === 0) {
        container.innerHTML = '<p class="music-error">No artist data available.</p>';
        return;
    }

    var p1Artist = artists[0];
    var p2Artist = artists[1];
    var p3Artist = artists[2];

    function driverCard(artist, pos) {
        if (!artist) return '';
        var d = F1_DRIVERS[pos];
        var genreStr = (artist.genres && artist.genres.length > 0) ? artist.genres.slice(0, 2).join(' · ') : '';
        var posNum = pos === 'p1' ? '1' : pos === 'p2' ? '2' : '3';
        return '<div class="f1-card f1-card--' + pos + '" style="--tc:' + d.color + '">' +
            '<div class="f1-card__watermark">' + posNum + '</div>' +
            '<div class="f1-card__inner">' +
                '<div class="f1-card__top">' +
                    '<span class="f1-card__pos">P' + posNum + '</span>' +
                    '<span class="f1-card__teamname">' + d.team.toUpperCase() + '</span>' +
                '</div>' +
                '<div class="f1-card__artist">' + escapeHtml(artist.name) + '</div>' +
                (genreStr ? '<div class="f1-card__genres">' + escapeHtml(genreStr) + '</div>' : '') +
            '</div>' +
            '<div class="f1-card__footer">' +
                '<span class="f1-card__flag">' + d.flag + '</span>' +
                '<span class="f1-card__code">' + d.short + '</span>' +
                '<span class="f1-card__drivername">' + d.name + '</span>' +
            '</div>' +
        '</div>';
    }

    // Header bar mimicking F1 broadcast style
    var html =
        '<div class="f1-broadcast">' +
        '<div class="f1-broadcast__header">' +
            '<span class="f1-broadcast__f1logo">F1</span>' +
            '<span class="f1-broadcast__label">CONSTRUCTOR STANDINGS · LAST MONTH</span>' +
        '</div>' +
        '<div class="f1-broadcast__podium">' +
            driverCard(p2Artist, 'p2') +   // left
            driverCard(p1Artist, 'p1') +   // centre — P1 is taller via CSS
            driverCard(p3Artist, 'p3') +   // right
        '</div>';

    // F1 leaderboard for P4–P10 — each slot gets a real driver from the roster
    if (artists.length > 3) {
        html += '<div class="f1-leaderboard">';
        for (var i = 3; i < Math.min(artists.length, 10); i++) {
            var a = artists[i];
            var lb = F1_LB_DRIVERS[i - 3] || { name: 'Driver', short: '???', team: '', flag: '', color: '#888', photo: '' };
            var genreLabel = (a.genres && a.genres.length > 0) ? a.genres.slice(0, 2).join(' · ') : '';
            html +=
                '<div class="f1-lb-row" style="--tc:' + lb.color + '">' +
                    '<span class="f1-lb-pos">P' + (i + 1) + '</span>' +
                    '<span class="f1-lb-flag">' + lb.flag + '</span>' +
                    '<span class="f1-lb-code">' + lb.short + '</span>' +
                    '<div class="f1-lb-info">' +
                        '<span class="f1-lb-name">' + escapeHtml(a.name) + '</span>' +
                        '<span class="f1-lb-driver">' + lb.name + ' · ' + lb.team + '</span>' +
                    '</div>' +
                    (genreLabel ? '<span class="f1-lb-genres">' + escapeHtml(genreLabel) + '</span>' : '') +
                '</div>';
        }
        html += '</div>';
    }

    html += '</div>'; // close f1-broadcast
    container.innerHTML = html;
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

        // Play count badge (only for full-mode tracks with play data)
        var playHtml = '';
        if (mode === 'full' && (item.est_plays || item.recent_plays)) {
            var plays = item.est_plays || item.recent_plays || 0;
            var exactLabel = item.recent_plays > 0
                ? item.recent_plays + ' in last 50 plays · ~' + plays + ' this month'
                : '~' + plays + ' plays this month (est.)';
            playHtml = ' <span class="bar-chart-row__plays" title="' + escapeHtml(exactLabel) + '">' +
                '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
                plays + '</span>';
        }

        html +=
            '<div class="bar-chart-row">' +
                '<span class="bar-chart-row__rank">' + item.rank + '</span>' +
                '<span class="bar-chart-row__label">' + labelHtml + genreHtml + playHtml + '</span>' +
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

function cleanDesc(str) {
    if (!str) return '';
    // Decode HTML entities, strip tags, clean up
    var div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
}

/* ── Playlist chip icon constants ── */
var PL_ICON_PLAY   = '<svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><polygon points="2,1 9,5 2,9"/></svg>';
var PL_ICON_CAL    = '<svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="1" y="2" width="10" height="9" rx="1.5"/><line x1="4" y1="1" x2="4" y2="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="1" y1="5" x2="11" y2="5"/></svg>';
var PL_ICON_NOTE   = '<svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M9 1v6.5A2 2 0 1 1 7 9V4L4 5V9.5A2 2 0 1 1 2 11V3l7-2z"/></svg>';
var PL_ICON_PERSON = '<svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><circle cx="6" cy="3.5" r="2.5"/><path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>';
var PL_ICON_TRACKS = '<svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="8" y2="6"/><line x1="1" y1="9" x2="9" y2="9"/></svg>';

function buildPlaylistChips(p) {
    var chips = '';
    if (p.track_count > 0) {
        chips += '<span class="pl-meta-chip" title="Track count">' + PL_ICON_TRACKS + p.track_count + ' tracks</span>';
    }
    if (p.last_played_rel) {
        chips += '<span class="pl-meta-chip pl-meta-chip--played" title="Last played">' +
            PL_ICON_PLAY + 'played ' + escapeHtml(p.last_played_rel) + '</span>';
    }
    if (p.last_updated_rel) {
        chips += '<span class="pl-meta-chip pl-meta-chip--updated" title="Last track added">' +
            PL_ICON_CAL + 'updated ' + escapeHtml(p.last_updated_rel) + '</span>';
    }
    if (p.top_artist) {
        chips += '<span class="pl-meta-chip pl-meta-chip--artist" title="Top artist">' +
            PL_ICON_PERSON + escapeHtml(p.top_artist) + '</span>';
    }
    var genres = p.top_genres && p.top_genres.length > 0 ? p.top_genres : (p.top_genre ? [p.top_genre] : []);
    if (genres.length > 0) {
        chips += '<span class="pl-meta-chip pl-meta-chip--genres">' + PL_ICON_NOTE +
            genres.map(function (g) { return escapeHtml(g); }).join(' · ') + '</span>';
    }
    return chips;
}

function renderPlaylists(playlists) {
    var container = document.getElementById('playlists');
    var section = document.getElementById('playlists-section');
    if (!playlists || playlists.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    var subtitle = section && section.querySelector('.music-subtitle');
    if (subtitle) subtitle.textContent = playlists.length + ' playlists · click for details';

    var html = '<div class="pl-grid">';
    for (var i = 0; i < playlists.length; i++) {
        var p = playlists[i];
        var artHtml = p.image
            ? '<img class="pl-card__art" src="' + escapeHtml(p.image) + '" alt="" loading="lazy">'
            : '<div class="pl-card__art pl-card__art--placeholder"></div>';
        var desc = cleanDesc(p.description);
        var genres = p.top_genres && p.top_genres.length > 0 ? p.top_genres : (p.top_genre ? [p.top_genre] : []);

        var genreHtml = genres.length > 0
            ? genres.map(function(g) { return '<span class="pl-panel__genre">' + escapeHtml(g) + '</span>'; }).join('')
            : '';

        var metaRows = '';
        if (p.track_count > 0)    metaRows += '<div class="pl-panel__meta-row">' + PL_ICON_TRACKS + p.track_count + ' tracks</div>';
        if (p.top_artist)          metaRows += '<div class="pl-panel__meta-row">' + PL_ICON_PERSON + escapeHtml(p.top_artist) + '</div>';
        if (p.last_updated_rel)    metaRows += '<div class="pl-panel__meta-row">' + PL_ICON_CAL + 'updated ' + escapeHtml(p.last_updated_rel) + '</div>';
        if (p.last_played_rel)     metaRows += '<div class="pl-panel__meta-row">' + PL_ICON_PLAY + 'played ' + escapeHtml(p.last_played_rel) + '</div>';

        html +=
            '<div class="pl-card" tabindex="0" role="button" aria-expanded="false" data-url="' + escapeHtml(p.url || '#') + '">' +
                '<div class="pl-card__face">' +
                    '<div class="pl-card__header">' +
                        artHtml +
                        '<div class="pl-card__info">' +
                            '<span class="pl-card__name">' + escapeHtml(p.name) + '</span>' +
                            (desc ? '<p class="pl-card__desc">' + escapeHtml(desc) + '</p>' : '') +
                        '</div>' +
                        '<span class="pl-card__chevron" aria-hidden="true">›</span>' +
                    '</div>' +
                '</div>' +
                '<div class="pl-card__panel" hidden>' +
                    (genreHtml ? '<div class="pl-panel__genres">' + genreHtml + '</div>' : '') +
                    (metaRows  ? '<div class="pl-panel__meta">' + metaRows + '</div>' : '') +
                    (p.url ? '<a class="pl-panel__btn" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener" tabindex="-1">Open in Spotify ↗</a>' : '') +
                '</div>' +
            '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    // Wire click handlers
    container.querySelectorAll('.pl-card').forEach(function(card) {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.pl-panel__btn')) return; // let link through
            var panel = card.querySelector('.pl-card__panel');
            var isOpen = !panel.hidden;
            // Collapse all others
            container.querySelectorAll('.pl-card--open').forEach(function(c) {
                c.classList.remove('pl-card--open');
                c.setAttribute('aria-expanded', 'false');
                c.querySelector('.pl-card__panel').hidden = true;
            });
            if (!isOpen) {
                card.classList.add('pl-card--open');
                card.setAttribute('aria-expanded', 'true');
                panel.hidden = false;
            }
        });
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
        });
    });
}

/* ── Genres / Artists Across Time ── */

function renderGenresAcrossTime(byRange, artistsByRange) {
    var container = document.getElementById('genres-time');
    var section = document.getElementById('genres-time-section');
    if (!container) return;

    var hasGenreShort  = byRange && byRange.short  && byRange.short.length  > 0;
    var hasGenreMedium = byRange && byRange.medium && byRange.medium.length > 0;
    var hasGenreLong   = byRange && byRange.long   && byRange.long.length   > 0;
    var hasGenres = hasGenreShort || hasGenreMedium || hasGenreLong;

    var hasArtistShort  = artistsByRange && artistsByRange.short  && artistsByRange.short.length  > 0;
    var hasArtistMedium = artistsByRange && artistsByRange.medium && artistsByRange.medium.length > 0;
    var hasArtistLong   = artistsByRange && artistsByRange.long   && artistsByRange.long.length   > 0;
    var hasArtists = hasArtistShort || hasArtistMedium || hasArtistLong;

    if (!hasGenres && !hasArtists) {
        if (section) section.style.display = 'none';
        return;
    }

    // Use genres if available, otherwise fall back to top artists per time range
    var usingArtistFallback = !hasGenres && hasArtists;

    // Update the section heading to reflect what's actually being shown
    var heading = section && section.querySelector('h3');
    if (heading) {
        heading.textContent = usingArtistFallback ? 'TOP ARTISTS OVER TIME' : 'GENRES ACROSS TIME';
    }

    var cols;
    if (usingArtistFallback) {
        cols = [
            { key: 'short',  title: 'Last month',      items: (artistsByRange.short  || []).map(function (a) { return { name: a.name, count: 1 }; }) },
            { key: 'medium', title: 'Last 6 months',   items: (artistsByRange.medium || []).map(function (a) { return { name: a.name, count: 1 }; }) },
            { key: 'long',   title: 'All time',         items: (artistsByRange.long   || []).map(function (a) { return { name: a.name, count: 1 }; }) },
        ];
    } else {
        cols = [
            { key: 'short',  title: 'Last month',      items: byRange.short  || [] },
            { key: 'medium', title: 'Last 6 months',   items: byRange.medium || [] },
            { key: 'long',   title: 'All time',         items: byRange.long   || [] },
        ];
    }

    var html = '<div class="genres-time-grid">';
    cols.forEach(function (c) {
        html += '<div class="genres-time-col">' +
                '<div class="genres-time-col__title">' + escapeHtml(c.title) + '</div>' +
                '<div class="genres-time-col__tags">';
        if (c.items.length === 0) {
            html += '<span class="genres-time__empty">no data</span>';
        } else {
            c.items.slice(0, 8).forEach(function (g, i) {
                var intensity = Math.max(30, 100 - i * 10);
                html += '<span class="genre-tag genre-tag--timeslot" style="--intensity:' + intensity + '%">' +
                    escapeHtml(g.name) +
                    (!usingArtistFallback && g.count > 1 ? '<span class="genre-tag__count">' + g.count + '</span>' : '') +
                    '</span>';
            });
        }
        html += '</div></div>';
    });
    html += '</div>';

    // Delta analysis (only meaningful for genres, not artists)
    if (!usingArtistFallback) {
        var emerging = [];
        var fading = [];
        var longSet = {};
        (byRange.long || []).forEach(function (g) { longSet[g.name] = true; });
        var shortSet = {};
        (byRange.short || []).forEach(function (g) { shortSet[g.name] = true; });
        (byRange.short || []).slice(0, 10).forEach(function (g) {
            if (!longSet[g.name]) emerging.push(g.name);
        });
        (byRange.long || []).slice(0, 10).forEach(function (g) {
            if (!shortSet[g.name]) fading.push(g.name);
        });

        if (emerging.length > 0 || fading.length > 0) {
            html += '<div class="genres-time-delta">';
            if (emerging.length > 0) {
                html += '<div class="genres-time-delta__row"><span class="genres-time-delta__label">↑ Emerging</span>' +
                    emerging.slice(0, 5).map(function (n) { return '<span class="genre-tag genre-tag--emerging">' + escapeHtml(n) + '</span>'; }).join('') +
                    '</div>';
            }
            if (fading.length > 0) {
                html += '<div class="genres-time-delta__row"><span class="genres-time-delta__label">↓ Fading</span>' +
                    fading.slice(0, 5).map(function (n) { return '<span class="genre-tag genre-tag--fading">' + escapeHtml(n) + '</span>'; }).join('') +
                    '</div>';
            }
            html += '</div>';
        }
    } else {
        // For artist fallback: show artists that appear in short but not long (= recently discovered)
        var newArtists = [];
        var longArtistSet = {};
        (artistsByRange.long || []).forEach(function (a) { longArtistSet[a.name] = true; });
        (artistsByRange.short || []).slice(0, 10).forEach(function (a) {
            if (!longArtistSet[a.name]) newArtists.push(a.name);
        });
        if (newArtists.length > 0) {
            html += '<div class="genres-time-delta">' +
                '<div class="genres-time-delta__row"><span class="genres-time-delta__label">✦ New this month</span>' +
                newArtists.slice(0, 5).map(function (n) { return '<span class="genre-tag genre-tag--emerging">' + escapeHtml(n) + '</span>'; }).join('') +
                '</div></div>';
        }
    }

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

/* ── Last.fm Monthly History ── */

function renderLastfmHistory(monthlyHistory) {
    if (!monthlyHistory || monthlyHistory.length === 0) return;

    var section = document.getElementById('past-months-section');
    if (section) section.style.display = '';

    var nav = document.getElementById('past-months-nav');
    if (!nav) return;

    // Show newest month first
    var months = monthlyHistory.slice().reverse();

    var html = '<div class="past-months-nav">';
    months.forEach(function (entry) {
        html += '<button class="btn-glass history-month-btn" data-month="' + escapeHtml(entry.month) + '">' + escapeHtml(entry.label) + '</button>';
    });
    html += '</div>';
    nav.innerHTML = html;

    nav.querySelectorAll('.history-month-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var month = btn.getAttribute('data-month');
            var entry = monthlyHistory.find(function (m) { return m.month === month; });
            if (entry) {
                renderHistoricalMonth(entry);
                // Render top artists for this month below the track chart
                renderLastfmMonthArtists(entry.top_artists);
            }
        });
    });

    // Auto-click the most recent month
    var first = nav.querySelector('.history-month-btn');
    if (first) first.click();

    // Feed into personality evolution chart
    renderPersonalityEvolutionFromLastfm(months);
}

function renderLastfmMonthArtists(topArtists) {
    if (!topArtists || topArtists.length === 0) return;
    var content = document.getElementById('past-months-content');
    if (!content) return;
    var existing = content.querySelector('.lfm-artists-block');
    if (existing) existing.remove();

    var html = '<div class="lfm-artists-block" style="margin-top:1rem;">' +
        '<p class="music-subtitle" style="margin-bottom:0.5rem;">Top artists that week</p>' +
        '<div class="genre-tags">';
    topArtists.slice(0, 12).forEach(function (a) {
        html += '<span class="genre-tag">' + escapeHtml(a.name) +
            (a.plays ? ' <span style="opacity:0.5;font-size:0.7em;">· ' + a.plays + '</span>' : '') +
            '</span>';
    });
    html += '</div></div>';
    content.insertAdjacentHTML('beforeend', html);
}

function renderPersonalityEvolutionFromLastfm(months) {
    var target = document.getElementById('insights-evolution');
    if (!target) return;

    var currentMetrics = null;
    if (window.__musicData && window.__musicData.personality) {
        var p = window.__musicData.personality;
        currentMetrics = { obscurity: p.obscurity, mainstream: p.mainstream, loyalty: p.loyalty, diversity: p.diversity };
    }

    var points = months.slice().reverse().map(function (m) {
        return {
            month: m.month,
            label: m.label.replace(/\s+\d{4}$/, '').slice(0, 3),
            p: {
                obscurity:   m.personality && m.personality.obscurity   != null ? m.personality.obscurity   : null,
                mainstream:  m.personality && m.personality.mainstream  != null ? m.personality.mainstream  : null,
                loyalty:     m.personality && m.personality.loyalty     != null ? m.personality.loyalty     : 50,
                diversity:   m.personality && m.personality.diversity   != null ? m.personality.diversity   : 50,
            },
        };
    });

    if (currentMetrics) {
        var nowLabel = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
        points.push({ month: 'current', label: nowLabel + ' (now)', p: currentMetrics });
    }

    if (points.length > 0) drawEvolutionChart(target, points);
}

/* ── Past Months (static file fallback) ── */

function loadPastMonths() {
    fetch('/assets/data/history/index.json')
        .then(function (res) {
            if (!res.ok) return [];
            return res.json();
        })
        .then(function (months) {
            if (!months || months.length === 0) return;

            var section = document.getElementById('past-months-section');
            if (section) section.style.display = '';

            var nav = document.getElementById('past-months-nav');
            if (!nav) return;

            var html = '<div class="past-months-nav">';
            months.forEach(function (entry) {
                var label = entry.label || formatMonthLabel(entry.month);
                html += '<button class="btn-glass history-month-btn" data-month="' + escapeHtml(entry.month) + '">' + escapeHtml(label) + '</button>';
            });
            html += '</div>';
            nav.innerHTML = html;

            nav.querySelectorAll('.history-month-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var month = btn.getAttribute('data-month');
                    fetch('/assets/data/history/' + month + '.json')
                        .then(function (res) { return res.json(); })
                        .then(function (data) { renderHistoricalMonth(data); })
                        .catch(function () {
                            var content = document.getElementById('past-months-content');
                            if (content) content.innerHTML = '<p class="music-error">Could not load data for this month.</p>';
                        });
                });
            });
        })
        .catch(function () {
            // Silently fail — section stays hidden
        });
}

function formatMonthLabel(yyyymm) {
    if (!yyyymm) return yyyymm;
    var parts = yyyymm.split('-');
    if (parts.length !== 2) return yyyymm;
    var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function renderHistoricalMonth(data) {
    var content = document.getElementById('past-months-content');
    if (!content) return;

    content.innerHTML =
        '<p class="music-subtitle">' + escapeHtml(data.label) + '</p>' +
        '<div id="history-tracks-chart"></div>';

    renderBarChart('history-tracks-chart', data.top_tracks, 'full');

    document.querySelectorAll('.history-month-btn').forEach(function (b) {
        b.classList.toggle('view-switcher-btn--active', b.getAttribute('data-month') === data.month);
    });
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
