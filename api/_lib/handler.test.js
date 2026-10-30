import { describe, it, expect, vi } from 'vitest';
import { createHandler } from '../availability.js';

const env = {
    OWNER_TZ: 'Europe/London',
    FRIENDS_KEY: 'secret-key',
    WHATSAPP_NUMBER: '6598533395',
};
const NOW = Date.parse('2026-06-10T13:07:00Z'); // 14:07 London

function call(handler, { url = '/api/availability', headers = {} } = {}) {
    return new Promise(async (resolve) => {
        const res = {
            headers: {},
            statusCode: 200,
            setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
            status(c) { this.statusCode = c; return this; },
            json(b) { resolve({ status: this.statusCode, headers: this.headers, body: b }); },
            send(b) { resolve({ status: this.statusCode, headers: this.headers, body: b }); },
            end() { resolve({ status: this.statusCode, headers: this.headers, body: null }); },
        };
        await handler({ url, headers }, res);
    });
}

const make = (source) => createHandler({ getBusyBlocks: source, now: () => NOW, env });
const noEvents = async () => [];

describe('/api/availability', () => {
    it('returns the public shape without a key, cached publicly', async () => {
        const r = await call(make(noEvents));
        expect(r.status).toBe(200);
        expect(r.body.detail).toBe('status');
        expect(r.body).not.toHaveProperty('days');
        expect(r.body.status).toBe('free');
        expect(r.headers['cache-control']).toContain('s-maxage=60');
        expect(r.body.contact.whatsapp).toBe('6598533395');
    });

    it('returns the friends shape with the right key, not cached', async () => {
        const r = await call(make(noEvents), { url: '/api/availability?k=secret-key' });
        expect(r.body.detail).toBe('full');
        expect(r.body.days).toHaveLength(3);
        expect(r.headers['cache-control']).toBe('private, no-store');
    });

    it('accepts the key in the x-friends-key header', async () => {
        const r = await call(make(noEvents), { headers: { 'x-friends-key': 'secret-key' } });
        expect(r.body.detail).toBe('full');
    });

    it('falls back to the public view on a wrong key', async () => {
        const r = await call(make(noEvents), { url: '/api/availability?k=nope' });
        expect(r.status).toBe(200);
        expect(r.body.detail).toBe('status');
        expect(r.body).not.toHaveProperty('days');
    });

    it('never unlocks when FRIENDS_KEY is unset', async () => {
        const h = createHandler({ getBusyBlocks: noEvents, now: () => NOW, env: { ...env, FRIENDS_KEY: '' } });
        const r = await call(h, { url: '/api/availability?k=' });
        expect(r.body.detail).toBe('status');
    });

    it('reports busy with busyUntil', async () => {
        const src = async () => [{ start: Date.parse('2026-06-10T12:00:00Z'), end: Date.parse('2026-06-10T14:00:00Z') }];
        const r = await call(make(src));
        expect(r.body.status).toBe('busy');
        expect(r.body.busyUntil).toBe('2026-06-10T14:00:00.000Z');
    });

    it('returns 503 when the data source fails', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const r = await call(make(async () => { throw new Error('boom'); }));
        expect(r.status).toBe(503);
        expect(r.body.error).toBe('unavailable');
        expect(r.body.contact.whatsapp).toBe('6598533395');
        expect(r.body).not.toHaveProperty('days');
        spy.mockRestore();
    });

    it('text format needs a valid key, otherwise 404', async () => {
        const denied = await call(make(noEvents), { url: '/api/availability?format=text' });
        expect(denied.status).toBe(404);
        const wrong = await call(make(noEvents), { url: '/api/availability?format=text&k=nope' });
        expect(wrong.status).toBe(404);
        const ok = await call(make(noEvents), { url: '/api/availability?format=text&k=secret-key' });
        expect(ok.status).toBe(200);
        expect(ok.body).toMatch(/^Free now\. Free today: 2:15pm to 10pm \(BST\)\.$/);
    });
});
