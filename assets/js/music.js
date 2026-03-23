document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/spotify')
        .then(function (res) {
            if (!res.ok) throw new Error('API returned ' + res.status);
            return res.json();
        })
        .then(function (data) {
            renderLastPlayed(data.last_played);
            renderRecentHistory(data.recent_tracks);
            renderBarChart('top-artists', data.top_artists, 'name');
            renderBarChart('top-tracks', data.top_tracks, 'full');
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
        var label = mode === 'full'
            ? item.name + ' \u2014 ' + item.artist
            : item.name;

        var pct = Math.round(100 - ((item.rank - 1) / total) * 72);

        var tooltipText;
        if (item.genres && item.genres.length > 0) {
            tooltipText = item.genres.join(' \u00b7 ');
        } else if (item.album) {
            tooltipText = item.album;
        } else {
            tooltipText = '#' + item.rank;
        }
        var tooltip = escapeHtml(tooltipText);

        html +=
            '<div class="bar-chart-row">' +
                '<span class="bar-chart-row__rank">' + item.rank + '</span>' +
                '<span class="bar-chart-row__label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
                '<div class="bar-chart-row__bar-container">' +
                    '<div class="bar-chart-row__bar" data-width="' + pct + '%"></div>' +
                '</div>' +
                '<span class="bar-chart-row__tooltip">' + tooltip + '</span>' +
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

function renderPlaylists(playlists) {
    var container = document.getElementById('playlists');
    var section = document.getElementById('playlists-section');
    if (!playlists || playlists.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    var html = '<div class="playlist-grid">';
    for (var i = 0; i < playlists.length; i++) {
        var p = playlists[i];
        var imgHtml = p.image
            ? '<img class="playlist-card__img" src="' + escapeHtml(p.image) + '" alt="">'
            : '<div class="playlist-card__img playlist-card__img--placeholder"></div>';
        html +=
            '<a class="playlist-card" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener">' +
                imgHtml +
                '<div class="playlist-card__name">' + escapeHtml(p.name) + '</div>' +
                '<div class="playlist-card__count">' + p.track_count + ' tracks</div>' +
            '</a>';
    }
    html += '</div>';
    container.innerHTML = html;
}

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
