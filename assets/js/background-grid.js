/* ── Interactive Depth-Aware Grid Background ──
   Canvas grid that responds to mouse hover with depth/parallax.
   Only active when body[data-bg-active="true"] and on the home page.
   ────────────────────────────────────────────── */
(function () {
    'use strict';

    /* ── Guards ── */
    function isHomePage() {
        var path = window.location.pathname.replace(/\/+$/, '') || '/';
        return path === '' || path === '/' || path === '/index.html' ||
               document.body.classList.contains('home');
    }
    if (!isHomePage()) return;

    /* ── Mobile detection ── */
    var isMobile = window.innerWidth < 768;

    /* ── Canvas setup ── */
    var canvas = document.createElement('canvas');
    canvas.id = 'bg-grid-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:0;transition:opacity 0.5s ease;';
    document.body.insertBefore(canvas, document.body.firstChild);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* ── Grid config ── */
    var CELL = isMobile ? 60 : 40;
    var GAP = isMobile ? 4 : 3;
    var RADIUS = isMobile ? 120 : 200;   // influence radius in px
    var BASE_ALPHA = 0.06;
    var HOVER_ALPHA = 0.22;
    var SCALE_BOOST = 1.18;

    var cols, rows;
    var mouseX = -9999, mouseY = -9999;
    var rafId = null;

    /* ── Resize handler ── */
    function resize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(w / (CELL + GAP)) + 1;
        rows = Math.ceil(h / (CELL + GAP)) + 1;
    }
    resize();
    window.addEventListener('resize', function () {
        isMobile = window.innerWidth < 768;
        CELL = isMobile ? 60 : 40;
        GAP = isMobile ? 4 : 3;
        RADIUS = isMobile ? 120 : 200;
        resize();
    });

    /* ── Mouse tracking ── */
    if (!isMobile) {
        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        document.addEventListener('mouseleave', function () {
            mouseX = -9999;
            mouseY = -9999;
        });
    }

    /* ── Colour helpers ── */
    function getAccentColor() {
        var style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--accent').trim() || '#800020';
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function lerpColor(a, b, t) {
        return {
            r: Math.round(a.r + (b.r - a.r) * t),
            g: Math.round(a.g + (b.g - a.g) * t),
            b: Math.round(a.b + (b.b - a.b) * t)
        };
    }

    /* ── Render loop ── */
    var accentHex = getAccentColor();
    var accentRgb = hexToRgb(accentHex);
    var darkRgb = { r: 20, g: 20, b: 20 };

    /* Re-read accent on theme change */
    var observer = new MutationObserver(function () {
        accentHex = getAccentColor();
        accentRgb = hexToRgb(accentHex);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function draw() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        var step = CELL + GAP;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var cx = c * step + step * 0.5;
                var cy = r * step + step * 0.5;

                var dx = cx - mouseX;
                var dy = cy - mouseY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var t = Math.max(0, 1 - dist / RADIUS);

                /* Eased influence */
                var ease = t * t * (3 - 2 * t); // smoothstep

                var alpha = BASE_ALPHA + (HOVER_ALPHA - BASE_ALPHA) * ease;
                var scale = 1 + (SCALE_BOOST - 1) * ease;
                var half = (CELL * scale) * 0.5;

                /* Colour: gradient from dark to accent based on proximity */
                var col = lerpColor(darkRgb, accentRgb, ease);

                ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha.toFixed(3) + ')';

                /* Draw rounded rect */
                var x = cx - half;
                var y = cy - half;
                var size = CELL * scale;
                var rad = 3 * scale;

                ctx.beginPath();
                ctx.moveTo(x + rad, y);
                ctx.lineTo(x + size - rad, y);
                ctx.quadraticCurveTo(x + size, y, x + size, y + rad);
                ctx.lineTo(x + size, y + size - rad);
                ctx.quadraticCurveTo(x + size, y + size, x + size - rad, y + size);
                ctx.lineTo(x + rad, y + size);
                ctx.quadraticCurveTo(x, y + size, x, y + size - rad);
                ctx.lineTo(x, y + rad);
                ctx.quadraticCurveTo(x, y, x + rad, y);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    /* ── Start / stop based on data-bg-active ── */
    function isActive() {
        return document.body.getAttribute('data-bg-active') === 'true';
    }

    function loop() {
        if (!isActive()) {
            canvas.style.opacity = '0';
            rafId = null;
            return;
        }
        canvas.style.opacity = '1';
        draw();
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (rafId) return;
        loop();
    }

    /* Watch for data-bg-active changes */
    var bodyObserver = new MutationObserver(function () {
        if (isActive()) {
            start();
        } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
            canvas.style.opacity = '0';
        }
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-bg-active'] });

    /* Initial check */
    if (isActive()) start();

})();
