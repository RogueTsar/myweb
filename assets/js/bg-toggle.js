/* ── Background Toggle ── */
(function () {
    var active = localStorage.getItem('vs-bg-active') === 'true';

    var btn = document.createElement('button');
    btn.className = 'bg-toggle' + (active ? ' active' : '');
    btn.setAttribute('aria-label', 'Toggle background');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v1m0 16v1m-9-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>';

    document.body.appendChild(btn);

    if (active) document.body.setAttribute('data-bg-active', 'true');

    btn.addEventListener('click', function () {
        active = !active;
        btn.classList.toggle('active', active);
        if (active) {
            document.body.setAttribute('data-bg-active', 'true');
        } else {
            document.body.removeAttribute('data-bg-active');
        }
        localStorage.setItem('vs-bg-active', active ? 'true' : 'false');
    });
})();
