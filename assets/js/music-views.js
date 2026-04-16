/* ── Music Views: CD Carousel, Wheel, Showcase ── */

(function () {
    'use strict';

    /* ── State ── */
    var currentView = null; // null = bar chart, 'cd', 'wheel', 'showcase'
    var topTracksData = null;
    var viewContainer = null;
    var autoScrollTimer = null;
    var cdIndex = 0;
    var wheelAngle = 0;

    /* ── Expose hook for music.js to pass data ── */
    window.MusicViews = {
        init: function (tracks) {
            topTracksData = tracks;
            setupSwitcher();
        }
    };

    /* ── View Switcher Setup ── */
    function setupSwitcher() {
        var section = document.getElementById('top-tracks');
        if (!section) return;

        var wrapper = section.closest('.music-panel') || section.closest('.music-section');
        if (!wrapper) return;

        if (wrapper.querySelector('.view-switcher-buttons')) return;

        var subtitle = wrapper.querySelector('.music-subtitle');

        var btnGroup = document.createElement('div');
        btnGroup.className = 'view-switcher-buttons';

        var views = [
            { key: 'cd',       label: 'CD View' },
            { key: 'wheel',    label: 'Wheel View' },
            { key: 'showcase', label: 'Showcase View' },
            { key: null,       label: 'Bar Chart' }
        ];

        views.forEach(function (v) {
            var btn = document.createElement('button');
            btn.className = 'btn-glass view-switcher-btn';
            btn.textContent = v.label;
            btn.setAttribute('data-view', v.key || 'bar');
            if (v.key === 'cd') btn.classList.add('view-switcher-btn--active');
            btn.addEventListener('click', function () {
                switchView(v.key);
                btnGroup.querySelectorAll('.view-switcher-btn').forEach(function (b) {
                    b.classList.remove('view-switcher-btn--active');
                });
                btn.classList.add('view-switcher-btn--active');
            });
            btnGroup.appendChild(btn);
        });

        section.after(btnGroup);

        viewContainer = document.createElement('div');
        viewContainer.id = 'top-tracks-alt-view';
        viewContainer.style.display = 'none';
        btnGroup.after(viewContainer);

        // Default to CD view — hide bar chart, show carousel
        switchView('cd');
    }

    function switchView(viewKey) {
        var barChart = document.getElementById('top-tracks');
        stopAutoScroll();

        var outEl = currentView === null ? barChart : viewContainer;
        outEl.style.transition = 'opacity 200ms ease';
        outEl.style.opacity = '0';

        setTimeout(function () {
            if (currentView === null) barChart.style.display = 'none';
            viewContainer.innerHTML = '';
            viewContainer.style.display = 'none';

            currentView = viewKey;

            if (viewKey === null) {
                barChart.style.display = '';
                barChart.style.opacity = '0';
                requestAnimationFrame(function () {
                    barChart.style.transition = 'opacity 200ms ease';
                    barChart.style.opacity = '1';
                });
            } else {
                viewContainer.style.display = '';
                viewContainer.style.opacity = '0';
                if (viewKey === 'cd')       renderCDCarousel();
                else if (viewKey === 'wheel')    renderWheel();
                else if (viewKey === 'showcase') renderShowcase();
                requestAnimationFrame(function () {
                    viewContainer.style.transition = 'opacity 200ms ease';
                    viewContainer.style.opacity = '1';
                });
            }
        }, 200);
    }

    /* ── Play count helpers ── */
    function maxPlays() {
        var m = 0;
        (topTracksData || []).forEach(function (t) {
            var p = t.est_plays || t.recent_plays || 0;
            if (p > m) m = p;
        });
        return m || 1;
    }

    function trackPlays(t) {
        return t.est_plays || t.recent_plays || 0;
    }

    /* ════════════════════════════════════════
       CD CAROUSEL VIEW  — arc ring in details
       ════════════════════════════════════════ */

    function renderCDCarousel() {
        if (!topTracksData || topTracksData.length === 0) return;
        cdIndex = 0;

        var html =
            '<div class="cd-carousel" tabindex="0">' +
                '<button class="cd-carousel__arrow cd-carousel__arrow--left" aria-label="Previous">&lsaquo;</button>' +
                '<div class="cd-carousel__track">';

        for (var i = 0; i < topTracksData.length; i++) {
            var t = topTracksData[i];
            var art = t.album_art || '';
            html +=
                '<div class="cd-carousel__item" data-index="' + i + '">' +
                    '<div class="cd-disc">' +
                        '<div class="cd-disc__art" style="background-image:url(' + escapeAttr(art) + ')"></div>' +
                        '<div class="cd-disc__hole"></div>' +
                        '<div class="cd-disc__shine"></div>' +
                    '</div>' +
                '</div>';
        }

        html +=
                '</div>' +
                '<button class="cd-carousel__arrow cd-carousel__arrow--right" aria-label="Next">&rsaquo;</button>' +
            '</div>' +
            '<div class="cd-carousel__details"></div>';

        viewContainer.innerHTML = html;

        var carousel = viewContainer.querySelector('.cd-carousel');
        var leftBtn  = viewContainer.querySelector('.cd-carousel__arrow--left');
        var rightBtn = viewContainer.querySelector('.cd-carousel__arrow--right');

        leftBtn.addEventListener('click',  function () { cdNavigate(-1); });
        rightBtn.addEventListener('click', function () { cdNavigate(1); });

        carousel.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft')  { cdNavigate(-1); e.preventDefault(); }
            if (e.key === 'ArrowRight') { cdNavigate(1);  e.preventDefault(); }
        });

        var items = viewContainer.querySelectorAll('.cd-carousel__item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function () {
                cdIndex = parseInt(this.getAttribute('data-index'), 10);
                updateCDPositions();
            });
        }

        var touchStartX = 0;
        carousel.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; stopAutoScroll(); }, { passive: true });
        carousel.addEventListener('touchend',   function (e) {
            var diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 40) cdNavigate(diff > 0 ? -1 : 1);
            startAutoScroll();
        }, { passive: true });

        carousel.addEventListener('mouseenter', function () { stopAutoScroll(); });
        carousel.addEventListener('mouseleave', function () { startAutoScroll(); });

        updateCDPositions();
        startAutoScroll();
    }

    function cdNavigate(dir) {
        if (!topTracksData) return;
        cdIndex = (cdIndex + dir + topTracksData.length) % topTracksData.length;
        updateCDPositions();
    }

    function updateCDPositions() {
        var items = viewContainer.querySelectorAll('.cd-carousel__item');
        var total = topTracksData.length;

        for (var i = 0; i < items.length; i++) {
            var offset = i - cdIndex;
            if (offset >  total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            var absOff    = Math.abs(offset);
            var rotateY   = offset * 45;
            var translateX = offset * 140;
            var translateZ = -absOff * 120;
            var scale     = Math.max(0.5, 1 - absOff * 0.2);
            var opacity   = Math.max(0, 1 - absOff * 0.3);

            if (absOff > 3) {
                items[i].style.display = 'none';
            } else {
                items[i].style.display = '';
                items[i].style.transform =
                    'translateX(' + translateX + 'px) translateZ(' + translateZ + 'px) rotateY(' + rotateY + 'deg) scale(' + scale + ')';
                items[i].style.opacity = opacity;
                items[i].style.zIndex  = 100 - absOff;
            }

            if (offset === 0) items[i].classList.add('cd-carousel__item--active');
            else              items[i].classList.remove('cd-carousel__item--active');
        }

        /* Detail panel with SVG arc play count */
        var t       = topTracksData[cdIndex];
        var details = viewContainer.querySelector('.cd-carousel__details');
        if (!details || !t) return;

        var plays   = trackPlays(t);
        var ratio   = plays / maxPlays();
        var r       = 36;
        var circ    = Math.round(2 * Math.PI * r); // 226
        var offset2 = Math.round(circ * (1 - ratio));
        var arcColor = plays > 0 ? 'var(--accent)' : 'transparent';

        var arcHtml = plays > 0
            ? '<div class="cd-plays-ring">' +
                '<svg viewBox="0 0 80 80" class="cd-plays-ring__svg" aria-hidden="true">' +
                    '<circle cx="40" cy="40" r="' + r + '" stroke="rgba(128,0,32,0.12)" stroke-width="4" fill="none"/>' +
                    '<circle cx="40" cy="40" r="' + r + '" stroke="' + arcColor + '" stroke-width="4" fill="none"' +
                        ' stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset2 + '"' +
                        ' stroke-linecap="round" transform="rotate(-90 40 40)"/>' +
                '</svg>' +
                '<div class="cd-plays-ring__text">' +
                    '<span class="cd-plays-ring__num">' + plays + '</span>' +
                    '<span class="cd-plays-ring__label">plays</span>' +
                '</div>' +
              '</div>'
            : '';

        details.innerHTML =
            '<div class="cd-detail">' +
                '<span class="cd-detail__rank">#' + t.rank + '</span>' +
                '<span class="cd-detail__name">'   + escapeHtml(t.name)   + '</span>' +
                '<span class="cd-detail__artist">' + escapeHtml(t.artist) + '</span>' +
                (t.album ? '<span class="cd-detail__album">' + escapeHtml(t.album) + '</span>' : '') +
                arcHtml +
            '</div>';
    }

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollTimer = setInterval(function () { cdNavigate(1); }, 5000);
    }

    function stopAutoScroll() {
        if (autoScrollTimer) { clearInterval(autoScrollTimer); autoScrollTimer = null; }
    }

    /* ════════════════════════════════════════
       WHEEL VIEW — dot-intensity level meters
       ════════════════════════════════════════ */

    function renderWheel() {
        if (!topTracksData || topTracksData.length === 0) return;
        wheelAngle = 0;
        var count     = topTracksData.length;
        var angleStep = 360 / count;
        var radius    = 200;
        var mx        = maxPlays();

        var html = '<div class="wheel-view"><div class="wheel-view__stage"><div class="wheel-view__ring">';

        for (var i = 0; i < count; i++) {
            var t     = topTracksData[i];
            var art   = t.album_art || '';
            var angle = i * angleStep;
            var plays = trackPlays(t);
            var dots  = 5;
            var filled = Math.round((plays / mx) * dots);

            var meterHtml = '<div class="wheel-plays-meter" title="~' + plays + ' plays">';
            for (var d = 0; d < dots; d++) {
                meterHtml += '<span class="wheel-plays-dot' + (d < filled ? ' wheel-plays-dot--on' : '') + '"></span>';
            }
            meterHtml += '</div>';

            var genresHtml = '';
            if (t.genres && t.genres.length > 0) {
                genresHtml = '<div class="wheel-view__genres">';
                for (var gi = 0; gi < t.genres.length; gi++) {
                    genresHtml += '<span class="wheel-view__genre-tag">' + escapeHtml(t.genres[gi]) + '</span>';
                }
                genresHtml += '</div>';
            }

            html +=
                '<div class="wheel-view__item" data-index="' + i + '" style="' +
                    'transform: rotateX(' + angle + 'deg) translateZ(' + radius + 'px);">' +
                    '<span class="wheel-view__rank">#' + t.rank + '</span>' +
                    '<img class="wheel-view__art" src="' + escapeAttr(art) + '" alt="" loading="lazy">' +
                    '<div class="wheel-view__label">' +
                        '<span class="wheel-view__name">'   + escapeHtml(t.name)   + '</span>' +
                        '<span class="wheel-view__artist">' + escapeHtml(t.artist) + '</span>' +
                        meterHtml +
                        genresHtml +
                    '</div>' +
                '</div>';
        }

        html += '</div></div></div>';
        viewContainer.innerHTML = html;

        var stage = viewContainer.querySelector('.wheel-view__stage');
        var ring  = viewContainer.querySelector('.wheel-view__ring');

        stage.addEventListener('wheel', function (e) {
            e.preventDefault();
            wheelAngle += e.deltaY > 0 ? angleStep : -angleStep;
            ring.style.transform = 'rotateX(' + wheelAngle + 'deg)';
        });

        var lastY = 0;
        stage.addEventListener('touchstart', function (e) { lastY = e.touches[0].clientY; }, { passive: true });
        stage.addEventListener('touchmove',  function (e) {
            var diff = e.touches[0].clientY - lastY;
            lastY = e.touches[0].clientY;
            wheelAngle -= diff * 0.5;
            ring.style.transform = 'rotateX(' + wheelAngle + 'deg)';
        }, { passive: true });
    }

    /* ════════════════════════════════════════
       SHOWCASE VIEW — translucent badge overlay
       ════════════════════════════════════════ */

    function renderShowcase() {
        if (!topTracksData || topTracksData.length === 0) return;
        var mx = maxPlays();

        var html = '<div class="showcase-view">';
        for (var i = 0; i < topTracksData.length; i++) {
            var t     = topTracksData[i];
            var art   = t.album_art || '';
            var tiltX = (i % 3 - 1) * 8;
            var tiltY = (Math.floor(i / 3) % 2 === 0 ? 1 : -1) * 5;
            var plays = trackPlays(t);
            var barW  = mx > 0 ? Math.round((plays / mx) * 100) : 0;

            var playsOverlay = plays > 0
                ? '<div class="showcase-plays-badge">' +
                    '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><polygon points="2,1 9,5 2,9" fill="currentColor"/></svg>' +
                    '<span>' + plays + '</span>' +
                  '</div>' +
                  '<div class="showcase-plays-bar"><div class="showcase-plays-bar__fill" style="width:' + barW + '%"></div></div>'
                : '';

            var scGenresHtml = '';
            if (t.genres && t.genres.length > 0) {
                scGenresHtml = '<div class="showcase-view__genres">';
                for (var sgi = 0; sgi < t.genres.length; sgi++) {
                    scGenresHtml += '<span class="showcase-view__genre-tag">' + escapeHtml(t.genres[sgi]) + '</span>';
                }
                scGenresHtml += '</div>';
            }

            html +=
                '<div class="showcase-view__card" style="--tilt-x:' + tiltX + 'deg; --tilt-y:' + tiltY + 'deg; --i:' + i + ';">' +
                    '<div class="showcase-view__art-wrap">' +
                        '<img class="showcase-view__art" src="' + escapeAttr(art) + '" alt="" loading="lazy">' +
                        playsOverlay +
                    '</div>' +
                    '<div class="showcase-view__info">' +
                        '<span class="showcase-view__rank">#'    + t.rank            + '</span>' +
                        '<span class="showcase-view__name">'     + escapeHtml(t.name)   + '</span>' +
                        '<span class="showcase-view__artist">'   + escapeHtml(t.artist) + '</span>' +
                        scGenresHtml +
                    '</div>' +
                '</div>';
        }
        html += '</div>';
        viewContainer.innerHTML = html;
    }

    /* ── Helpers ── */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttr(str) { return escapeHtml(str).replace(/'/g, '&#39;'); }

})();
