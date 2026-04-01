/* ── Easter Egg: Balatro Card Tracking → Retro Mode ── */
(function () {
    var STORAGE_KEY = 'vs-cards-found';

    function getFound() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
        } catch (_) { return []; }
    }

    function setFound(arr) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    // Hook into existing card clicks
    document.querySelectorAll('.holo-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var cardName = card.getAttribute('data-card');
            if (!cardName) return;

            var found = getFound();
            if (found.indexOf(cardName) === -1) {
                found.push(cardName);
                setFound(found);

                // Glow effect
                card.classList.add('holo-card--found');
                setTimeout(function () {
                    card.classList.remove('holo-card--found');
                }, 800);
            }

            // Check if all 3 found
            if (found.length >= 3) {
                showRetroButton();
            }
        });
    });

    // Check on load too
    if (getFound().length >= 3) {
        showRetroButton();
    }

    function showRetroButton() {
        if (document.getElementById('retro-btn')) return;
        var btn = document.createElement('button');
        btn.id = 'retro-btn';
        btn.className = 'btn-glass';
        btn.textContent = 'RETRO';
        btn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:200;font-size:11px;letter-spacing:0.1em;padding:6px 14px;animation:retro-pulse 1.5s ease-in-out infinite';
        btn.onclick = function () { activateRetro(); };
        document.body.appendChild(btn);
    }

    function activateRetro() {
        document.documentElement.setAttribute('data-theme', 'retro');
        localStorage.setItem('vs-retro', 'true');
        // Add retro CSS if not loaded
        if (!document.getElementById('retro-css')) {
            var link = document.createElement('link');
            link.id = 'retro-css';
            link.rel = 'stylesheet';
            link.href = '/assets/css/retro.css';
            document.head.appendChild(link);
        }
    }

    // Check if retro was active
    if (localStorage.getItem('vs-retro') === 'true') {
        activateRetro();
    }
})();
