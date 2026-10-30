(function () {
    'use strict';

    var REFRESH_MS = 2 * 60 * 1000;
    var STEP_MS = 15 * 60 * 1000;
    var CALL_LENGTH_MS = 30 * 60 * 1000;

    var params = new URLSearchParams(location.search);
    var key = params.get('k');
    var viewerTz = resolveViewerTz();
    var data = null;

    var el = {
        dot: document.getElementById('call-dot'),
        title: document.getElementById('call-title'),
        sub: document.getElementById('call-sub'),
        tz: document.getElementById('call-tz'),
        actions: document.getElementById('call-actions'),
        days: document.getElementById('call-days'),
        sheet: document.getElementById('call-sheet'),
        sheetDay: document.getElementById('call-sheet-day'),
        sheetStart: document.getElementById('call-sheet-start'),
        sheetPreview: document.getElementById('call-sheet-preview'),
        sheetActions: document.getElementById('call-sheet-actions'),
    };

    // ?tz= lets friends (and me) preview the page in another zone
    function resolveViewerTz() {
        var detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var override = params.get('tz');
        if (!override) return detected;
        try { Intl.DateTimeFormat(undefined, { timeZone: override }); return override; }
        catch (e) { return detected; }
    }

    // ── Formatting ──

    function fmtTime(ms, tz) {
        return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(ms);
    }

    function fmtWeekday(ms, tz) {
        return new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: tz }).format(ms);
    }

    // End time, with "+1" when it lands on the next calendar day in that zone
    function fmtEnd(start, end, tz) {
        var dayOf = function (ms) { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(ms); };
        return fmtTime(end, tz) + (dayOf(end) !== dayOf(start) ? ' +1' : '');
    }

    function cityOf(tz) {
        return tz.split('/').pop().replace(/_/g, ' ');
    }

    function sameZone() {
        return viewerTz === data.ownerTz;
    }

    // "4:30 PM" if zones match, else "4:30 PM London time (11:30 PM your time)"
    function dual(ms) {
        if (sameZone()) return fmtTime(ms, data.ownerTz);
        return fmtTime(ms, data.ownerTz) + ' ' + cityOf(data.ownerTz) + ' time (' + fmtTime(ms, viewerTz) + ' your time)';
    }

    function waText(ms, withWeekday) {
        var first = data.name;
        if (ms == null) return 'Hi ' + first + '! Can we find a time for a call?';
        var when = sameZone()
            ? fmtTime(ms, data.ownerTz) + ' your time'
            : fmtTime(ms, data.ownerTz) + ' your time (' + fmtTime(ms, viewerTz) + ' my time)';
        return 'Hi ' + first + '! Can we call at ' + when + (withWeekday ? ' on ' + fmtWeekday(ms, data.ownerTz) : '') + '?';
    }

    function waLink(text) {
        return 'https://wa.me/' + data.contact.whatsapp + '?text=' + encodeURIComponent(text);
    }

    // ── DOM helpers ──

    function make(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function link(href, label, className, hint) {
        var a = make('a', className);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(make('span', null, label));
        if (hint) a.appendChild(make('span', 'call-btn__hint', hint));
        return a;
    }

    // ── Rendering ──

    function renderStatus() {
        var s = data.status;
        el.dot.className = 'call-dot call-dot--' + (s === 'free' ? 'free' : s === 'busy' ? 'busy' : 'off');
        var next = data.nextFree ? Date.parse(data.nextFree[0]) : null;

        if (s === 'free') {
            el.title.textContent = 'Free now';
            el.sub.textContent = data.nextFree ? 'Free until ' + fmtTime(Date.parse(data.nextFree[1]), viewerTz) : '';
        } else if (s === 'busy') {
            el.title.textContent = 'Busy right now';
            var until = Date.parse(data.busyUntil);
            el.sub.textContent = 'Busy until ' + fmtTime(until, viewerTz)
                + (next && next !== until ? ' · next free ' + fmtTime(next, viewerTz) : '');
        } else {
            el.title.textContent = 'Outside call hours';
            el.sub.textContent = next ? 'Next free ' + fmtTime(next, viewerTz) : '';
        }

        el.tz.textContent = sameZone()
            ? 'Times in ' + cityOf(viewerTz)
            : 'Times shown in your zone (' + cityOf(viewerTz) + '). I\'m in ' + cityOf(data.ownerTz) + '.';
    }

    function renderActions() {
        el.actions.textContent = '';
        var c = data.contact;
        var free = data.status === 'free';
        var next = data.nextFree ? Date.parse(data.nextFree[0]) : null;

        if (c.whatsapp) {
            var text = free ? 'Hi ' + data.name + '! Free for a quick call?' : waText(next, false);
            el.actions.appendChild(link(
                waLink(text),
                free ? 'Call me on WhatsApp' : 'Message me on WhatsApp',
                'call-btn call-btn--primary',
                'Opens WhatsApp. Tap the call icon.'
            ));
        }

        if (c.discordUserId) {
            el.actions.appendChild(link('https://discord.com/users/' + c.discordUserId, 'Discord', 'call-btn call-btn--secondary'));
        }

        if (c.meetUrl) {
            if (free) {
                el.actions.appendChild(link(c.meetUrl, 'Join my Google Meet', 'call-btn call-btn--secondary'));
            } else if (data.status === 'busy') {
                var off = make('span', 'call-btn call-btn--secondary call-btn--disabled');
                off.setAttribute('aria-disabled', 'true');
                off.appendChild(make('span', null, 'Google Meet'));
                off.appendChild(make('span', 'call-btn__hint', 'after ' + fmtTime(Date.parse(data.busyUntil), viewerTz)));
                el.actions.appendChild(off);
            }
        }

        if (c.bookingUrl && (!free || data.detail === 'full')) {
            el.actions.appendChild(link(c.bookingUrl, 'Book a time', 'call-btn call-btn--secondary'));
        }
    }

    function dayLabel(date, index) {
        if (index === 0) return 'Today';
        if (index === 1) return 'Tomorrow';
        var d = new Date(date + 'T12:00:00Z');
        return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
    }

    function renderDays() {
        if (data.detail !== 'full' || !data.days) { el.days.hidden = true; return; }
        el.days.textContent = '';
        el.days.hidden = false;

        data.days.forEach(function (day, i) {
            var section = make('section', 'call-day');
            section.appendChild(make('h3', 'call-day__title', dayLabel(day.date, i)));
            if (!day.free.length) {
                section.appendChild(make('p', 'call-day__none', 'Nothing free'));
            } else {
                var list = make('div', 'call-day__slots');
                day.free.forEach(function (slot) {
                    var start = Date.parse(slot[0]);
                    var end = Date.parse(slot[1]);
                    var btn = make('button', 'call-slot');
                    btn.type = 'button';
                    btn.appendChild(document.createTextNode(fmtTime(start, viewerTz) + ' – ' + fmtEnd(start, end, viewerTz)));
                    if (!sameZone()) btn.appendChild(make('small', null, fmtTime(start, data.ownerTz) + ' – ' + fmtEnd(start, end, data.ownerTz) + ' ' + cityOf(data.ownerTz)));
                    btn.addEventListener('click', function () { openSheet(dayLabel(day.date, i), start, end); });
                    list.appendChild(btn);
                });
                section.appendChild(list);
            }
            el.days.appendChild(section);
        });
    }

    function renderError(failed) {
        el.dot.className = 'call-dot call-dot--off';
        el.title.textContent = 'Can\'t check right now';
        el.sub.textContent = 'Message me on WhatsApp.';
        el.tz.textContent = '';
        el.days.hidden = true;
        el.actions.textContent = '';
        var wa = failed && failed.contact && failed.contact.whatsapp;
        if (wa) {
            el.actions.appendChild(link('https://wa.me/' + wa + '?text=' + encodeURIComponent('Hi! Free for a quick call?'),
                'Message me on WhatsApp', 'call-btn call-btn--primary', 'Opens WhatsApp. Tap the call icon.'));
        }
    }

    // ── Time picker sheet (friends view) ──

    function openSheet(label, winStart, winEnd) {
        el.sheetDay.textContent = label + ' · ' + fmtWeekday(winStart, data.ownerTz);
        el.sheetStart.textContent = '';
        for (var t = winStart; t + STEP_MS <= winEnd; t += STEP_MS) {
            var opt = make('option', null, fmtTime(t, viewerTz) + (sameZone() ? '' : ' (' + fmtTime(t, data.ownerTz) + ' ' + cityOf(data.ownerTz) + ')'));
            opt.value = String(t);
            el.sheetStart.appendChild(opt);
        }
        el.sheetStart.onchange = function () { renderSheetActions(winEnd); };
        renderSheetActions(winEnd);
        el.sheet.showModal();
    }

    function gcalStamp(ms) {
        return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    function renderSheetActions(winEnd) {
        var start = Number(el.sheetStart.value);
        var end = Math.min(start + CALL_LENGTH_MS, winEnd);
        el.sheetPreview.textContent = dual(start);
        el.sheetActions.textContent = '';

        if (data.contact.whatsapp) {
            el.sheetActions.appendChild(link(waLink(waText(start, true)), 'Ask on WhatsApp', 'call-btn call-btn--primary', 'I\'ll confirm there.'));
        }
        if (data.contact.meetUrl) {
            var cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
                + '&text=' + encodeURIComponent('Call with ' + data.name)
                + '&dates=' + gcalStamp(start) + '/' + gcalStamp(end)
                + '&location=' + encodeURIComponent(data.contact.meetUrl)
                + '&details=' + encodeURIComponent('Pending confirmation on WhatsApp.');
            el.sheetActions.appendChild(link(cal, 'Add to my calendar', 'call-btn call-btn--secondary'));
        }
    }

    // ── Data ──

    function load() {
        var url = '/api/availability' + (key ? '?k=' + encodeURIComponent(key) : '');
        return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (json) { return { ok: r.ok, json: json }; }); })
            .then(function (res) {
                if (!res.ok) return renderError(res.json);
                data = res.json;
                renderStatus();
                renderActions();
                renderDays();
            })
            .catch(function () { renderError(null); });
    }

    load();
    setInterval(function () { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') load(); });
})();
