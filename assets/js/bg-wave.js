/* ── Blog Page Background: Wave Prism ── */
(function () {
    'use strict';

    function isBlogPage() {
        return /\bBlog\b/i.test(document.title) || /\/blog/i.test(window.location.pathname);
    }
    if (!isBlogPage()) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var raf = null;
    var running = false;
    var W, H;

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    // Colors inverted per theme: light = cool blues/purples, dark = warm reds/golds
    function getWaveColors() {
        if (isDark()) {
            return [
                'rgba(255, 107, 74, ALPHA)',   // warm red-orange
                'rgba(255, 179, 71, ALPHA)',   // gold
                'rgba(234, 88, 12, ALPHA)',    // orange
                'rgba(251, 146, 60, ALPHA)'    // amber
            ];
        } else {
            return [
                'rgba(99, 102, 241, ALPHA)',   // indigo
                'rgba(139, 92, 246, ALPHA)',   // purple
                'rgba(59, 130, 246, ALPHA)',   // blue
                'rgba(99, 179, 237, ALPHA)'    // light blue
            ];
        }
    }

    function drawWaves(t) {
        ctx.clearRect(0, 0, W, H);
        var colors = getWaveColors();
        var waveCount = colors.length;
        var baseY = H * 0.5;

        for (var i = 0; i < waveCount; i++) {
            var alpha = 0.15 + (i * 0.03);
            var color = colors[i].replace('ALPHA', alpha.toString());
            var amplitude = H * 0.08 + i * 15;
            var frequency = 0.003 + i * 0.0008;
            var phase = t * (0.4 + i * 0.15) + i * 1.2;
            var yOffset = (i - waveCount / 2) * (H * 0.1);

            ctx.beginPath();
            ctx.moveTo(0, H);
            for (var x = 0; x <= W; x += 3) {
                var y = baseY + yOffset +
                    Math.sin(x * frequency + phase) * amplitude +
                    Math.sin(x * frequency * 0.5 + phase * 0.7) * amplitude * 0.5;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function loop(ts) {
        if (!running) return;
        drawWaves(ts / 1000);
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

    function check() {
        if (document.body.getAttribute('data-bg-active') === 'true') start();
        else stop();
    }

    var observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-bg-active'] });

    window.addEventListener('resize', function () { if (running) resize(); });

    check();
})();
