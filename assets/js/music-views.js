/* ── Music Views: CD Carousel, Wheel, Showcase ── */

(function () {
    'use strict';

    /* ── State ── */
    var currentView = null; // null = bar chart (default), 'cd', 'wheel', 'showcase'
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

        // Find the music-section wrapper
        var wrapper = section.closest('.music-section');
        if (!wrapper) return;

        // Create the switcher prompt (insert after subtitle)
        var subtitle = wrapper.querySelector('.music-subtitle');
        var prompt = document.createElement('button');
        prompt.className = 'btn-glass view-switcher-prompt';
        prompt.textContent = 'more views :)';

        var btnGroup = document.createElement('div');
        btnGroup.className = 'view-switcher-buttons';
        btnGroup.style.display = 'none';

        var views = [
            { key: 'cd', label: 'CD View' },
            { key: 'wheel', label: 'Wheel View' },
            { key: 'showcase', label: 'Showcase View' },
            { key: null, label: 'Bar Chart' }
        ];

        views.forEach(function (v) {
            var btn = document.createElement('button');
            btn.className = 'btn-glass view-switcher-btn';
            btn.textContent = v.label;
            btn.setAttribute('data-view', v.key || 'bar');
            if (v.key === null) btn.classList.add('view-switcher-btn--active');
            btn.addEventListener('click', function () {
                switchView(v.key);
                var allBtns = btnGroup.querySelectorAll('.view-switcher-btn');
                for (var i = 0; i < allBtns.length; i++) {
                    allBtns[i].classList.remove('view-switcher-btn--active');
                }
                btn.classList.add('view-switcher-btn--active');
            });
            btnGroup.appendChild(btn);
        });

        prompt.addEventListener('click', function () {
            if (btnGroup.style.display === 'none') {
                btnGroup.style.display = '';
                prompt.style.display = 'none';
            }
        });

        // Insert AFTER the tracks container (prompt first, then buttons)
        section.after(prompt);
        prompt.after(btnGroup);

        // Create alternate view container (after buttons)
        viewContainer = document.createElement('div');
        viewContainer.id = 'top-tracks-alt-view';
        viewContainer.style.display = 'none';
        btnGroup.after(viewContainer);
    }

    function switchView(viewKey) {
        var barChart = document.getElementById('top-tracks');
        stopAutoScroll();

        // Fade out
        var outEl = currentView === null ? barChart : viewContainer;
        outEl.style.transition = 'opacity 200ms ease';
        outEl.style.opacity = '0';

        setTimeout(function () {
            // Hide old
            if (currentView === null) {
                barChart.style.display = 'none';
            }
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
                if (viewKey === 'cd') renderCDCarousel();
                else if (viewKey === 'wheel') renderWheel();
                else if (viewKey === 'showcase') renderShowcase();
                requestAnimationFrame(function () {
                    viewContainer.style.transition = 'opacity 200ms ease';
                    viewContainer.style.opacity = '1';
                });
            }
        }, 200);
    }

    /* ════════════════════════════════════════
       CD CAROUSEL VIEW
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
        var leftBtn = viewContainer.querySelector('.cd-carousel__arrow--left');
        var rightBtn = viewContainer.querySelector('.cd-carousel__arrow--right');

        leftBtn.addEventListener('click', function () { cdNavigate(-1); });
        rightBtn.addEventListener('click', function () { cdNavigate(1); });

        // Keyboard
        carousel.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { cdNavigate(-1); e.preventDefault(); }
            if (e.key === 'ArrowRight') { cdNavigate(1); e.preventDefault(); }
        });

        // Click on item
        var items = viewContainer.querySelectorAll('.cd-carousel__item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'), 10);
                cdIndex = idx;
                updateCDPositions();
            });
        }

        // Touch/swipe
        var touchStartX = 0;
        carousel.addEventListener('touchstart', function (e) {
            touchStartX = e.touches[0].clientX;
            stopAutoScroll();
        }, { passive: true });
        carousel.addEventListener('touchend', function (e) {
            var diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 40) {
                cdNavigate(diff > 0 ? -1 : 1);
            }
            startAutoScroll();
        }, { passive: true });

        // Hover pause
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
            // Wrap for infinite feel
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            var absOff = Math.abs(offset);
            var rotateY = offset * 45;
            var translateX = offset * 140;
            var translateZ = -absOff * 120;
            var scale = Math.max(0.5, 1 - absOff * 0.2);
            var opacity = Math.max(0, 1 - absOff * 0.3);

            if (absOff > 3) {
                items[i].style.display = 'none';
            } else {
                items[i].style.display = '';
                items[i].style.transform =
                    'translateX(' + translateX + 'px) translateZ(' + translateZ + 'px) rotateY(' + rotateY + 'deg) scale(' + scale + ')';
                items[i].style.opacity = opacity;
                items[i].style.zIndex = 100 - absOff;
            }

            if (offset === 0) {
                items[i].classList.add('cd-carousel__item--active');
            } else {
                items[i].classList.remove('cd-carousel__item--active');
            }
        }

        // Update details
        var t = topTracksData[cdIndex];
        var details = viewContainer.querySelector('.cd-carousel__details');
        if (details && t) {
            details.innerHTML =
                '<div class="cd-detail">' +
                    '<span class="cd-detail__rank">#' + t.rank + '</span>' +
                    '<span class="cd-detail__name">' + escapeHtml(t.name) + '</span>' +
                    '<span class="cd-detail__artist">' + escapeHtml(t.artist) + '</span>' +
                    (t.album ? '<span class="cd-detail__album">' + escapeHtml(t.album) + '</span>' : '') +
                '</div>';
        }
    }

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollTimer = setInterval(function () { cdNavigate(1); }, 5000);
    }

    function stopAutoScroll() {
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }

    /* ════════════════════════════════════════
       WHEEL VIEW (3D vertical wheel)
       ════════════════════════════════════════ */

    function renderWheel() {
        if (!topTracksData || topTracksData.length === 0) return;
        wheelAngle = 0;
        var count = topTracksData.length;
        var angleStep = 360 / count;
        var radius = 200;

        var html = '<div class="wheel-view">' +
            '<div class="wheel-view__stage">' +
            '<div class="wheel-view__ring">';

        for (var i = 0; i < count; i++) {
            var t = topTracksData[i];
            var art = t.album_art || '';
            var angle = i * angleStep;
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
                        '<span class="wheel-view__name">' + escapeHtml(t.name) + '</span>' +
                        '<span class="wheel-view__artist">' + escapeHtml(t.artist) + '</span>' +
                        genresHtml +
                    '</div>' +
                '</div>';
        }

        html += '</div></div></div>';
        viewContainer.innerHTML = html;

        var stage = viewContainer.querySelector('.wheel-view__stage');
        var ring = viewContainer.querySelector('.wheel-view__ring');

        // Scroll to rotate
        stage.addEventListener('wheel', function (e) {
            e.preventDefault();
            wheelAngle += e.deltaY > 0 ? angleStep : -angleStep;
            ring.style.transform = 'rotateX(' + wheelAngle + 'deg)';
        });

        // Touch drag
        var lastY = 0;
        stage.addEventListener('touchstart', function (e) {
            lastY = e.touches[0].clientY;
        }, { passive: true });
        stage.addEventListener('touchmove', function (e) {
            var diff = e.touches[0].clientY - lastY;
            lastY = e.touches[0].clientY;
            wheelAngle -= diff * 0.5;
            ring.style.transform = 'rotateX(' + wheelAngle + 'deg)';
        }, { passive: true });
    }

    /* ════════════════════════════════════════
       SHOWCASE VIEW (3D perspective grid)
       ════════════════════════════════════════ */

    function renderShowcase() {
        if (!topTracksData || topTracksData.length === 0) return;

        var html = '<div class="showcase-view">';
        for (var i = 0; i < topTracksData.length; i++) {
            var t = topTracksData[i];
            var art = t.album_art || '';
            // Alternating perspective tilt
            var tiltX = (i % 3 - 1) * 8;
            var tiltY = (Math.floor(i / 3) % 2 === 0 ? 1 : -1) * 5;
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
                    '<img class="showcase-view__art" src="' + escapeAttr(art) + '" alt="" loading="lazy">' +
                    '<div class="showcase-view__info">' +
                        '<span class="showcase-view__rank">#' + t.rank + '</span>' +
                        '<span class="showcase-view__name">' + escapeHtml(t.name) + '</span>' +
                        '<span class="showcase-view__artist">' + escapeHtml(t.artist) + '</span>' +
                        scGenresHtml +
                    '</div>' +
                '</div>';
        }
        html += '</div>';
        viewContainer.innerHTML = html;
    }

    /* ── Helpers (same as music.js) ── */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        return escapeHtml(str).replace(/'/g, '&#39;');
    }

})();
