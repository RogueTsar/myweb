(function () {
    var STORAGE_KEY = 'vs-theme';
    var btn = document.getElementById('theme-toggle');

    // Apply saved theme immediately (before paint to avoid flash)
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function swapCardImages(dark) {
        var imgs = document.querySelectorAll('[data-light-src][data-dark-src]');
        if (!imgs.length) return;
        imgs.forEach(function (img) {
            img.style.opacity = '0';
        });
        setTimeout(function () {
            imgs.forEach(function (img) {
                img.src = dark ? img.getAttribute('data-dark-src') : img.getAttribute('data-light-src');
                img.style.opacity = '1';
            });
        }, 300);
    }

    function updateToggle() {
        if (btn) btn.setAttribute('data-dark', isDark() ? 'true' : 'false');
    }

    // Apply initial card state
    swapCardImages(isDark());
    updateToggle();

    if (btn) {
        btn.addEventListener('click', function () {
            var goingDark = !isDark();
            if (goingDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem(STORAGE_KEY, 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem(STORAGE_KEY, 'light');
            }
            swapCardImages(goingDark);
            updateToggle();
        });
    }
})();
