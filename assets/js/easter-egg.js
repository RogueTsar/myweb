/* ── Easter Egg: Balatro Card Tracking -> Retro Mode ── */
(function () {
    var STORAGE_KEY = 'vs-cards-found';

    function getFound() {
        try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (_) { return []; }
    }

    function setFound(arr) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    function getTotalCards() {
        return document.querySelectorAll('.holo-card').length;
    }

    // Use event delegation since cards are built dynamically
    document.addEventListener('click', function (e) {
        var card = e.target.closest('.holo-card');
        if (!card) return;

        var cardName = card.getAttribute('data-card');
        if (!cardName) return;

        var found = getFound();
        if (found.indexOf(cardName) === -1) {
            found.push(cardName);
            setFound(found);

            card.classList.add('holo-card--found');
            setTimeout(function () { card.classList.remove('holo-card--found'); }, 800);
        }

        var total = getTotalCards();
        if (total > 0 && found.length >= total) {
            showRetroButton();
        }
    });

    // Check on load too (delayed to wait for dynamic cards)
    setTimeout(function () {
        var total = getTotalCards();
        if (total > 0 && getFound().length >= total) {
            showRetroButton();
        }
    }, 1000);

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
        if (!document.getElementById('retro-css')) {
            var link = document.createElement('link');
            link.id = 'retro-css';
            link.rel = 'stylesheet';
            link.href = '/assets/css/retro.css';
            document.head.appendChild(link);
        }
    }

    if (localStorage.getItem('vs-retro') === 'true') {
        activateRetro();
    }
})();
