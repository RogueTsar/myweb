/* ── Welcome Letter — first visit overlay ── */
(function () {
    if (localStorage.getItem('vs-letter-seen')) {
        addEnvelope();
        return;
    }

    var overlay = document.createElement('div');
    overlay.className = 'letter-overlay';
    overlay.innerHTML =
        '<div class="letter-card">' +
            '<p>Hello,</p>' +
            '<p>Thank you for taking the time to get to know me. My goal is to help accelerate work that makes the world safer, happier, and more plentiful, given my privileged position in life. I hope to become a great researcher and writer like my mentors and collaborators, without whom I would not make significant strides every day. I would be ecstatic to connect!</p>' +
            '<div class="letter-signature" id="letter-sig" style="opacity:0">V.S.</div>' +
        '</div>';

    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
        overlay.classList.add('visible');
    });

    // Animate signature after 1s
    setTimeout(function () {
        var sig = document.getElementById('letter-sig');
        if (sig) sig.style.opacity = '1';
    }, 1000);

    // Auto-close after signature
    setTimeout(function () {
        closeLetter(overlay);
    }, 4000);

    // Click overlay to close early
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLetter(overlay);
    });

    function closeLetter(el) {
        el.classList.remove('visible');
        setTimeout(function () {
            el.remove();
            localStorage.setItem('vs-letter-seen', 'true');
            addEnvelope();
        }, 500);
    }

    function addEnvelope() {
        if (document.querySelector('.letter-envelope')) return;
        var env = document.createElement('button');
        env.className = 'letter-envelope';
        env.setAttribute('aria-label', 'Reopen welcome letter');
        env.innerHTML = '\u2709';
        env.onclick = function () {
            localStorage.removeItem('vs-letter-seen');
            location.reload();
        };
        document.body.appendChild(env);
    }
})();
