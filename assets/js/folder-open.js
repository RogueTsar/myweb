/* ── Folder Open / Close interaction ──
   Lid lifts with 3D hinge rotation to reveal contents.
   ──────────────────────────────────── */
(function () {
    'use strict';

    var folder = document.getElementById('about-folder');
    if (!folder) return;

    var lid = document.getElementById('folder-lid');
    var body = document.getElementById('folder-body');
    var closeBtn = document.getElementById('folder-close');

    function open() {
        folder.classList.add('folder--open');
        lid.setAttribute('aria-expanded', 'true');
    }

    function close() {
        folder.classList.remove('folder--open');
        lid.setAttribute('aria-expanded', 'false');
    }

    lid.addEventListener('click', function () {
        if (folder.classList.contains('folder--open')) {
            close();
        } else {
            open();
        }
    });

    lid.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            lid.click();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            close();
        });
    }
})();
