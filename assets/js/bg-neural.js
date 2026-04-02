/* ── Work Page Background: Neural Noise ── */
(function () {
    'use strict';

    function isWorkPage() {
        return /\bWork\b/i.test(document.title) || /\/work/i.test(window.location.pathname);
    }
    if (!isWorkPage()) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var raf = null;
    var running = false;
    var W, H;
    var nodes = [];
    var NODE_COUNT = 60;
    var CONNECTION_DIST = 150;

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        CONNECTION_DIST = Math.min(W, H) * 0.12;
    }

    function initNodes() {
        nodes = [];
        for (var i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: 1.5 + Math.random() * 1.5
            });
        }
    }

    function getColors() {
        var s = getComputedStyle(document.documentElement);
        return {
            accent: s.getPropertyValue('--accent').trim() || '#6366f1',
            text: s.getPropertyValue('--text').trim() || '#1a1a1a'
        };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        var colors = getColors();

        // Update positions
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            n.x += n.vx;
            n.y += n.vy;
            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
            n.x = Math.max(0, Math.min(W, n.x));
            n.y = Math.max(0, Math.min(H, n.y));
        }

        // Draw connections
        ctx.strokeStyle = colors.accent;
        for (var a = 0; a < nodes.length; a++) {
            for (var b = a + 1; b < nodes.length; b++) {
                var dx = nodes[a].x - nodes[b].x;
                var dy = nodes[a].y - nodes[b].y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    var alpha = (1 - dist / CONNECTION_DIST) * 0.18;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(nodes[a].x, nodes[a].y);
                    ctx.lineTo(nodes[b].x, nodes[b].y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.22;
        for (var j = 0; j < nodes.length; j++) {
            ctx.beginPath();
            ctx.arc(nodes[j].x, nodes[j].y, nodes[j].r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    function loop() {
        if (!running) return;
        draw();
        raf = requestAnimationFrame(loop);
    }

    function start() {
        if (running) return;
        running = true;
        canvas.style.display = '';
        resize();
        if (nodes.length === 0) initNodes();
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

    window.addEventListener('resize', function () {
        if (running) {
            resize();
            // Re-scatter nodes if they're outside new bounds
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].x > W) nodes[i].x = Math.random() * W;
                if (nodes[i].y > H) nodes[i].y = Math.random() * H;
            }
        }
    });

    check();
})();
