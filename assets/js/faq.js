/* ── Blur FAQ ── */
(function () {
    var container = document.getElementById('faq-list');
    if (!container) return;

    fetch('/assets/data/faq.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { render(data); })
        .catch(function () {
            container.innerHTML = '<p style="color:var(--text-secondary)">Could not load FAQ.</p>';
        });

    function render(items) {
        if (!items || items.length === 0) return;

        var html = '';
        items.forEach(function (f, i) {
            html += '<div class="faq-item" data-idx="' + i + '">' +
                '<button class="faq-question">' + esc(f.question) + '</button>' +
                '<div class="faq-answer">' +
                    '<div class="faq-answer__inner">' + esc(f.answer) + '</div>' +
                '</div>' +
                '</div>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.faq-question').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.faq-item');
                var isOpen = item.classList.contains('faq-item--open');

                // Close all
                container.querySelectorAll('.faq-item').forEach(function (el) {
                    el.classList.remove('faq-item--open');
                    el.classList.remove('faq-item--dimmed');
                });

                if (!isOpen) {
                    item.classList.add('faq-item--open');
                    // Dim others
                    container.querySelectorAll('.faq-item').forEach(function (el) {
                        if (el !== item) el.classList.add('faq-item--dimmed');
                    });
                }
            });
        });
    }

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
})();
