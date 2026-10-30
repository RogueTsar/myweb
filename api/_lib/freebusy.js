import { JWT } from 'google-auth-library';

// Data source: Google Calendar free/busy only. Google never returns titles,
// guests or locations from this endpoint, and the scope can't read them either.
export function createGoogleSource(env = process.env) {
    let client;

    function getClient() {
        if (client) return client;
        const creds = JSON.parse(Buffer.from(env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8'));
        client = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/calendar.freebusy'],
        });
        return client;
    }

    // getBusyBlocks(startMs, endMs) -> [{ start, end }] in epoch ms
    return async function getBusyBlocks(start, end) {
        const ids = (env.CALENDAR_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const { token } = await getClient().getAccessToken();
        const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timeMin: new Date(start).toISOString(),
                timeMax: new Date(end).toISOString(),
                items: ids.map(id => ({ id })),
            }),
        });
        if (!r.ok) throw new Error(`freeBusy ${r.status}`);
        const data = await r.json();
        const blocks = [];
        for (const id of ids) {
            const cal = data.calendars?.[id];
            if (!cal || cal.errors?.length) throw new Error(`freeBusy calendar error for ${id}`);
            for (const b of cal.busy || []) blocks.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
        }
        return blocks;
    };
}
