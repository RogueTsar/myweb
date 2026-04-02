/* ── Music Page Background: Inner Globe ── */
(function () {
    'use strict';

    function isMusicsPage() {
        return /\bMusic\b/i.test(document.title) || /\/music/i.test(window.location.pathname);
    }
    if (!isMusicsPage()) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var raf = null;
    var running = false;
    var W, H;
    var angle = 0;
    var lowEnd = false;

    // Simple low-end detection
    try {
        var c = document.createElement('canvas').getContext('2d');
        if (!c || navigator.hardwareConcurrency <= 2) lowEnd = true;
    } catch (e) { lowEnd = true; }

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getColors() {
        var s = getComputedStyle(document.documentElement);
        return {
            accent: s.getPropertyValue('--accent').trim() || '#6366f1',
            bg: s.getPropertyValue('--bg').trim() || '#ffffff'
        };
    }

    // Project a 3D point to 2D
    function project(x, y, z, cx, cy, radius) {
        var scale = radius / (radius + z);
        return { x: cx + x * scale, y: cy + y * scale, s: scale };
    }

    // Generate sphere wireframe points
    function drawGlobe(t) {
        var colors = getColors();
        ctx.clearRect(0, 0, W, H);

        if (lowEnd) {
            // Fallback: simple animated radial gradient
            var gx = W / 2 + Math.sin(t * 0.3) * 50;
            var gy = H / 2 + Math.cos(t * 0.2) * 30;
            var r = Math.min(W, H) * 0.4;
            var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
            grad.addColorStop(0, colors.accent);
            grad.addColorStop(1, 'transparent');
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            return;
        }

        var cx = W / 2;
        var cy = H / 2;
        var radius = Math.min(W, H) * 0.3;
        var rotY = t * 0.2;
        var rotX = 0.3;
        var meridians = 16;
        var parallels = 12;

        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 0.8;

        // Draw meridians (vertical lines)
        for (var m = 0; m < meridians; m++) {
            var lon = (m / meridians) * Math.PI * 2 + rotY;
            ctx.beginPath();
            for (var p = 0; p <= 40; p++) {
                var lat = (p / 40) * Math.PI - Math.PI / 2;
                var x0 = Math.cos(lat) * Math.cos(lon);
                var y0 = Math.sin(lat);
                var z0 = Math.cos(lat) * Math.sin(lon);
                // Apply X rotation
                var y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
                var z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);
                var pt = project(x0 * radius, y1 * radius, z1 * radius, cx, cy, radius * 3);
                if (p === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
        }

        // Draw parallels (horizontal lines)
        for (var pl = 1; pl < parallels; pl++) {
            var lat2 = (pl / parallels) * Math.PI - Math.PI / 2;
            ctx.beginPath();
            for (var s = 0; s <= 60; s++) {
                var lon2 = (s / 60) * Math.PI * 2 + rotY;
                var x2 = Math.cos(lat2) * Math.cos(lon2);
                var y2 = Math.sin(lat2);
                var z2 = Math.cos(lat2) * Math.sin(lon2);
                var y3 = y2 * Math.cos(rotX) - z2 * Math.sin(rotX);
                var z3 = y2 * Math.sin(rotX) + z2 * Math.cos(rotX);
                var pt2 = project(x2 * radius, y3 * radius, z3 * radius, cx, cy, radius * 3);
                if (s === 0) ctx.moveTo(pt2.x, pt2.y);
                else ctx.lineTo(pt2.x, pt2.y);
            }
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    function loop(ts) {
        if (!running) return;
        var t = ts / 1000;
        drawGlobe(t);
        raf = requestAnimationFrame(loop);
    }

    function start() {
        if (running) return;
        running = true;
        canvas.style.display = '';
        resize();
        raf = requestAnimationFrame(loop);
    }

    function stop() {
        running = false;
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        canvas.style.display = 'none';
    }

    // Watch for toggle
    function check() {
        if (document.body.getAttribute('data-bg-active') === 'true') start();
        else stop();
    }

    var observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-bg-active'] });

    window.addEventListener('resize', function () { if (running) resize(); });

    check();
})();
