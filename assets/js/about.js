/* ── About Page ── */
(function () {
    'use strict';

    var TRAITS = [
        { key: 'openness',          label: 'Openness',          desc: 'Curious, creative, open to new experiences' },
        { key: 'conscientiousness', label: 'Conscientiousness', desc: 'Organised, dependable, goal-directed' },
        { key: 'extraversion',      label: 'Extraversion',      desc: 'Assertive, energetic, loves people' },
        { key: 'agreeableness',     label: 'Agreeableness',     desc: 'Altruistic, empathetic, cooperative' },
        { key: 'neuroticism',       label: 'Neuroticism',       desc: 'Emotionally stable, resilient under pressure' },
    ];

    var NS   = 'http://www.w3.org/2000/svg';
    var CX   = 210, CY = 210, R = 165, LR = 212;
    var ANGS = TRAITS.map(function (_, i) { return (Math.PI * 2 * i / 5) - Math.PI / 2; });

    function pt(angle, radius) {
        return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
    }

    function svgEl(tag, attrs) {
        var e = document.createElementNS(NS, tag);
        Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    function drawRadar(svg, scores, MAX) {
        MAX = MAX || 120;

        // Background rings
        [0.25, 0.5, 0.75, 1].forEach(function (f) {
            var pts = ANGS.map(function (a) { return pt(a, R * f); });
            svg.appendChild(svgEl('polygon', {
                points: pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '),
                fill: 'none', stroke: 'var(--border)', 'stroke-width': '1', opacity: '0.6',
            }));
        });

        // Axis lines
        ANGS.forEach(function (a) {
            var outer = pt(a, R);
            svg.appendChild(svgEl('line', {
                x1: CX, y1: CY, x2: outer.x.toFixed(1), y2: outer.y.toFixed(1),
                stroke: 'var(--border)', 'stroke-width': '1', opacity: '0.5',
            }));
        });

        // Score polygon
        var scorePts = ANGS.map(function (a, i) { return pt(a, R * (scores[i] / MAX)); });
        var poly = svgEl('polygon', {
            points: scorePts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '),
            fill: 'var(--accent)', 'fill-opacity': '0.15',
            stroke: 'var(--accent)', 'stroke-width': '2.5', 'stroke-linejoin': 'round',
        });
        poly.style.transformOrigin = CX + 'px ' + CY + 'px';
        poly.style.transform = 'scale(0)';
        poly.style.transition = 'transform 0.85s cubic-bezier(0.34,1.56,0.64,1)';
        svg.appendChild(poly);

        // Score dots
        var dots = [];
        scorePts.forEach(function (p, i) {
            var c = svgEl('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: '5', fill: 'var(--accent)' });
            c.style.transformOrigin = CX + 'px ' + CY + 'px';
            c.style.transform = 'scale(0)';
            c.style.transition = 'transform 0.85s cubic-bezier(0.34,1.56,0.64,1) ' + (0.06 * i) + 's, r 0.15s';
            svg.appendChild(c);
            dots.push(c);
        });

        // Labels
        ANGS.forEach(function (a, i) {
            var lp = pt(a, LR);
            var anchor = lp.x < CX - 5 ? 'end' : lp.x > CX + 5 ? 'start' : 'middle';
            var t = svgEl('text', {
                x: lp.x.toFixed(1), y: lp.y.toFixed(1),
                'text-anchor': anchor, 'dominant-baseline': 'middle',
                'font-size': '14', 'font-family': 'Inter, sans-serif',
                fill: 'var(--text-secondary)', 'font-weight': '600',
            });
            t.textContent = TRAITS[i].label;
            svg.appendChild(t);
        });

        // Hover wedge hit-areas + tooltip
        var wrap = svg.parentNode;
        wrap.style.position = 'relative';
        var ttip = document.createElement('div');
        ttip.className = 'ocean-radar-tooltip';
        ttip.style.display = 'none';
        wrap.appendChild(ttip);

        ANGS.forEach(function (a, i) {
            var half = Math.PI / 5;
            var steps = 10;
            var outerR = R * 1.05;
            var wedgePts = [[CX, CY]];
            for (var s = 0; s <= steps; s++) {
                var ang = a - half + (2 * half * s / steps);
                wedgePts.push([
                    CX + Math.cos(ang) * outerR,
                    CY + Math.sin(ang) * outerR,
                ]);
            }
            var wedge = svgEl('polygon', {
                points: wedgePts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '),
                fill: 'transparent', stroke: 'none', 'pointer-events': 'all',
                style: 'cursor: pointer;',
            });

            wedge.addEventListener('mouseenter', function () {
                wedge.setAttribute('fill', 'var(--accent)');
                wedge.setAttribute('fill-opacity', '0.18');
                dots[i].setAttribute('r', '7');
                ttip.innerHTML =
                    '<span class="ocean-radar-tooltip__name">' + TRAITS[i].label + '</span>' +
                    '<span class="ocean-radar-tooltip__score">' + scores[i] + ' / ' + MAX + '</span>' +
                    '<span class="ocean-radar-tooltip__desc">' + TRAITS[i].desc + '</span>';
                ttip.style.display = 'flex';
            });
            wedge.addEventListener('mousemove', function (e) {
                var rect = wrap.getBoundingClientRect();
                var tx = e.clientX - rect.left + 12;
                var ty = e.clientY - rect.top - 14;
                ttip.style.left = tx + 'px';
                ttip.style.top  = ty + 'px';
            });
            wedge.addEventListener('mouseleave', function () {
                wedge.setAttribute('fill', 'transparent');
                dots[i].setAttribute('r', '5');
                ttip.style.display = 'none';
            });
            svg.appendChild(wedge);
        });

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                svg.querySelectorAll('polygon[fill="var(--accent)"], circle[fill="var(--accent)"]').forEach(function (e) {
                    e.style.transform = 'scale(1)';
                });
            });
        });
    }

    function buildFacetHtml(facets) {
        if (!facets || facets.length === 0) return '';
        var html = '<div class="ocean-facets">';
        facets.forEach(function (f) {
            var pct = (f[1] / 20 * 100).toFixed(0);
            html +=
                '<div class="ocean-facet-row">' +
                    '<span class="ocean-facet-row__label">' + f[0] + '</span>' +
                    '<div class="ocean-facet-row__track">' +
                        '<div class="ocean-facet-row__fill" data-width="' + pct + '%"></div>' +
                    '</div>' +
                    '<span class="ocean-facet-row__val">' + f[1] + '<span class="ocean-facet-row__max">/20</span></span>' +
                '</div>';
        });
        html += '</div>';
        return html;
    }

    function renderBars(container, scores, MAX, facetMap) {
        MAX = MAX || 120;
        var html = '';
        TRAITS.forEach(function (t, i) {
            var v = scores[i];
            var pct = (v / MAX * 100).toFixed(1);
            var facets = facetMap ? facetMap[t.key] : null;
            html +=
                '<div class="ocean-bar-row">' +
                    '<div class="ocean-bar-row__header">' +
                        '<span class="ocean-bar-row__label">' + t.label + '</span>' +
                        '<div class="ocean-bar-row__right">' +
                            (facets ? '<button class="ocean-facet-toggle" aria-expanded="false" aria-label="Toggle ' + t.label + ' facets">facets ▸</button>' : '') +
                            '<span class="ocean-bar-row__val">' + v + '<span class="ocean-bar-row__max">/' + MAX + '</span></span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="ocean-bar-row__bg">' +
                        '<div class="ocean-bar-row__fill" data-width="' + pct + '%"></div>' +
                    '</div>' +
                    '<div class="ocean-bar-row__desc">' + t.desc + '</div>' +
                    (facets ? buildFacetHtml(facets) : '') +
                '</div>';
        });
        container.innerHTML = html;

        // Animate main bars
        requestAnimationFrame(function () {
            container.querySelectorAll('.ocean-bar-row__fill').forEach(function (bar) {
                bar.style.width = bar.getAttribute('data-width');
            });
        });

        // Wire toggle buttons
        container.querySelectorAll('.ocean-facet-toggle').forEach(function (btn) {
            var row = btn.closest('.ocean-bar-row');
            var facetEl = row.querySelector('.ocean-facets');
            if (!facetEl) return;

            btn.addEventListener('click', function () {
                var open = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', open ? 'false' : 'true');
                btn.textContent = open ? 'facets ▸' : 'facets ▾';
                if (open) {
                    facetEl.style.maxHeight = facetEl.scrollHeight + 'px';
                    requestAnimationFrame(function () { facetEl.style.maxHeight = '0'; });
                    facetEl.addEventListener('transitionend', function hide() {
                        facetEl.hidden = true;
                        facetEl.removeEventListener('transitionend', hide);
                    });
                } else {
                    facetEl.hidden = false;
                    facetEl.style.maxHeight = '0';
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            facetEl.style.maxHeight = facetEl.scrollHeight + 'px';
                            // Animate fill bars
                            facetEl.querySelectorAll('.ocean-facet-row__fill').forEach(function (b) {
                                b.style.width = b.getAttribute('data-width');
                            });
                        });
                    });
                }
            });

            // Start hidden
            facetEl.hidden = true;
            facetEl.style.maxHeight = '0';
        });
    }

    function escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    fetch('/assets/data/personality.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data) return;
            var MAX = data.score_max || 120;
            var scores = TRAITS.map(function (t) { return data[t.key] || 0; });
            var svg = document.getElementById('ocean-radar');
            var bars = document.getElementById('ocean-bars');
            if (svg) drawRadar(svg, scores, MAX);
            if (bars) renderBars(bars, scores, MAX, data.facets || null);
        })
        .catch(function () {});

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
