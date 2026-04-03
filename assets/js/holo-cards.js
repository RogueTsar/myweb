(function () {
    const cards = document.querySelectorAll('.holo-card');
    if (!cards.length) return;

    // Give center cards a subtle float animation
    if (cards.length >= 4) {
        cards[1].classList.add('holo-card--float');
        cards[2].classList.add('holo-card--float');
    } else if (cards.length >= 3) {
        cards[1].classList.add('holo-card--float');
    }

    /* ── Load quotes from JSON and populate based on theme ── */
    var quotesData = null;

    fetch('/assets/data/card-quotes.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            quotesData = data;
            applyQuotes();
        })
        .catch(function () {});

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function applyQuotes() {
        if (!quotesData) return;
        var mode = isDark() ? 'dark' : 'light';
        var modeData = quotesData[mode] || quotesData;

        cards.forEach(function (card) {
            var cardName = card.getAttribute('data-card');
            var entry = modeData[cardName];
            if (!entry) return;
            var quoteEl = card.querySelector('.holo-card__quote');
            var authorEl = card.querySelector('.holo-card__author');
            if (quoteEl) quoteEl.textContent = entry.quote;
            if (authorEl) authorEl.textContent = '— ' + entry.author;
        });
    }

    // Re-apply quotes when theme changes
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.attributeName === 'data-theme') {
                applyQuotes();
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    /* ── Card interactions ── */
    cards.forEach(function (card) {
        const inner = card.querySelector('.holo-card__inner');
        const shine = card.querySelector('.holo-card__shine');
        const glare = card.querySelector('.holo-card__glare');
        let isFlipped = false;
        let currentTiltX = 0;
        let currentTiltY = 0;

        function updateTransform() {
            var baseY = isFlipped ? 180 : 0;
            inner.style.transform =
                'rotateX(' + currentTiltX + 'deg) rotateY(' + (baseY + currentTiltY) + 'deg)';
        }

        // Click to flip
        card.addEventListener('click', function () {
            isFlipped = !isFlipped;
            if (card.classList.contains('holo-card--float')) {
                card.classList.remove('holo-card--float');
                setTimeout(function () {
                    if (!isFlipped) card.classList.add('holo-card--float');
                }, 600);
            }
            inner.style.transition = 'transform 0.5s ease, box-shadow 0.35s ease';
            currentTiltX = 0;
            currentTiltY = 0;
            updateTransform();
            setTimeout(function () {
                inner.style.transition = 'transform 0.15s ease, box-shadow 0.35s ease';
            }, 500);
        });

        // 3D tilt on mouse move
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var normX = (x - centerX) / centerX;
            var normY = (y - centerY) / centerY;

            currentTiltX = -normY * 20;
            currentTiltY = normX * 20;
            updateTransform();

            var shineX = ((x / rect.width) * 100);
            var shineY = ((y / rect.height) * 100);
            shine.style.backgroundPosition = shineX + '% ' + shineY + '%';
            glare.style.background = 'radial-gradient(circle at ' +
                shineX + '% ' + shineY + '%, ' +
                'rgba(255, 255, 255, 0.3) 0%, ' +
                'rgba(255, 255, 255, 0.05) 35%, ' +
                'transparent 65%)';
        });

        card.addEventListener('mouseleave', function () {
            currentTiltX = 0;
            currentTiltY = 0;
            updateTransform();
            shine.style.backgroundPosition = '50% 50%';
            glare.style.background = '';
        });

        // Touch support
        card.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var rect = card.getBoundingClientRect();
            var x = e.touches[0].clientX - rect.left;
            var y = e.touches[0].clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var normX = (x - centerX) / centerX;
            var normY = (y - centerY) / centerY;

            currentTiltX = -normY * 15;
            currentTiltY = normX * 15;
            updateTransform();

            var shineX = ((x / rect.width) * 100);
            var shineY = ((y / rect.height) * 100);
            shine.style.backgroundPosition = shineX + '% ' + shineY + '%';
            glare.style.background = 'radial-gradient(circle at ' +
                shineX + '% ' + shineY + '%, ' +
                'rgba(255, 255, 255, 0.3) 0%, ' +
                'rgba(255, 255, 255, 0.05) 35%, ' +
                'transparent 65%)';
        }, { passive: false });

        card.addEventListener('touchend', function () {
            currentTiltX = 0;
            currentTiltY = 0;
            updateTransform();
            shine.style.backgroundPosition = '50% 50%';
            glare.style.background = '';
        });
    });
})();
