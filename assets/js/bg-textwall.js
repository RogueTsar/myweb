/* ── Personal Page Background: Text Wall ── */
(function () {
    'use strict';

    function isPersonalPage() {
        return /\bPersonal\b/i.test(document.title) || /\/personal/i.test(window.location.pathname);
    }
    if (!isPersonalPage()) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var raf = null;
    var running = false;
    var W, H;

    var WORDS = [
        'safety', 'alignment', 'research', 'governance', 'ethics',
        'policy', 'fairness', 'transparency', 'accountability', 'trust',
        'interpretability', 'robustness', 'evaluation', 'oversight',
        'cooperation', 'stewardship', 'principles', 'responsibility',
        'human', 'values', 'future', 'progress', 'caution', 'impact',
        'society', 'agency', 'autonomy', 'reasoning', 'learning'
    ];

    var items = [];
    var ITEM_COUNT = 45;

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initItems() {
        items = [];
        for (var i = 0; i < ITEM_COUNT; i++) {
            items.push(makeItem(true));
        }
    }

    function makeItem(randomY) {
        var size = 10 + Math.random() * 18;
        return {
            word: WORDS[Math.floor(Math.random() * WORDS.length)],
            x: Math.random() * W,
            y: randomY ? Math.random() * H : -30,
            vy: 0.15 + Math.random() * 0.35,
            vx: (Math.random() - 0.5) * 0.2,
            size: size,
            alpha: 0,
            maxAlpha: 0.06 + Math.random() * 0.1,
            fadeIn: true,
            fadeSpeed: 0.001 + Math.random() * 0.002
        };
    }

    function getColors() {
        var s = getComputedStyle(document.documentElement);
        return {
            text: s.getPropertyValue('--text').trim() || '#1a1a1a',
            accent: s.getPropertyValue('--accent').trim() || '#6366f1'
        };
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        var colors = getColors();

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            it.y += it.vy;
            it.x += it.vx;

            // Fade in then hold
            if (it.fadeIn) {
                it.alpha += it.fadeSpeed;
                if (it.alpha >= it.maxAlpha) {
                    it.alpha = it.maxAlpha;
                    it.fadeIn = false;
                }
            }

            // Fade out near bottom
            if (it.y > H * 0.8) {
                it.alpha = it.maxAlpha * (1 - (it.y - H * 0.8) / (H * 0.2));
            }

            // Reset if off screen
            if (it.y > H + 30) {
                items[i] = makeItem(false);
                continue;
            }

            ctx.globalAlpha = Math.max(0, it.alpha);
            ctx.fillStyle = i % 3 === 0 ? colors.accent : colors.text;
            ctx.font = it.size + 'px Inter Tight, Inter, sans-serif';
            ctx.fillText(it.word, it.x, it.y);
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
        if (items.length === 0) initItems();
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
        if (running) resize();
    });

    check();
})();
