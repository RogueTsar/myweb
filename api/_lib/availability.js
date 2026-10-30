import { DateTime } from 'luxon';

const MIN = 60000;

export function mergeBlocks(blocks) {
    const sorted = blocks
        .filter(b => b.end > b.start)
        .map(b => ({ start: b.start, end: b.end }))
        .sort((a, b) => a.start - b.start);
    const merged = [];
    for (const b of sorted) {
        const last = merged[merged.length - 1];
        if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
        else merged.push(b);
    }
    return merged;
}

function parseHM(hm) {
    const [hour, minute] = hm.split(':').map(Number);
    return { hour, minute: minute || 0 };
}

function dayWindow(day, hoursStart, hoursEnd) {
    return {
        start: day.set({ ...parseHM(hoursStart), second: 0, millisecond: 0 }).toMillis(),
        end: day.set({ ...parseHM(hoursEnd), second: 0, millisecond: 0 }).toMillis(),
    };
}

// Round up to the next step boundary of the local clock
function roundUp(ms, tz, stepMinutes) {
    const dt = DateTime.fromMillis(ms, { zone: tz });
    const intoHour = dt.minute * MIN + dt.second * 1000 + dt.millisecond;
    const rem = intoHour % (stepMinutes * MIN);
    return rem === 0 ? ms : ms + stepMinutes * MIN - rem;
}

function subtract(window, merged) {
    const gaps = [];
    let cursor = window.start;
    for (const b of merged) {
        if (b.end <= cursor) continue;
        if (b.start >= window.end) break;
        if (b.start > cursor) gaps.push([cursor, b.start]);
        cursor = Math.max(cursor, b.end);
    }
    if (cursor < window.end) gaps.push([cursor, window.end]);
    return gaps;
}

export function computeAvailability({ busy, now, tz, hoursStart, hoursEnd, minSlotMinutes, roundToMinutes, daysAhead }) {
    const merged = mergeBlocks(busy);
    const today = DateTime.fromMillis(now, { zone: tz }).startOf('day');

    const days = [];
    for (let i = 0; i < daysAhead; i++) {
        const day = today.plus({ days: i });
        const win = dayWindow(day, hoursStart, hoursEnd);
        if (i === 0 && now > win.start) win.start = now;

        const free = [];
        if (win.start < win.end) {
            for (const [a, b] of subtract(win, merged)) {
                const start = roundUp(a, tz, roundToMinutes);
                if (b - start >= minSlotMinutes * MIN) free.push([start, b]);
            }
        }
        days.push({ date: day.toISODate(), free });
    }

    const current = merged.find(b => b.start <= now && now < b.end);
    const todayWin = dayWindow(today, hoursStart, hoursEnd);
    let status = 'free';
    if (current) status = 'busy';
    else if (now < todayWin.start || now >= todayWin.end) status = 'off';

    const nextFree = days.flatMap(d => d.free)[0] || null;
    return { status, busyUntil: current ? current.end : null, nextFree, days };
}

const toISO = ms => new Date(ms).toISOString();

export function toPublicResponse(result, { name, ownerTz, now }) {
    return {
        name,
        ownerTz,
        status: result.status,
        busyUntil: result.busyUntil ? toISO(result.busyUntil) : null,
        nextFree: result.nextFree ? result.nextFree.map(toISO) : null,
        updated: toISO(now),
        detail: 'status',
    };
}

export function toFriendsResponse(result, meta) {
    return {
        ...toPublicResponse(result, meta),
        detail: 'full',
        days: result.days.map(d => ({ date: d.date, free: d.free.map(s => s.map(toISO)) })),
    };
}

// One-line summary for automations, e.g. "Busy until 4:30pm. Free today: 4:30pm to 6pm (GMT)."
export function toText(result, { ownerTz, now }) {
    const fmt = ms => DateTime.fromMillis(ms, { zone: ownerTz }).toFormat('h:mma').toLowerCase().replace(':00', '');
    const zone = DateTime.fromMillis(now, { zone: ownerTz, locale: 'en-GB' }).toFormat('ZZZZ');
    const lead = result.status === 'busy' ? `Busy until ${fmt(result.busyUntil)}.`
        : result.status === 'off' ? 'Outside call hours.'
        : 'Free now.';
    const today = result.days[0]?.free || [];
    const windows = today.length ? today.map(([a, b]) => `${fmt(a)} to ${fmt(b)}`).join(', ') : 'nothing';
    return `${lead} Free today: ${windows} (${zone}).`;
}
