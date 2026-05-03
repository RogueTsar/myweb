/* ── Holographic Cards: dynamic from JSON, any count, light/dark quotes ── */
(function () {
    var showcase = document.getElementById('card-showcase');
    if (!showcase) return;

    var cardData = null;
    var carouselActiveIndex = 1; // persists across theme rebuilds

    fetch('/assets/data/card-quotes.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            cardData = data;
            buildCards();
        })
        .catch(function () {});

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildCards() {
        if (!cardData || !cardData.cards) return;
        var dark = isDark();

        // Clean up any existing carousel nav before rebuilding
        var oldNav = showcase.parentNode.querySelector('.card-carousel-nav');
        if (oldNav) oldNav.parentNode.removeChild(oldNav);
        showcase.classList.remove('carousel-ready');

        var html = '';
        cardData.cards.forEach(function (c) {
            var imgSrc = dark ? c.darkImage : c.lightImage;
            var mode = dark ? c.dark : c.light;
            var quote = (mode && mode.quote) || '';
            var author = (mode && mode.author) || '';

            html +=
                '<div class="holo-card" data-card="' + esc(c.id) + '">' +
                    '<div class="holo-card__inner">' +
                        '<div class="holo-card__front">' +
                            '<img src="' + esc(imgSrc) + '" alt="' + esc(c.id) + '" draggable="false" ' +
                                'data-light-src="' + esc(c.lightImage) + '" data-dark-src="' + esc(c.darkImage) + '">' +
                            '<div class="holo-card__shine"></div>' +
                            '<div class="holo-card__glare"></div>' +
                        '</div>' +
                        '<div class="holo-card__back">' +
                            '<p class="holo-card__quote">' + esc(quote) + '</p>' +
                            '<p class="holo-card__author">' + esc(author) + '</p>' +
                            '<button class="holo-card__read-more">▾ source</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        showcase.innerHTML = html;

        // Float middle card(s) on desktop only
        var cards = showcase.querySelectorAll('.holo-card');
        if (window.innerWidth > 600) {
            if (cards.length >= 4) {
                cards[1].classList.add('holo-card--float');
                cards[2].classList.add('holo-card--float');
            } else if (cards.length >= 3) {
                cards[1].classList.add('holo-card--float');
            }
        }

        initCardInteractions();
        initCarousel();
    }

    // Re-build cards when theme changes (swaps quotes + images)
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.attributeName === 'data-theme' && cardData) {
                buildCards();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    function initCardInteractions() {
        var cards = showcase.querySelectorAll('.holo-card');

        cards.forEach(function (card) {
            var inner = card.querySelector('.holo-card__inner');
            var shine = card.querySelector('.holo-card__shine');
            var glare = card.querySelector('.holo-card__glare');
            var isFlipped = false;
            var tiltX = 0, tiltY = 0;

            function updateTransform() {
                var baseY = isFlipped ? 180 : 0;
                inner.style.transform = 'rotateX(' + tiltX + 'deg) rotateY(' + (baseY + tiltY) + 'deg)';
            }

            var readMoreBtn = card.querySelector('.holo-card__read-more');
            var authorEl = card.querySelector('.holo-card__author');
            if (readMoreBtn && authorEl) {
                readMoreBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var visible = authorEl.classList.toggle('holo-card__author--visible');
                    readMoreBtn.textContent = visible ? '▴ hide' : '▾ source';
                });
            }

            card.addEventListener('click', function () {
                // In carousel mode, only the active card flips
                if (showcase.classList.contains('carousel-ready') && !card.classList.contains('is-active')) return;
                isFlipped = !isFlipped;
                if (card.classList.contains('holo-card--float')) {
                    card.classList.remove('holo-card--float');
                    setTimeout(function () { if (!isFlipped) card.classList.add('holo-card--float'); }, 600);
                }
                inner.style.transition = 'transform 0.5s ease, box-shadow 0.35s ease';
                tiltX = 0; tiltY = 0;
                updateTransform();
                setTimeout(function () { inner.style.transition = 'transform 0.15s ease, box-shadow 0.35s ease'; }, 500);
            });

            card.addEventListener('mousemove', function (e) {
                var r = card.getBoundingClientRect();
                var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
                var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
                tiltX = -ny * 20; tiltY = nx * 20;
                updateTransform();
                var sx = ((e.clientX - r.left) / r.width * 100);
                var sy = ((e.clientY - r.top) / r.height * 100);
                shine.style.backgroundPosition = sx + '% ' + sy + '%';
                glare.style.background = 'radial-gradient(circle at ' + sx + '% ' + sy + '%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)';
            });

            card.addEventListener('mouseleave', function () {
                tiltX = 0; tiltY = 0; updateTransform();
                shine.style.backgroundPosition = '50% 50%';
                glare.style.background = '';
            });

            card.addEventListener('touchmove', function (e) {
                e.preventDefault();
                var r = card.getBoundingClientRect();
                var nx = ((e.touches[0].clientX - r.left) / r.width - 0.5) * 2;
                var ny = ((e.touches[0].clientY - r.top) / r.height - 0.5) * 2;
                tiltX = -ny * 15; tiltY = nx * 15;
                updateTransform();
                var sx = ((e.touches[0].clientX - r.left) / r.width * 100);
                var sy = ((e.touches[0].clientY - r.top) / r.height * 100);
                shine.style.backgroundPosition = sx + '% ' + sy + '%';
                glare.style.background = 'radial-gradient(circle at ' + sx + '% ' + sy + '%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)';
            }, { passive: false });

            card.addEventListener('touchend', function () {
                tiltX = 0; tiltY = 0; updateTransform();
                shine.style.backgroundPosition = '50% 50%';
                glare.style.background = '';
            });
        });
    }

    function initCarousel() {
        if (window.innerWidth > 600) return;

        var cards = showcase.querySelectorAll('.holo-card');
        var n = cards.length;
        if (n < 2) return;

        // Clamp persisted index in case card count changed
        if (carouselActiveIndex >= n) carouselActiveIndex = 0;

        showcase.classList.add('carousel-ready');

        function applyCarousel() {
            cards.forEach(function (card, i) {
                card.classList.remove('is-active', 'is-prev', 'is-next');
                var offset = (i - carouselActiveIndex + n) % n;
                if (offset === 0)       card.classList.add('is-active');
                else if (offset === 1)  card.classList.add('is-next');
                else                    card.classList.add('is-prev');
            });
        }
        applyCarousel();

        // Arrow buttons
        var nav = document.createElement('div');
        nav.className = 'card-carousel-nav';
        nav.innerHTML =
            '<button class="card-carousel-btn" aria-label="Previous card">&#8249;</button>' +
            '<button class="card-carousel-btn" aria-label="Next card">&#8250;</button>';
        showcase.parentNode.insertBefore(nav, showcase.nextSibling);

        var btns = nav.querySelectorAll('.card-carousel-btn');
        btns[0].addEventListener('click', function () {
            carouselActiveIndex = (carouselActiveIndex - 1 + n) % n;
            applyCarousel();
        });
        btns[1].addEventListener('click', function () {
            carouselActiveIndex = (carouselActiveIndex + 1) % n;
            applyCarousel();
        });

        // Swipe support
        var swipeStartX = 0;
        showcase.addEventListener('touchstart', function (e) {
            swipeStartX = e.touches[0].clientX;
        }, { passive: true });
        showcase.addEventListener('touchend', function (e) {
            var dx = e.changedTouches[0].clientX - swipeStartX;
            if (Math.abs(dx) > 55) {
                carouselActiveIndex = dx < 0
                    ? (carouselActiveIndex + 1) % n
                    : (carouselActiveIndex - 1 + n) % n;
                applyCarousel();
            }
        }, { passive: true });
    }
})();
