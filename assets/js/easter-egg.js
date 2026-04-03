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

            // Check if all 4 found
            if (found.length >= 4) {
                showRetroButton();
            }
        });
    });

    // Check on load too
    if (getFound().length >= 4) {
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
        // Store the current theme so we can restore it on exit
        var currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme !== 'retro') {
            localStorage.setItem('vs-pre-retro-theme', currentTheme || '');
        }

        document.documentElement.setAttribute('data-theme', 'retro');
        localStorage.setItem('vs-retro', 'true');

        // Add VT323 font dynamically if not loaded
        if (!document.getElementById('retro-font')) {
            var fontLink = document.createElement('link');
            fontLink.id = 'retro-font';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
            document.head.appendChild(fontLink);
        }

        // Add retro CSS if not loaded
        if (!document.getElementById('retro-css')) {
            var link = document.createElement('link');
            link.id = 'retro-css';
            link.rel = 'stylesheet';
            link.href = '/assets/css/retro.css';
            document.head.appendChild(link);
        }

        // Create EXIT RETRO button if not present
        if (!document.getElementById('retro-exit-btn')) {
            var exitBtn = document.createElement('button');
            exitBtn.id = 'retro-exit-btn';
            exitBtn.className = 'retro-exit';
            exitBtn.textContent = '[EXIT RETRO]';
            exitBtn.onclick = deactivateRetro;
            document.body.appendChild(exitBtn);
        }
    }

    function deactivateRetro() {
        // Restore previous theme (light or dark)
        var prevTheme = localStorage.getItem('vs-pre-retro-theme') || '';
        if (prevTheme) {
            document.documentElement.setAttribute('data-theme', prevTheme);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        localStorage.removeItem('vs-retro');
        localStorage.removeItem('vs-pre-retro-theme');

        // Remove the exit button
        var exitBtn = document.getElementById('retro-exit-btn');
        if (exitBtn) exitBtn.remove();

        // Remove the retro button so it can reappear from card collection
        var retroBtn = document.getElementById('retro-btn');
        if (retroBtn) retroBtn.remove();

        // Reset card tracking so user can re-discover
        sessionStorage.removeItem(STORAGE_KEY);
    }

    // Check if retro was active (persistence across pages)
    if (localStorage.getItem('vs-retro') === 'true') {
        activateRetro();
    }
})();
