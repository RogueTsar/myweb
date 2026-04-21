(function () {
    'use strict';

    var SECRET_KEY = 'trivia_admin_secret';
    var OPENTDB_URL = 'https://opentdb.com/api.php?amount=1&type=multiple';
    var currentQuestion = null;
    var totalCount = 0;

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function decodeHtml(s) {
        var t = document.createElement('textarea');
        t.innerHTML = s;
        return t.value;
    }

    function showScreen(id) {
        var screens = document.querySelectorAll('.trivia-screen');
        for (var i = 0; i < screens.length; i++) screens[i].hidden = true;
        document.getElementById(id).hidden = false;
    }

    function getSecret() {
        return localStorage.getItem(SECRET_KEY) || '';
    }

    function setSecret(s) {
        localStorage.setItem(SECRET_KEY, s);
    }

    function updateCount(n) {
        totalCount = n;
        var el = document.getElementById('admin-count');
        if (el) el.textContent = n;
        var status = document.getElementById('admin-status');
        if (status) status.hidden = false;
    }

    // ── Fetch current count ───────────────────────────────────────────────────

    function fetchCount() {
        fetch('/api/trivia')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                updateCount((data.questions || []).length);
            })
            .catch(function () {});
    }

    // ── Fetch one OpenTDB question ────────────────────────────────────────────

    function fetchQuestion() {
        showScreen('admin-screen-loading');
        setTimeout(function () {
            fetch(OPENTDB_URL)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (!data.results || !data.results[0]) {
                        setTimeout(fetchQuestion, 5500);
                        return;
                    }
                    currentQuestion = data.results[0];
                    renderQuestion();
                    showScreen('admin-screen-question');
                })
                .catch(function () {
                    setTimeout(fetchQuestion, 5500);
                });
        }, 1000); // Respect OpenTDB 5s rate limit with 1s gap on admin side
    }

    function renderQuestion() {
        var q = currentQuestion;
        document.getElementById('admin-difficulty').textContent = (q.difficulty || '').toUpperCase();
        document.getElementById('admin-category').textContent = decodeHtml(q.category || '');
        document.getElementById('admin-question').textContent = decodeHtml(q.question);

        var revealEl = document.getElementById('admin-answer-reveal');
        revealEl.innerHTML = '<div class="trivia-admin-correct-ans">Correct answer: <strong>' + escapeHtml(decodeHtml(q.correct_answer)) + '</strong></div>';
    }

    // ── Submit result ─────────────────────────────────────────────────────────

    function submitResult(ownerResult) {
        var secret = getSecret();
        if (!secret) {
            alert('Please save your admin secret first.');
            return;
        }

        var q = currentQuestion;
        var payload = {
            secret: secret,
            question_obj: {
                question: decodeHtml(q.question),
                correct_answer: decodeHtml(q.correct_answer),
                incorrect_answers: (q.incorrect_answers || []).map(decodeHtml),
                category: decodeHtml(q.category || ''),
                difficulty: q.difficulty || 'medium',
                type: q.type || 'multiple',
            },
            owner_result: ownerResult,
        };

        fetch('/api/trivia-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.total !== undefined) updateCount(data.total);
                showScreen('admin-screen-done');
            })
            .catch(function () {
                alert('Save failed. Check the console.');
            });
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        // Pre-fill secret if saved
        var saved = getSecret();
        var input = document.getElementById('admin-secret-input');
        if (saved && input) input.value = saved;

        var saveBtn = document.getElementById('admin-secret-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var val = input.value.trim();
                if (val) {
                    setSecret(val);
                    saveBtn.textContent = 'SAVED ✓';
                    setTimeout(function () { saveBtn.textContent = 'SAVE ▶'; }, 1500);
                }
            });
        }

        var correctBtn = document.getElementById('admin-btn-correct');
        var wrongBtn = document.getElementById('admin-btn-wrong');
        if (correctBtn) correctBtn.addEventListener('click', function () { submitResult('correct'); });
        if (wrongBtn) wrongBtn.addEventListener('click', function () { submitResult('incorrect'); });

        var nextBtn = document.getElementById('admin-btn-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                currentQuestion = null;
                fetchQuestion();
            });
        }

        fetchCount();
        fetchQuestion();
    });

})();
