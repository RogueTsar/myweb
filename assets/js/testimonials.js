/* ── Fluid Testimonials ── */
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

        var html = '<div class="testimonials-scroll">';
        items.forEach(function (t) {
            if (t.quote === '[to be placed]') return;
            html += '<div class="testimonial-card">' +
                '<p class="testimonial-card__quote">"' + esc(t.quote) + '"</p>' +
                '<div class="testimonial-card__author">' + esc(t.name) + '</div>' +
                '<div class="testimonial-card__role">' + esc(t.role) + '</div>' +
                '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
