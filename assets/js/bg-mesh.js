/* ── Mesh Gradient Orbs — macOS Sequoia style background animation ── */
(function () {
    // Skip on very low-end devices
    if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;';
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var vw, vh, dpr;
    var frame = 0;
    var mouseX = 0.5, mouseY = 0.3;
    var targetMouseX = 0.5, targetMouseY = 0.3;

    var LIGHT_PALETTE = [
        { r: 128, g: 0,   b: 32,  a: 0.07 },   // burgundy
        { r: 201, g: 169, b: 110, a: 0.06 },   // gold
        { r: 176, g: 48,  b: 96,  a: 0.05 },   // rose
        { r: 160, g: 50,  b: 79,  a: 0.05 }    // warm
    ];

    var DARK_PALETTE = [
        { r: 65,  g: 105, b: 225, a: 0.09 },   // royal blue
        { r: 123, g: 159, b: 255, a: 0.06 },   // periwinkle
        { r: 26,  g: 48,  b: 96,  a: 0.08 },   // navy
        { r: 90,  g: 70,  b: 180, a: 0.06 }    // violet
    ];

    // Orb definitions: cx/cy = normalized center, rx/ry = orbit radius fraction, speed, phase
    var ORB_DEFS = [
        { cx: 0.15, cy: 0.15, rx: 0.18, ry: 0.14, speed: 0.7, phase: 0.0,  size: 0.42 },
        { cx: 0.80, cy: 0.25, rx: 0.14, ry: 0.20, speed: 0.5, phase: 1.8,  size: 0.38 },
        { cx: 0.50, cy: 0.70, rx: 0.22, ry: 0.12, speed: 0.9, phase: 3.5,  size: 0.35 },
        { cx: 0.30, cy: 0.80, rx: 0.12, ry: 0.18, speed: 0.6, phase: 5.2,  size: 0.40 }
    ];

    var orbs = ORB_DEFS.map(function (d) { return Object.assign({}, d, { x: 0, y: 0 }); });

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        vw = window.innerWidth;
        vh = window.innerHeight;
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        ctx.scale(dpr, dpr);
    }

    function getScrollProgress() {
        var val = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-progress')) || 0;
        return Math.max(0, Math.min(1, val));
    }

    function drawOrbs(palette, isMobile) {
        var count = isMobile ? 2 : orbs.length;
        var scrollP = getScrollProgress();
        var t = Date.now() * 0.0003;

        ctx.clearRect(0, 0, vw, vh);
        ctx.globalCompositeOperation = 'source-over';

        for (var i = 0; i < count; i++) {
            var orb = orbs[i];
            var col = palette[i % palette.length];

            // Smooth mouse attraction (subtle)
            var attractX = mouseX * vw;
            var attractY = mouseY * vh;

            var baseX = vw * orb.cx + Math.sin(t * orb.speed + orb.phase) * vw * orb.rx;
            var baseY = vh * orb.cy + Math.cos(t * orb.speed + orb.phase * 1.3) * vh * orb.ry;

            // Scroll shifts orbs down
            baseY += scrollP * vh * 0.12;

            // Very gentle mouse pull (max 5% of vw/vh)
            orb.x = baseX + (attractX - baseX) * 0.04;
            orb.y = baseY + (attractY - baseY) * 0.04;

            var radius = Math.max(vw, vh) * (isMobile ? orb.size * 1.3 : orb.size);

            var grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
            grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + col.a + ')');
            grad.addColorStop(0.5, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (col.a * 0.4) + ')');
            grad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');

            ctx.beginPath();
            ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }

    function tick() {
        frame++;
        // 30fps cap: skip odd frames
        if (frame % 2 === 0) {
            requestAnimationFrame(tick);
            return;
        }

        // Smooth mouse interpolation
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        var isMobile = vw <= 768;
        var palette = isDark() ? DARK_PALETTE : LIGHT_PALETTE;

        drawOrbs(palette, isMobile);
        requestAnimationFrame(tick);
    }

    // Mouse tracking
    document.addEventListener('mousemove', function (e) {
        targetMouseX = e.clientX / window.innerWidth;
        targetMouseY = e.clientY / window.innerHeight;
    }, { passive: true });

    // Init
    resize();
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(tick);
})();
