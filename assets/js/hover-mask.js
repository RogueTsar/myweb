/* ── Work Card Hover Mask ── */
(function () {
    var cards = document.querySelectorAll('.work-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
        card.classList.add('hover-mask');

        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            card.style.setProperty('--mask-x', x + 'px');
            card.style.setProperty('--mask-y', y + 'px');
        });

        card.addEventListener('mouseleave', function () {
            card.style.removeProperty('--mask-x');
            card.style.removeProperty('--mask-y');
        });
    });
})();
