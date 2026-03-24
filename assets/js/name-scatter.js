/* Name scatter animation: letters disperse on hover, bounce back */
(function () {
    var el = document.getElementById('name-scatter');
    if (!el) return;

    var text = el.textContent.trim();
    el.textContent = '';

    var letters = [];
    for (var i = 0; i < text.length; i++) {
        var span = document.createElement('span');
        span.className = 'name-letter' + (text[i] === ' ' ? ' space' : '');
        span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
        el.appendChild(span);
        letters.push(span);
    }

    var scattered = false;
    var timeout;

    function scatter() {
        if (scattered) return;
        scattered = true;
        letters.forEach(function (span) {
            if (span.classList.contains('space')) return;
            var dx = (Math.random() - 0.5) * 40;
            var dy = (Math.random() - 0.5) * 30;
            var rot = (Math.random() - 0.5) * 25;
            span.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) rotate(' + rot + 'deg)';
            span.classList.add('scattered');
        });
    }

    function gather() {
        scattered = false;
        letters.forEach(function (span) {
            span.style.transform = '';
            span.classList.remove('scattered');
        });
    }

    el.addEventListener('mouseenter', function () {
        clearTimeout(timeout);
        scatter();
    });

    el.addEventListener('mouseleave', function () {
        timeout = setTimeout(gather, 100);
    });

    // Touch support
    el.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (scattered) { gather(); } else { scatter(); timeout = setTimeout(gather, 1200); }
    }, { passive: false });
})();
