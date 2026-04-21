/* ── About Page ── */
(function () {
    'use strict';

    var TRAITS = [
        { key: 'openness',          label: 'Openness',        desc: 'Curious, creative, open to new experiences' },
        { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organised, dependable, goal-directed' },
        { key: 'extraversion',      label: 'Extraversion',    desc: 'Energised by ideas, selective with crowds' },
        { key: 'agreeableness',     label: 'Agreeableness',   desc: 'Cooperative, empathetic, trusting' },
        { key: 'neuroticism',       label: 'Neuroticism',     desc: 'Emotionally stable, resilient under pressure' },
    ];

    var NS   = 'http://www.w3.org/2000/svg';
    var CX   = 180, CY = 180, R = 120, LR = 150;
    var ANGS = TRAITS.map(function (_, i) { return (Math.PI * 2 * i / 5) - Math.PI / 2; });

    function pt(angle, radius) {
        return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
    }

    function el(tag, attrs) {
        var e = document.createElementNS(NS, tag);
        Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    function drawRadar(svg, scores) {
        // Background grid rings
        [0.25, 0.5, 0.75, 1].forEach(function (f) {
            var pts = ANGS.map(function (a) { return pt(a, R * f); });
            svg.appendChild(el('polygon', {
                points: pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '),
                fill: 'none',
                stroke: 'var(--border)',
                'stroke-width': '1',
                opacity: '0.6',
            }));
        });

        // Axis lines
        ANGS.forEach(function (a) {
            var outer = pt(a, R);
            svg.appendChild(el('line', {
                x1: CX, y1: CY,
                x2: outer.x.toFixed(1), y2: outer.y.toFixed(1),
                stroke: 'var(--border)',
                'stroke-width': '1',
                opacity: '0.5',
            }));
        });

        // Score polygon
        var scorePts = ANGS.map(function (a, i) { return pt(a, R * (scores[i] / 100)); });
        var poly = el('polygon', {
            points: scorePts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '),
            fill: 'var(--accent)',
            'fill-opacity': '0.15',
            stroke: 'var(--accent)',
            'stroke-width': '2',
            'stroke-linejoin': 'round',
        });
        poly.style.transformOrigin = CX + 'px ' + CY + 'px';
        poly.style.transform = 'scale(0)';
        poly.style.transition = 'transform 0.85s cubic-bezier(0.34,1.56,0.64,1)';
        svg.appendChild(poly);

        // Vertex dots
        scorePts.forEach(function (p, i) {
            var c = el('circle', {
                cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: '4',
                fill: 'var(--accent)',
            });
            c.style.transformOrigin = CX + 'px ' + CY + 'px';
            c.style.transform = 'scale(0)';
            c.style.transition = 'transform 0.85s cubic-bezier(0.34,1.56,0.64,1) ' + (0.06 * i) + 's';
            svg.appendChild(c);
        });

        // Labels
        ANGS.forEach(function (a, i) {
            var lp = pt(a, LR);
            var anchor = lp.x < CX - 5 ? 'end' : lp.x > CX + 5 ? 'start' : 'middle';
            var t = el('text', {
                x: lp.x.toFixed(1), y: lp.y.toFixed(1),
                'text-anchor': anchor,
                'dominant-baseline': 'middle',
                'font-size': '11',
                'font-family': 'Inter, sans-serif',
                fill: 'var(--text-secondary)',
                'font-weight': '500',
            });
            t.textContent = TRAITS[i].label;
            svg.appendChild(t);
        });

        // Trigger animation
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                svg.querySelectorAll('polygon[fill="var(--accent)"], circle[fill="var(--accent)"]').forEach(function (e) {
                    e.style.transform = 'scale(1)';
                });
            });
        });
    }

    function renderBars(container, scores) {
        var html = '';
        TRAITS.forEach(function (t, i) {
            var v = scores[i];
            html +=
                '<div class="ocean-bar-row">' +
                    '<div class="ocean-bar-row__header">' +
                        '<span class="ocean-bar-row__label">' + t.label + '</span>' +
                        '<span class="ocean-bar-row__val">' + v + '</span>' +
                    '</div>' +
                    '<div class="ocean-bar-row__bg">' +
                        '<div class="ocean-bar-row__fill" data-width="' + v + '%"></div>' +
                    '</div>' +
                    '<div class="ocean-bar-row__desc">' + t.desc + '</div>' +
                '</div>';
        });
        container.innerHTML = html;
        requestAnimationFrame(function () {
            container.querySelectorAll('.ocean-bar-row__fill').forEach(function (bar) {
                bar.style.width = bar.getAttribute('data-width');
            });
        });
    }

    function escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Load personality data and draw
    fetch('/assets/data/personality.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data) return;
            var scores = TRAITS.map(function (t) { return data[t.key] || 50; });
            var svg = document.getElementById('ocean-radar');
            var bars = document.getElementById('ocean-bars');
            if (svg) drawRadar(svg, scores);
            if (bars) renderBars(bars, scores);
        })
        .catch(function () {});

    // Now playing widget
    fetch('/api/spotify')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            var el = document.getElementById('about-now-playing');
            if (!el) return;
            var lp = data && data.last_played;
            if (!lp) { el.innerHTML = '<span class="about-currently__val" style="opacity:0.5">Nothing recent</span>'; return; }
            var status = lp.is_playing ? 'Now playing' : 'Last played';
            el.innerHTML =
                '<div class="about-np">' +
                    (lp.album_art ? '<img class="about-np__art" src="' + escHtml(lp.album_art) + '" alt="">' : '') +
                    '<div class="about-np__info">' +
                        '<span class="about-np__track">' + escHtml(lp.track) + '</span>' +
                        '<span class="about-np__artist">' + escHtml(lp.artist) + '</span>' +
                    '</div>' +
                    '<span class="about-np__status' + (lp.is_playing ? ' about-np__status--live' : '') + '">' + status + '</span>' +
                '</div>';
        })
        .catch(function () {
            var el = document.getElementById('about-now-playing');
            if (el) el.innerHTML = '';
        });
})();
