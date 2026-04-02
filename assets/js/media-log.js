/* ── Media Log: Circular Wheel + Infinite Canvas ── */
(function () {
    var container = document.getElementById('media-log');
    if (!container) return;

    var items = [];
    var currentView = 'wheel';
    var wheelState = { angle: 0, selectedIndex: 0 };
    var canvasState = { panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0 };

    fetch('/assets/data/media-log.json')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            items = data.filter(function (d) { return d.title !== '[to be placed]'; });
            if (items.length === 0) {
                container.closest('.media-log-section').style.display = 'none';
                return;
            }
            buildUI();
        })
        .catch(function () {});

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function buildUI() {
        container.innerHTML =
            '<div class="media-log-toggle">' +
                '<button class="btn-glass media-log-btn active" data-view="wheel">Wheel</button>' +
                '<button class="btn-glass media-log-btn" data-view="canvas">Canvas</button>' +
            '</div>' +
            '<div class="media-log-viewport">' +
                '<div id="media-wheel" class="media-wheel"></div>' +
                '<div id="media-canvas" class="media-canvas" style="display:none;"></div>' +
            '</div>';

        container.querySelectorAll('.media-log-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchView(btn.getAttribute('data-view'));
            });
        });

        buildWheel();
        buildCanvas();
    }

    function switchView(view) {
        currentView = view;
        container.querySelectorAll('.media-log-btn').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-view') === view);
        });
        document.getElementById('media-wheel').style.display = view === 'wheel' ? '' : 'none';
        document.getElementById('media-canvas').style.display = view === 'canvas' ? '' : 'none';
    }

    /* ── Circular Wheel ── */
    function buildWheel() {
        var wheel = document.getElementById('media-wheel');
        var n = items.length;
        if (n === 0) return;

        var radius = 200;
        var angleStep = (2 * Math.PI) / Math.max(n, 1);

        // Info panel
        var infoPanel = document.createElement('div');
        infoPanel.className = 'media-wheel__info';
        wheel.appendChild(infoPanel);

        // Ring container
        var ring = document.createElement('div');
        ring.className = 'media-wheel__ring';
        wheel.appendChild(ring);

        var dots = [];
        items.forEach(function (item, i) {
            var dot = document.createElement('a');
            dot.className = 'media-wheel__item';
            dot.href = item.url && item.url !== '#' ? item.url : '#';
            if (item.url && item.url !== '#') {
                dot.target = '_blank';
                dot.rel = 'noopener';
            }
            dot.setAttribute('data-index', i);
            dot.innerHTML = '<span class="media-wheel__dot"></span>';
            dot.addEventListener('click', function (e) {
                if (!item.url || item.url === '#') e.preventDefault();
                wheelState.selectedIndex = i;
                wheelState.angle = -i * angleStep;
                updateWheel();
            });
            ring.appendChild(dot);
            dots.push(dot);
        });

        function updateWheel() {
            dots.forEach(function (dot, i) {
                var a = wheelState.angle + i * angleStep;
                var x = Math.sin(a) * radius;
                var y = -Math.cos(a) * radius;
                var scale = 0.6 + 0.4 * ((Math.cos(a) + 1) / 2);
                var opacity = 0.4 + 0.6 * ((Math.cos(a) + 1) / 2);
                dot.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
                dot.style.opacity = opacity;
                dot.style.zIndex = Math.round(scale * 10);
                dot.classList.toggle('media-wheel__item--active', i === wheelState.selectedIndex);
            });

            var sel = items[wheelState.selectedIndex];
            infoPanel.innerHTML =
                '<span class="media-wheel__badge media-wheel__badge--' + esc(sel.type).toLowerCase() + '">' + esc(sel.type) + '</span>' +
                '<div class="media-wheel__title">' + esc(sel.title) + '</div>' +
                (sel.author ? '<div class="media-wheel__author">' + esc(sel.author) + '</div>' : '') +
                '<div class="media-wheel__date">' + esc(sel.date) + '</div>' +
                (sel.note && sel.note !== '[to be placed]' ? '<div class="media-wheel__note">' + esc(sel.note) + '</div>' : '');
        }

        updateWheel();

        // Scroll/wheel to rotate
        wheel.addEventListener('wheel', function (e) {
            e.preventDefault();
            var dir = e.deltaY > 0 ? 1 : -1;
            wheelState.selectedIndex = (wheelState.selectedIndex + dir + n) % n;
            wheelState.angle = -wheelState.selectedIndex * angleStep;
            updateWheel();
        }, { passive: false });

        // Arrow keys
        document.addEventListener('keydown', function (e) {
            if (currentView !== 'wheel') return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                wheelState.selectedIndex = (wheelState.selectedIndex + 1) % n;
                wheelState.angle = -wheelState.selectedIndex * angleStep;
                updateWheel();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                wheelState.selectedIndex = (wheelState.selectedIndex - 1 + n) % n;
                wheelState.angle = -wheelState.selectedIndex * angleStep;
                updateWheel();
            }
        });
    }

    /* ── Infinite Canvas ── */
    function buildCanvas() {
        var canvas = document.getElementById('media-canvas');
        var inner = document.createElement('div');
        inner.className = 'media-canvas__inner';
        canvas.appendChild(inner);

        // Scatter cards in a loose grid
        var cols = Math.ceil(Math.sqrt(items.length));
        items.forEach(function (item, i) {
            var card = document.createElement('a');
            card.className = 'media-canvas__card';
            card.href = item.url && item.url !== '#' ? item.url : '#';
            if (item.url && item.url !== '#') {
                card.target = '_blank';
                card.rel = 'noopener';
            }

            var col = i % cols;
            var row = Math.floor(i / cols);
            var baseX = col * 260 + (Math.random() * 60 - 30);
            var baseY = row * 200 + (Math.random() * 40 - 20);
            var rotate = (Math.random() * 8 - 4).toFixed(1);
            card.style.left = baseX + 'px';
            card.style.top = baseY + 'px';
            card.style.transform = 'rotate(' + rotate + 'deg)';

            card.innerHTML =
                '<span class="media-canvas__badge media-canvas__badge--' + esc(item.type).toLowerCase() + '">' + esc(item.type) + '</span>' +
                '<div class="media-canvas__title">' + esc(item.title) + '</div>' +
                (item.author ? '<div class="media-canvas__author">' + esc(item.author) + '</div>' : '') +
                '<div class="media-canvas__date">' + esc(item.date) + '</div>';
            inner.appendChild(card);
        });

        // Pan with drag
        canvas.addEventListener('mousedown', function (e) {
            if (e.target.closest('.media-canvas__card')) return;
            canvasState.dragging = true;
            canvasState.lastX = e.clientX;
            canvasState.lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', function (e) {
            if (!canvasState.dragging) return;
            var dx = e.clientX - canvasState.lastX;
            var dy = e.clientY - canvasState.lastY;
            canvasState.panX += dx;
            canvasState.panY += dy;
            canvasState.lastX = e.clientX;
            canvasState.lastY = e.clientY;
            inner.style.transform = 'translate(' + canvasState.panX + 'px, ' + canvasState.panY + 'px)';
        });
        window.addEventListener('mouseup', function () {
            canvasState.dragging = false;
            canvas.style.cursor = 'grab';
        });

        // Touch pan
        canvas.addEventListener('touchstart', function (e) {
            if (e.target.closest('.media-canvas__card')) return;
            canvasState.dragging = true;
            canvasState.lastX = e.touches[0].clientX;
            canvasState.lastY = e.touches[0].clientY;
        }, { passive: true });
        canvas.addEventListener('touchmove', function (e) {
            if (!canvasState.dragging) return;
            var dx = e.touches[0].clientX - canvasState.lastX;
            var dy = e.touches[0].clientY - canvasState.lastY;
            canvasState.panX += dx;
            canvasState.panY += dy;
            canvasState.lastX = e.touches[0].clientX;
            canvasState.lastY = e.touches[0].clientY;
            inner.style.transform = 'translate(' + canvasState.panX + 'px, ' + canvasState.panY + 'px)';
        }, { passive: true });
        canvas.addEventListener('touchend', function () {
            canvasState.dragging = false;
        });
    }
})();
