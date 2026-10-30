import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { mergeBlocks, computeAvailability, toPublicResponse, toFriendsResponse } from './availability.js';

const TZ = 'Europe/London';
const base = { tz: TZ, hoursStart: '09:00', hoursEnd: '22:00', minSlotMinutes: 20, roundToMinutes: 15, daysAhead: 3 };

const at = (iso) => DateTime.fromISO(iso, { zone: TZ }).toMillis();
const block = (a, b) => ({ start: at(a), end: at(b) });
const iso = (ms) => DateTime.fromMillis(ms, { zone: TZ }).toFormat("yyyy-MM-dd'T'HH:mm");
const slots = (day) => day.free.map(([a, b]) => [iso(a), iso(b)]);

describe('mergeBlocks', () => {
    it('merges overlapping and touching blocks', () => {
        const merged = mergeBlocks([
            { start: 10, end: 20 },
            { start: 15, end: 30 },
            { start: 30, end: 40 },
            { start: 50, end: 60 },
        ]);
        expect(merged).toEqual([{ start: 10, end: 40 }, { start: 50, end: 60 }]);
    });
});

describe('computeAvailability', () => {
    it('no events: one slot covering call hours', () => {
        const r = computeAvailability({ ...base, busy: [], now: at('2026-06-10T07:00') });
        expect(slots(r.days[0])).toEqual([['2026-06-10T09:00', '2026-06-10T22:00']]);
        expect(r.days).toHaveLength(3);
        expect(r.status).toBe('off');
    });

    it('now mid-day: slot starts at now, rounded up', () => {
        const r = computeAvailability({ ...base, busy: [], now: at('2026-06-10T14:07') });
        expect(slots(r.days[0])).toEqual([['2026-06-10T14:15', '2026-06-10T22:00']]);
        expect(r.status).toBe('free');
    });

    it('overlapping and touching events become one block', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T10:00'),
            busy: [block('2026-06-10T11:00', '2026-06-10T12:00'), block('2026-06-10T11:30', '2026-06-10T13:00'), block('2026-06-10T13:00', '2026-06-10T14:00')],
        });
        expect(slots(r.days[0])).toEqual([
            ['2026-06-10T10:00', '2026-06-10T11:00'],
            ['2026-06-10T14:00', '2026-06-10T22:00'],
        ]);
    });

    it('event crossing midnight blocks both days', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T08:00'),
            busy: [block('2026-06-10T20:00', '2026-06-11T10:30')],
        });
        expect(slots(r.days[0])).toEqual([['2026-06-10T09:00', '2026-06-10T20:00']]);
        expect(slots(r.days[1])).toEqual([['2026-06-11T10:30', '2026-06-11T22:00']]);
    });

    it('drops gaps shorter than the minimum slot', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T08:00'),
            busy: [block('2026-06-10T09:00', '2026-06-10T10:00'), block('2026-06-10T10:15', '2026-06-10T22:00')],
        });
        expect(slots(r.days[0])).toEqual([]);
        expect(slots(r.days[1])).toEqual([['2026-06-11T09:00', '2026-06-11T22:00']]);
    });

    it('rounding can shrink a slot below the minimum and drop it', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T08:00'),
            busy: [block('2026-06-10T09:00', '2026-06-10T10:01'), block('2026-06-10T10:20', '2026-06-10T22:00')],
        });
        expect(slots(r.days[0])).toEqual([]);
    });

    it('now inside an event: busy, with busyUntil and next free', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T11:30'),
            busy: [block('2026-06-10T11:00', '2026-06-10T12:00'), block('2026-06-10T12:00', '2026-06-10T12:30')],
        });
        expect(r.status).toBe('busy');
        expect(iso(r.busyUntil)).toBe('2026-06-10T12:30');
        expect(iso(r.nextFree[0])).toBe('2026-06-10T12:30');
    });

    it('busy block running past call hours reports its real end', () => {
        const r = computeAvailability({
            ...base,
            now: at('2026-06-10T21:00'),
            busy: [block('2026-06-10T20:00', '2026-06-11T11:00')],
        });
        expect(r.status).toBe('busy');
        expect(iso(r.busyUntil)).toBe('2026-06-11T11:00');
        expect(iso(r.nextFree[0])).toBe('2026-06-11T11:00');
    });

    it('before or after call hours: off', () => {
        const early = computeAvailability({ ...base, busy: [], now: at('2026-06-10T06:00') });
        const late = computeAvailability({ ...base, busy: [], now: at('2026-06-10T23:00') });
        expect(early.status).toBe('off');
        expect(late.status).toBe('off');
        expect(iso(early.nextFree[0])).toBe('2026-06-10T09:00');
        expect(iso(late.nextFree[0])).toBe('2026-06-11T09:00');
    });

    it('spring-forward day (2026-03-29) keeps 09:00-22:00 local boundaries', () => {
        const r = computeAvailability({ ...base, busy: [], now: at('2026-03-28T23:30') });
        const [a, b] = r.days[1].free[0];
        expect(r.days[1].date).toBe('2026-03-29');
        expect(iso(a)).toBe('2026-03-29T09:00');
        expect(iso(b)).toBe('2026-03-29T22:00');
        expect((b - a) / 3600000).toBe(13); // wall-clock 13h; no hour is lost inside 09-22 window
        expect(DateTime.fromMillis(a, { zone: TZ }).offset).toBe(60);
    });

    it('fall-back day (2026-10-25) keeps 09:00-22:00 local boundaries', () => {
        const r = computeAvailability({ ...base, busy: [], now: at('2026-10-24T23:30') });
        const [a, b] = r.days[1].free[0];
        expect(r.days[1].date).toBe('2026-10-25');
        expect(iso(a)).toBe('2026-10-25T09:00');
        expect(iso(b)).toBe('2026-10-25T22:00');
        expect((b - a) / 3600000).toBe(13);
        expect(DateTime.fromMillis(a, { zone: TZ }).offset).toBe(0);
    });
});

describe('response shapes', () => {
    const now = at('2026-06-10T14:07');
    const result = computeAvailability({ ...base, busy: [], now });
    const meta = { name: 'Vaishnavi', ownerTz: TZ, now };

    it('public response never contains days', () => {
        const pub = toPublicResponse(result, meta);
        expect(pub).not.toHaveProperty('days');
        expect(pub.detail).toBe('status');
        expect(pub.status).toBe('free');
        expect(Array.isArray(pub.nextFree)).toBe(true);
        expect(typeof pub.nextFree[0]).toBe('string');
    });

    it('friends response adds days', () => {
        const f = toFriendsResponse(result, meta);
        expect(f.detail).toBe('full');
        expect(f.days).toHaveLength(3);
        expect(f.days[0].date).toBe('2026-06-10');
        expect(typeof f.days[0].free[0][0]).toBe('string');
    });
});
