/* ── Holographic Cards: dynamic from JSON, any count, light/dark quotes ── */
(function () {
    var showcase = document.getElementById('card-showcase');
    if (!showcase) return;

    var cardData = null;

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
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        showcase.innerHTML = html;

        // Float middle cards
        var cards = showcase.querySelectorAll('.holo-card');
        if (cards.length >= 4) {
            cards[1].classList.add('holo-card--float');
            cards[2].classList.add('holo-card--float');
        } else if (cards.length >= 3) {
            cards[1].classList.add('holo-card--float');
        }

        // Init interactions
        initCardInteractions();
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

            card.addEventListener('click', function () {
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
})();
