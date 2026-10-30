// Local preview of /call with a mocked calendar. Run `node build.cjs` first.
//   node scripts/call-dev-server.js            -> http://localhost:8123/call
//   curl localhost:8123/__state?s=busy         -> switch state: free | busy | off | fail
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHandler } from '../api/availability.js';

const SITE = path.resolve(import.meta.dirname, '../_site');
const PORT = process.env.PORT || 8123;
const env = {
    OWNER_TZ: 'Europe/London', FRIENDS_KEY: 'demo', OWNER_NAME: 'Vaishnavi',
    WHATSAPP_NUMBER: '6598533395', MEET_URL: 'https://meet.google.com/abc-defg-hij',
    DISCORD_USER_ID: '123456789012345678', BOOKING_URL: 'https://calendar.app.google/yNj5qs4AuKKmZwZQ7',
};
const L = (iso) => Date.parse(iso);
const states = {
    free: { now: L('2026-06-10T13:07:00Z'), busy: [{ start: L('2026-06-10T15:00:00Z'), end: L('2026-06-10T16:30:00Z') }, { start: L('2026-06-11T10:00:00Z'), end: L('2026-06-11T12:00:00Z') }] },
    busy: { now: L('2026-06-10T13:07:00Z'), busy: [{ start: L('2026-06-10T12:30:00Z'), end: L('2026-06-10T15:30:00Z') }, { start: L('2026-06-11T10:00:00Z'), end: L('2026-06-11T12:00:00Z') }] },
    off: { now: L('2026-06-10T23:30:00Z'), busy: [{ start: L('2026-06-11T10:00:00Z'), end: L('2026-06-11T12:00:00Z') }] },
};
let state = 'free';
const handler = createHandler({
    env,
    now: () => states[state === 'fail' ? 'free' : state].now,
    getBusyBlocks: async () => { if (state === 'fail') throw new Error('mock failure'); return states[state].busy; },
});
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__state') { state = url.searchParams.get('s'); return res.end(state); }
    if (url.pathname === '/api/availability') {
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); };
        res.send = (b) => res.end(b);
        return handler(req, res);
    }
    let p = url.pathname === '/call' ? '/call.html' : url.pathname;
    const file = path.join(SITE, p);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`call dev server on http://localhost:${PORT}/call`));
