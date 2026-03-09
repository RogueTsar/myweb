document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/spotify')
        .then(function (res) {
            if (!res.ok) throw new Error('API returned ' + res.status);
            return res.json();
        })
        .then(function (data) {
            renderLastPlayed(data.last_played);
            renderBarChart('top-artists', data.top_artists, 'name');
            renderBarChart('top-tracks', data.top_tracks, 'full');
        })
        .catch(function () {
            showError('last-played');
            showError('top-artists');
            showError('top-tracks');
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

function renderBarChart(containerId, items, mode) {
    var container = document.getElementById(containerId);
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="music-error">No data available.</p>';
        return;
    }

    var maxPop = 0;
    for (var i = 0; i < items.length; i++) {
        if (items[i].popularity > maxPop) maxPop = items[i].popularity;
    }
    if (maxPop === 0) maxPop = 1;

    var html = '<div class="bar-chart">';
    for (var j = 0; j < items.length; j++) {
        var item = items[j];
        var label = mode === 'full'
            ? item.name + ' \u2014 ' + item.artist
            : item.name;
        var pct = (item.popularity / maxPop) * 100;

        html +=
            '<div class="bar-chart-row">' +
                '<span class="bar-chart-row__rank">' + (j + 1) + '</span>' +
                '<span class="bar-chart-row__label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
                '<div class="bar-chart-row__bar-container">' +
                    '<div class="bar-chart-row__bar" data-width="' + pct.toFixed(1) + '%"></div>' +
                '</div>' +
                '<span class="bar-chart-row__value">' + item.popularity + '</span>' +
            '</div>';
    }
    html += '</div>';

    container.innerHTML = html;

    // Animate bars in after a brief delay
    requestAnimationFrame(function () {
        var bars = container.querySelectorAll('.bar-chart-row__bar');
        for (var k = 0; k < bars.length; k++) {
            bars[k].style.width = bars[k].getAttribute('data-width');
        }
    });
}

function showError(containerId) {
    var container = document.getElementById(containerId);
    container.innerHTML =
        '<p class="music-error">Could not load Spotify data. ' +
        '<a href="https://open.spotify.com/" target="_blank" rel="noopener">Visit Spotify</a></p>';
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
