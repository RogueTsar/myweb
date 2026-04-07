/* Home page: loads last-played + top 5 tracks into sidebar and music section widgets */
(function () {
    'use strict';

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    fetch('/api/spotify')
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
            renderSidebarNowPlaying(data.last_played);
            renderHomeLastPlayed(data.last_played);
            renderHomeTopTracks(data.top_tracks);
        })
        .catch(function () {
            var el = document.getElementById('widget-now-playing');
            if (el) el.innerHTML = '<p style="font-size:0.75rem;color:var(--text-tertiary)">Not available</p>';
        });

    function renderSidebarNowPlaying(track) {
        var el = document.getElementById('widget-now-playing');
        if (!el) return;
        if (!track) {
            el.innerHTML = '<p style="font-size:0.75rem;color:var(--text-tertiary)">Nothing playing</p>';
            return;
        }
        el.innerHTML =
            '<div class="widget-music-row">' +
                (track.album_art
                    ? '<img class="widget-music-art" src="' + esc(track.album_art) + '" alt="">'
                    : '<div class="widget-music-art widget-music-art--placeholder"></div>') +
                '<div class="widget-music-info">' +
                    '<div class="widget-music-track">' + esc(track.track) + '</div>' +
                    '<div class="widget-music-artist">' + esc(track.artist) + '</div>' +
                '</div>' +
            '</div>';
    }

    function renderHomeLastPlayed(track) {
        var el = document.getElementById('home-last-played');
        if (!el) return;
        if (!track) {
            el.innerHTML = '<p style="font-size:0.8rem;color:var(--text-tertiary)">Nothing playing</p>';
            return;
        }
        var statusText = track.is_playing ? 'Now Playing' : 'Last Played';
        var statusClass = track.is_playing ? 'last-played-card__status--playing' : 'last-played-card__status--paused';
        el.innerHTML =
            '<div class="last-played-card">' +
                (track.album_art ? '<img class="last-played-card__art" src="' + esc(track.album_art) + '" alt="">' : '') +
                '<div class="last-played-card__info">' +
                    '<div class="last-played-card__track">' + esc(track.track) + '</div>' +
                    '<div class="last-played-card__artist">' + esc(track.artist) + '</div>' +
                    '<div class="last-played-card__album">' + esc(track.album) + '</div>' +
                    '<span class="last-played-card__status ' + statusClass + '">' + statusText + '</span>' +
                '</div>' +
            '</div>';
    }

    function renderHomeTopTracks(tracks) {
        var el = document.getElementById('home-top-tracks');
        if (!el || !tracks || !tracks.length) return;
        var top5 = tracks.slice(0, 5);
        var html = '<ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5rem;">';
        top5.forEach(function (t) {
            html +=
                '<li style="display:flex;align-items:center;gap:0.6rem;">' +
                    (t.album_art ? '<img src="' + esc(t.album_art) + '" alt="" style="width:32px;height:32px;border-radius:4px;object-fit:cover;flex-shrink:0;">' : '') +
                    '<div style="min-width:0;">' +
                        '<div style="font-size:0.8rem;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(t.name) + '</div>' +
                        '<div style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(t.artist) + '</div>' +
                    '</div>' +
                    '<span style="margin-left:auto;font-size:0.65rem;color:var(--text-tertiary);flex-shrink:0;">#' + t.rank + '</span>' +
                '</li>';
        });
        html += '</ol>';
        el.innerHTML = html;
    }
})();
