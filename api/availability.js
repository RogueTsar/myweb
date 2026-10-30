import { createHash, timingSafeEqual } from 'node:crypto';
import { DateTime } from 'luxon';
import { computeAvailability, toPublicResponse, toFriendsResponse, toText } from './_lib/availability.js';
import { createGoogleSource } from './_lib/freebusy.js';

function safeEqual(a, b) {
    const ha = createHash('sha256').update(String(a)).digest();
    const hb = createHash('sha256').update(String(b)).digest();
    return timingSafeEqual(ha, hb);
}

function readConfig(env) {
    return {
        name: env.OWNER_NAME || 'Vaishnavi',
        tz: env.OWNER_TZ || 'Europe/London',
        hoursStart: env.CALL_HOURS_START || '09:00',
        hoursEnd: env.CALL_HOURS_END || '22:00',
        minSlotMinutes: Number(env.MIN_SLOT_MINUTES || 20),
        roundToMinutes: Number(env.ROUND_TO_MINUTES || 15),
        daysAhead: Number(env.DAYS_AHEAD || 3),
        friendsKey: env.FRIENDS_KEY || '',
        contact: {
            whatsapp: env.WHATSAPP_NUMBER || null,
            discordUserId: env.DISCORD_USER_ID || null,
            meetUrl: env.MEET_URL || null,
            bookingUrl: env.BOOKING_URL || null,
        },
    };
}

export function createHandler({ getBusyBlocks, now = () => Date.now(), env = process.env } = {}) {
    const source = getBusyBlocks || createGoogleSource(env);

    return async function handler(req, res) {
        const cfg = readConfig(env);
        const url = new URL(req.url, 'http://localhost');
        const supplied = url.searchParams.get('k') || req.headers['x-friends-key'] || '';
        const isFriend = Boolean(cfg.friendsKey) && Boolean(supplied) && safeEqual(supplied, cfg.friendsKey);
        const wantsText = url.searchParams.get('format') === 'text';

        if (wantsText && !isFriend) return res.status(404).end();

        const t = now();
        const dayStart = DateTime.fromMillis(t, { zone: cfg.tz }).startOf('day');
        const horizon = dayStart.plus({ days: cfg.daysAhead }).toMillis();

        let busy;
        try {
            busy = await source(dayStart.toMillis(), horizon);
        } catch (err) {
            console.error('availability source error:', err.message);
            res.setHeader('Cache-Control', 'no-store');
            return res.status(503).json({ error: 'unavailable', contact: cfg.contact });
        }

        const result = computeAvailability({ ...cfg, busy, now: t });
        const meta = { name: cfg.name, ownerTz: cfg.tz, now: t };

        if (wantsText) {
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(toText(result, meta));
        }

        res.setHeader('Cache-Control', isFriend
            ? 'private, no-store'
            : 'public, s-maxage=60, stale-while-revalidate=300');
        const body = isFriend ? toFriendsResponse(result, meta) : toPublicResponse(result, meta);
        return res.status(200).json({ ...body, contact: cfg.contact });
    };
}

export default createHandler();
