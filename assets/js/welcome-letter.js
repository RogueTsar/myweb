/* ── Welcome Letter — first visit overlay ── */
(function () {
    var SEEN_KEY = 'vs-letter-seen';

    if (localStorage.getItem(SEEN_KEY)) {
        addEnvelope();
        return;
    }

    /* ── Build overlay ── */
    var overlay = document.createElement('div');
    overlay.className = 'letter-overlay';

    /* Coffee cup SVG — top-down view with saucer */
    var coffeeSVG =
        '<div class="letter-coffee" aria-hidden="true">' +
            '<svg viewBox="0 0 120 120" width="100" height="100" xmlns="http://www.w3.org/2000/svg">' +
                /* Saucer */
                '<ellipse cx="60" cy="62" rx="55" ry="18" fill="var(--bg-subtle)" stroke="var(--glass-border)" stroke-width="1.5" opacity="0.85"/>' +
                /* Cup outer */
                '<ellipse cx="60" cy="58" rx="34" ry="34" fill="var(--bg-subtle)" stroke="var(--accent)" stroke-width="1.5"/>' +
                /* Cup inner / coffee surface */
                '<ellipse cx="60" cy="58" rx="27" ry="27" fill="var(--accent-dark)" opacity="0.8"/>' +
                /* Coffee highlight */
                '<ellipse cx="53" cy="52" rx="10" ry="8" fill="var(--accent)" opacity="0.25"/>' +
                /* Handle */
                '<path d="M94,50 Q108,50 108,62 Q108,74 94,74" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>' +
                /* Steam wisps */
                '<path class="letter-steam" d="M48,26 Q46,18 50,10" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.4" stroke-linecap="round"/>' +
                '<path class="letter-steam letter-steam--2" d="M60,24 Q58,14 62,6" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.3" stroke-linecap="round"/>' +
                '<path class="letter-steam letter-steam--3" d="M72,26 Q70,18 74,10" fill="none" stroke="var(--text-secondary)" stroke-width="1" opacity="0.35" stroke-linecap="round"/>' +
            '</svg>' +
        '</div>';

    /* Signature SVG — stroke-dashoffset draw-in animation */
    var signatureSVG =
        '<svg class="letter-sig-svg" viewBox="0 0 120 60" width="140" height="70" xmlns="http://www.w3.org/2000/svg">' +
            '<text x="4" y="48" font-family="Caveat, cursive" font-size="48" font-weight="500" ' +
                'fill="none" stroke="var(--accent)" stroke-width="1.5" ' +
                'stroke-dasharray="300" stroke-dashoffset="300">' +
                'V.S.' +
            '</text>' +
            /* Filled text revealed after stroke draws */
            '<text class="letter-sig-fill" x="4" y="48" font-family="Caveat, cursive" font-size="48" font-weight="500" ' +
                'fill="var(--accent)" opacity="0">' +
                'V.S.' +
            '</text>' +
        '</svg>';

    overlay.innerHTML =
        '<div class="letter-card">' +
            coffeeSVG +
            '<p class="letter-epigraph">\u201CSearch others for their virtues, thyself for thy vices.\u201D</p>' +
            '<p class="letter-greeting">Hello,</p>' +
            '<p class="letter-body">Thank you for taking the time to get to know me. ' +
            'My goal is to help accelerate work that makes the world safer, happier, ' +
            'and more plentiful, given my privileged position in life. I hope to become ' +
            'a great researcher and writer like my mentors and collaborators, without ' +
            'whom I would not make significant strides every day. I would be ecstatic to connect!</p>' +
            '<div class="letter-signature">' + signatureSVG + '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    /* ── Animate in ── */
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            overlay.classList.add('visible');
        });
    });

    /* ── Trigger signature draw after card has appeared ── */
    var sigStroke = overlay.querySelector('.letter-sig-svg text:first-child');
    var sigFill = overlay.querySelector('.letter-sig-fill');

    setTimeout(function () {
        if (sigStroke) {
            sigStroke.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
            sigStroke.style.strokeDashoffset = '0';
        }
        /* After stroke draws, reveal fill */
        setTimeout(function () {
            if (sigFill) {
                sigFill.style.transition = 'opacity 0.4s ease';
                sigFill.style.opacity = '1';
            }
            /* Auto-close 1.5s after signature finishes */
            setTimeout(function () {
                closeLetter(overlay);
            }, 1500);
        }, 1500);
    }, 800);

    /* ── Click overlay backdrop to close early ── */
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLetter(overlay);
    });

    /* ── Close handler ── */
    var closing = false;
    function closeLetter(el) {
        if (closing) return;
        closing = true;

        /* Slide coffee cup out */
        var cup = el.querySelector('.letter-coffee');
        if (cup) cup.classList.add('letter-coffee--out');

        /* Fade overlay */
        el.classList.add('closing');
        el.classList.remove('visible');

        setTimeout(function () {
            el.remove();
            localStorage.setItem(SEEN_KEY, 'true');
            addEnvelope();
        }, 600);
    }

    /* ── Envelope (persistent, all pages) ── */
    function addEnvelope() {
        if (document.querySelector('.letter-envelope')) return;
        var env = document.createElement('button');
        env.className = 'letter-envelope';
        env.setAttribute('aria-label', 'Reopen welcome letter');
        /* Inline envelope SVG icon */
        env.innerHTML =
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
                '<path d="M22,4 L12,13 L2,4"/>' +
            '</svg>';
        env.onclick = function () {
            env.remove();
            localStorage.removeItem(SEEN_KEY);
            /* Re-run the letter without a full page reload */
            var script = document.createElement('script');
            script.src = '/assets/js/welcome-letter.js?t=' + Date.now();
            document.body.appendChild(script);
        };
        document.body.appendChild(env);
    }
})();
