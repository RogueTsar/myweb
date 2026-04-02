/* ── 3D Split Section Divider ── */
(function () {
    // Insert divider between telescopic-text (About Me) and research-graph-section
    var aboutSection = document.querySelector('.telescopic-text');
    var graphSection = document.getElementById('research-graph-section');
    if (!aboutSection || !graphSection) return;

    var divider = document.createElement('div');
    divider.className = 'split-divider';
    divider.innerHTML =
        '<div class="split-divider__line">' +
            '<div class="split-divider__panel split-divider__panel--left"></div>' +
            '<div class="split-divider__panel split-divider__panel--right"></div>' +
        '</div>';
    aboutSection.parentNode.insertBefore(divider, graphSection);

    // Intersection Observer for scroll-triggered animation
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                divider.classList.add('split-divider--visible');
            } else {
                divider.classList.remove('split-divider--visible');
            }
        });
    }, { threshold: 0.3 });

    observer.observe(divider);

    // Optional: parallax scroll effect for extra depth
    window.addEventListener('scroll', function () {
        if (!divider.classList.contains('split-divider--visible')) return;
        var rect = divider.getBoundingClientRect();
        var viewH = window.innerHeight;
        var progress = 1 - (rect.top / viewH);
        progress = Math.max(0, Math.min(1, progress));
        var spread = progress * 45;
        var leftPanel = divider.querySelector('.split-divider__panel--left');
        var rightPanel = divider.querySelector('.split-divider__panel--right');
        leftPanel.style.transform = 'perspective(800px) rotateY(' + (spread * 0.3) + 'deg) translateX(-' + spread + '%)';
        rightPanel.style.transform = 'perspective(800px) rotateY(-' + (spread * 0.3) + 'deg) translateX(' + spread + '%)';
    });
})();
