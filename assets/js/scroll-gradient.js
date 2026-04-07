/* Scroll gradient — updates --scroll-progress CSS var (0 → 1) as user scrolls */
(function () {
    'use strict';

    function update() {
        var h = document.body.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.min(window.scrollY / h, 1) : 0;
        document.documentElement.style.setProperty('--scroll-progress', p);
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
})();
