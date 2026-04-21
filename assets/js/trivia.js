(function () {
    'use strict';

    var MAX_Q = 10;
    var questions = [];
    var current = 0;
    var score = 0;
    var answered = {};

    // ── Screens ──────────────────────────────────────────────────────────────

    function showScreen(id) {
        var screens = document.querySelectorAll('.trivia-screen');
        for (var i = 0; i < screens.length; i++) screens[i].hidden = true;
        document.getElementById(id).hidden = false;
    }

    // ── HTML helpers ─────────────────────────────────────────────────────────

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

    // ── Shuffle ───────────────────────────────────────────────────────────────

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    // ── HUD updates ──────────────────────────────────────────────────────────

    function updateHud() {
        document.getElementById('trivia-progress').textContent = 'Q ' + (current + 1) + ' / ' + questions.length;
        var scoreEl = document.getElementById('trivia-score-val');
        scoreEl.textContent = score;
        scoreEl.className = 'trivia-hud__score-val' + (score > 0 ? ' trivia-score--pos' : score < 0 ? ' trivia-score--neg' : '');
    }

    // ── Render question ───────────────────────────────────────────────────────

    function renderQuestion() {
        var q = questions[current];

        // Reset card (remove flip)
        var card = document.getElementById('trivia-active-card');
        card.classList.remove('trivia-card--flip');

        document.getElementById('trivia-category').textContent = decodeHtml(q.category || '');
        document.getElementById('trivia-difficulty').textContent = (q.difficulty || '').toUpperCase();
        document.getElementById('trivia-question').textContent = decodeHtml(q.question);

        // Build shuffled answers
        var answers = shuffle([q.correct_answer].concat(q.incorrect_answers || []));
        var container = document.getElementById('trivia-answers');
        container.innerHTML = '';

        answers.forEach(function (ans) {
            var btn = document.createElement('button');
            btn.className = 'trivia-answer-btn';
            btn.textContent = decodeHtml(ans);
            btn.addEventListener('click', function () { handleAnswer(ans, q); });
            container.appendChild(btn);
        });

        updateHud();
    }

    // ── Handle answer ─────────────────────────────────────────────────────────

    function handleAnswer(chosen, q) {
        // Disable all answer buttons
        var btns = document.querySelectorAll('.trivia-answer-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].disabled = true;
            var ans = decodeHtml(btns[i].textContent);
            if (ans === decodeHtml(q.correct_answer)) {
                btns[i].classList.add('trivia-answer-btn--correct');
            } else if (ans === decodeHtml(chosen) && chosen !== q.correct_answer) {
                btns[i].classList.add('trivia-answer-btn--wrong');
            }
        }

        var visitorCorrect = (chosen === q.correct_answer);
        var ownerCorrect = (q.owner_result === 'correct');

        if (visitorCorrect) score++;

        answered[q.id] = visitorCorrect ? 'correct' : 'incorrect';

        // Build reveal text
        var reveal = document.getElementById('trivia-result-reveal');
        reveal.innerHTML = buildReveal(visitorCorrect, ownerCorrect, q.correct_answer);

        // Flip card after short delay
        setTimeout(function () {
            document.getElementById('trivia-active-card').classList.add('trivia-card--flip');
        }, 600);
    }

    function buildReveal(visitorCorrect, ownerCorrect, correctAnswer) {
        var lines = [];

        if (visitorCorrect) {
            lines.push('<div class="trivia-reveal-result trivia-reveal-result--correct">YOU GOT IT ✓</div>');
        } else {
            lines.push('<div class="trivia-reveal-result trivia-reveal-result--wrong">WRONG ✗</div>');
            lines.push('<div class="trivia-reveal-answer">Answer: ' + escapeHtml(decodeHtml(correctAnswer)) + '</div>');
        }

        if (ownerCorrect && visitorCorrect) {
            lines.push('<div class="trivia-reveal-compare trivia-reveal-compare--tie">We both got it right!</div>');
        } else if (!ownerCorrect && !visitorCorrect) {
            lines.push('<div class="trivia-reveal-compare trivia-reveal-compare--tie">We both got it wrong...</div>');
        } else if (visitorCorrect && !ownerCorrect) {
            lines.push('<div class="trivia-reveal-compare trivia-reveal-compare--win">You beat me on this one!</div>');
        } else {
            lines.push('<div class="trivia-reveal-compare trivia-reveal-compare--lose">I got this one right.</div>');
        }

        return lines.join('');
    }

    // ── Next question ─────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        var nextBtn = document.getElementById('trivia-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                current++;
                if (current >= questions.length) {
                    showEndScreen();
                } else {
                    renderQuestion();
                }
            });
        }

        var playAgain = document.getElementById('trivia-play-again');
        if (playAgain) {
            playAgain.addEventListener('click', function () {
                startGame();
            });
        }

        loadQuestions();
    });

    // ── End screen ────────────────────────────────────────────────────────────

    function showEndScreen() {
        var ownerCorrect = questions.filter(function (q) { return q.owner_result === 'correct'; }).length;
        var ownerPct = Math.round((ownerCorrect / questions.length) * 100);
        var visitorPct = Math.round((score / questions.length) * 100);

        var scoresEl = document.getElementById('trivia-end-scores');
        scoresEl.innerHTML =
            '<div class="trivia-end-score-row">' +
            '<span class="trivia-end-score-label">YOU</span>' +
            '<span class="trivia-end-score-val ' + (visitorPct >= ownerPct ? 'trivia-score--pos' : 'trivia-score--neg') + '">' + score + '/' + questions.length + '</span>' +
            '</div>' +
            '<div class="trivia-end-score-row">' +
            '<span class="trivia-end-score-label">ME</span>' +
            '<span class="trivia-end-score-val">' + ownerCorrect + '/' + questions.length + '</span>' +
            '</div>';

        var verdictEl = document.getElementById('trivia-end-verdict');
        var delta = visitorPct - ownerPct;
        if (delta > 10) {
            verdictEl.textContent = 'YOU BEAT ME. WELL PLAYED.';
            verdictEl.className = 'trivia-end__verdict trivia-score--pos';
        } else if (delta < -10) {
            verdictEl.textContent = 'I WIN THIS ROUND.';
            verdictEl.className = 'trivia-end__verdict trivia-score--neg';
        } else {
            verdictEl.textContent = "IT'S A TIE!";
            verdictEl.className = 'trivia-end__verdict';
        }

        showScreen('trivia-screen-end');

        // Notify owner if questions were exhausted (not play-again)
        if (questions.length > 0) {
            fetch('/api/trivia-notify', { method: 'POST' }).catch(function () {});
        }
    }

    // ── Load & start ─────────────────────────────────────────────────────────

    function startGame() {
        current = 0;
        score = 0;
        answered = {};
        shuffle(questions);
        if (questions.length > MAX_Q) questions = questions.slice(0, MAX_Q);
        showScreen('trivia-screen-game');
        renderQuestion();
    }

    function loadQuestions() {
        showScreen('trivia-screen-loading');
        fetch('/api/trivia')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                questions = (data.questions || []).filter(function (q) {
                    return q.question && q.correct_answer;
                });
                if (questions.length === 0) {
                    showScreen('trivia-screen-empty');
                } else {
                    startGame();
                }
            })
            .catch(function () {
                showScreen('trivia-screen-empty');
            });
    }

})();
