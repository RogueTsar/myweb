/* ── Fluid Testimonials Carousel ── */
(function () {
    var container = document.getElementById('testimonials-list');
    if (!container) return;

    fetch('/assets/data/testimonials.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { render(data); })
        .catch(function () {});

    function render(items) {
        if (!items || items.length === 0) {
            container.closest('.testimonials-section').style.display = 'none';
            return;
        }

        var allPlaceholder = items.every(function (t) { return t.quote === '[to be placed]'; });
        if (allPlaceholder) {
            container.closest('.testimonials-section').style.display = 'none';
            return;
        }

        var visibleItems = items.filter(function (t) { return t.quote !== '[to be placed]'; });

        var html = '<div class="testimonials-carousel">';
        html += '<div class="testimonials-carousel__track">';
        visibleItems.forEach(function (t, i) {
            html += '<div class="testimonial-card testimonial-card--fluid" data-index="' + i + '">' +
                '<div class="testimonial-card__quote-mark">\u201C</div>' +
                '<p class="testimonial-card__quote">' + esc(t.quote) + '</p>' +
                '<div class="testimonial-card__footer">' +
                    '<div class="testimonial-card__author">' + esc(t.name) + '</div>' +
                    '<div class="testimonial-card__role">' + esc(t.role) + '</div>' +
                '</div>' +
                '</div>';
        });
        html += '</div>';

        // Dot indicators
        if (visibleItems.length > 1) {
            html += '<div class="testimonials-carousel__dots">';
            visibleItems.forEach(function (_, i) {
                html += '<button class="testimonials-carousel__dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="Go to testimonial ' + (i + 1) + '"></button>';
            });
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // Scroll-snap dot sync
        var track = container.querySelector('.testimonials-carousel__track');
        var dots = container.querySelectorAll('.testimonials-carousel__dot');

        if (track && dots.length > 0) {
            // Click dot to scroll
            dots.forEach(function (dot) {
                dot.addEventListener('click', function () {
                    var idx = parseInt(dot.getAttribute('data-index'), 10);
                    var cards = track.querySelectorAll('.testimonial-card--fluid');
                    if (cards[idx]) {
                        cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                    }
                });
            });

            // Update dots on scroll
            var scrollTimer;
            track.addEventListener('scroll', function () {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function () {
                    var cards = track.querySelectorAll('.testimonial-card--fluid');
                    var trackRect = track.getBoundingClientRect();
                    var center = trackRect.left + trackRect.width / 2;
                    var closest = 0;
                    var minDist = Infinity;
                    cards.forEach(function (card, i) {
                        var cardRect = card.getBoundingClientRect();
                        var cardCenter = cardRect.left + cardRect.width / 2;
                        var dist = Math.abs(cardCenter - center);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = i;
                        }
                    });
                    dots.forEach(function (d, i) {
                        d.classList.toggle('active', i === closest);
                    });
                }, 50);
            });
        }
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
