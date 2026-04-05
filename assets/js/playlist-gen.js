/* ── Get to Know My Vibe ── */

(function () {
    'use strict';

    var playlistData = null;
    var activeVibe = null;

    document.addEventListener('DOMContentLoaded', function () {
        var container = document.getElementById('vibe-playlists');
        if (!container) return;

        fetch('/assets/data/playlists.json')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                playlistData = data;
                renderVibeButtons(container, data);
            })
            .catch(function () {
                container.innerHTML = '<p class="music-error">Could not load vibe playlists.</p>';
            });
    });

    function renderVibeButtons(container, playlists) {
        var html = '<div class="vibe-mood-buttons">';
        for (var i = 0; i < playlists.length; i++) {
            var p = playlists[i];
            html += '<button class="btn-glass vibe-mood-btn" data-vibe-id="' + escapeHtml(p.id) + '">' +
                escapeHtml(p.name) + '</button>';
        }
        html += '</div>';
        html += '<div class="vibe-playlist-card" id="vibe-playlist-card"></div>';
        container.innerHTML = html;

        var buttons = container.querySelectorAll('.vibe-mood-btn');
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].addEventListener('click', function () {
                var id = this.getAttribute('data-vibe-id');
                toggleVibe(id, container);

                // Update active state
                var all = container.querySelectorAll('.vibe-mood-btn');
                for (var k = 0; k < all.length; k++) {
                    all[k].classList.remove('vibe-mood-btn--active');
                }
                if (activeVibe === id) {
                    this.classList.add('vibe-mood-btn--active');
                }
            });
        }
    }

    function toggleVibe(id, container) {
        var card = document.getElementById('vibe-playlist-card');
        if (!card) return;

        // Toggle off if same
        if (activeVibe === id) {
            activeVibe = null;
            card.style.transition = 'opacity 200ms ease';
            card.style.opacity = '0';
            setTimeout(function () { card.innerHTML = ''; card.style.display = 'none'; }, 200);
            return;
        }

        activeVibe = id;
        var playlist = null;
        for (var i = 0; i < playlistData.length; i++) {
            if (playlistData[i].id === id) { playlist = playlistData[i]; break; }
        }
        if (!playlist) return;

        // Fade out then in
        card.style.transition = 'opacity 200ms ease';
        card.style.opacity = '0';

        setTimeout(function () {
            var html =
                '<div class="vibe-card-inner">' +
                    '<h4 class="vibe-card__title">' + escapeHtml(playlist.name) + '</h4>' +
                    (playlist.description ? '<p class="vibe-card__desc">' + escapeHtml(playlist.description) + '</p>' : '') +
                    '<ul class="vibe-card__tracks">';
            for (var t = 0; t < playlist.tracks.length; t++) {
                var track = playlist.tracks[t];
                html +=
                    '<li class="vibe-card__track">' +
                        '<span class="vibe-card__track-name">' + escapeHtml(track.name) + '</span>' +
                        '<span class="vibe-card__track-artist">' + escapeHtml(track.artist) + '</span>' +
                        (track.genre ? '<span class="vibe-card__track-genre">' + escapeHtml(track.genre) + '</span>' : '') +
                    '</li>';
            }
            html += '</ul></div>';
            card.innerHTML = html;
            card.style.display = '';
            requestAnimationFrame(function () {
                card.style.opacity = '1';
            });
        }, 200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

})();
