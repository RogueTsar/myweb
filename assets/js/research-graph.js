/* ── Research Interest Graph ── */
(function () {
    var container = document.getElementById('research-graph');
    if (!container) return;

    fetch('/assets/data/research-interests.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { render(data); })
        .catch(function () {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem">Could not load research graph.</p>';
        });

    function render(data) {
        var nodes = data.nodes || [];
        var edges = data.edges || [];
        if (nodes.length === 0) return;

        // Position nodes in a circle
        var w = container.clientWidth || 600;
        var h = Math.max(300, Math.min(w * 0.6, 400));
        var cx = w / 2;
        var cy = h / 2;
        var radius = Math.min(cx, cy) - 60;

        var positions = {};
        nodes.forEach(function (n, i) {
            var angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            positions[n.id] = {
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle)
            };
        });

        // Build SVG
        var svg = '<svg width="' + w + '" height="' + h + '" style="display:block;margin:0 auto">';

        // Edges
        edges.forEach(function (e) {
            var from = positions[e.source];
            var to = positions[e.target];
            if (from && to) {
                svg += '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="var(--border)" stroke-width="1" opacity="0.5"/>';
            }
        });

        // Nodes
        nodes.forEach(function (n) {
            var p = positions[n.id];
            var isPlaceholder = n.description === '[to be placed]';
            svg += '<g class="graph-node" data-id="' + n.id + '" style="cursor:pointer">';
            svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="8" fill="var(--accent)" opacity="0.8">';
            svg += '<animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite"/>';
            svg += '</circle>';
            svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="16" fill="var(--accent)" opacity="0.1"/>';

            // Label
            var labelY = p.y > cy ? p.y + 24 : p.y - 16;
            svg += '<text x="' + p.x + '" y="' + labelY + '" text-anchor="middle" fill="var(--text)" font-size="11" font-weight="400">' + escapeXml(n.label) + '</text>';
            svg += '</g>';
        });

        svg += '</svg>';
        container.innerHTML = svg;

        // Click handlers
        container.querySelectorAll('.graph-node').forEach(function (g) {
            g.addEventListener('click', function () {
                var id = g.getAttribute('data-id');
                var node = nodes.find(function (n) { return n.id === id; });
                if (node && node.link) {
                    if (node.linkType === 'external') {
                        window.open(node.link, '_blank');
                    } else {
                        window.location.href = node.link;
                    }
                }
            });
        });
    }

    function escapeXml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
