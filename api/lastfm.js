const BASE = 'https://ws.audioscrobbler.com/2.0/';

const TAG_SKIP = new Set([
    'seen live','favourites','favourite','my favourite','good','love','awesome',
    'cool','beautiful','amazing','great','under 2000 listeners','best','classic',
    'all time favorites','loved','epic','perfect','nice','excellent','favorites',
]);

async function lfm(method, params, apiKey) {
    const url = new URL(BASE);
    url.searchParams.set('method', method);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data;
}

function toArr(x) {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const { LASTFM_API_KEY, LASTFM_USERNAME } = process.env;
    if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
        return res.status(503).json({ error: 'Last.fm not configured (set LASTFM_API_KEY and LASTFM_USERNAME)' });
    }

    try {
        // Fetch user top tags + weekly chart list in parallel
        const [tagsData, chartListData] = await Promise.all([
            lfm('user.getTopTags', { user: LASTFM_USERNAME, limit: 100 }, LASTFM_API_KEY),
            lfm('user.getWeeklyChartList', { user: LASTFM_USERNAME }, LASTFM_API_KEY),
        ]);

        // User genre landscape from scrobble tags
        const user_top_tags = toArr(tagsData?.toptags?.tag)
            .filter(t => parseInt(t.count || 0) > 0 && !TAG_SKIP.has((t.name || '').toLowerCase()))
            .slice(0, 80)
            .map(t => ({ name: (t.name || '').toLowerCase(), count: parseInt(t.count) }));

        // Group weekly charts into calendar months, skip current partial month
        const now = new Date();
        const byMonth = {};
        for (const c of toArr(chartListData?.weeklychartlist?.chart)) {
            const d = new Date(parseInt(c.from) * 1000);
            const isCurrent = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            if (isCurrent) continue;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(c);
        }

        // Take the 6 most recent complete months
        const targetMonths = Object.keys(byMonth).sort().slice(-6);

        // For each month fetch the most recent complete week (representative snapshot).
        // Two calls per month: track chart + artist chart → 12 calls total.
        const monthly_history = await Promise.all(targetMonths.map(async (month) => {
            const weeks = byMonth[month].sort((a, b) => parseInt(b.from) - parseInt(a.from));
            const w = weeks[0];

            const [trackChart, artistChart] = await Promise.all([
                lfm('user.getWeeklyTrackChart',  { user: LASTFM_USERNAME, from: w.from, to: w.to }, LASTFM_API_KEY),
                lfm('user.getWeeklyArtistChart', { user: LASTFM_USERNAME, from: w.from, to: w.to }, LASTFM_API_KEY),
            ]);

            const top_tracks = toArr(trackChart?.weeklytrackchart?.track).slice(0, 20).map((t, i) => ({
                rank: i + 1,
                name:   t.name || '',
                artist: t.artist?.['#text'] || (typeof t.artist === 'string' ? t.artist : ''),
                genres: [],
                est_plays:    parseInt(t.playcount || 0),
                recent_plays: 0,
            }));

            const top_artists = toArr(artistChart?.weeklyartistchart?.artist).slice(0, 20).map(a => ({
                name:  a.name || '',
                plays: parseInt(a.playcount || 0),
            }));

            // Rough personality from play-concentration
            const totalPlays = top_artists.reduce((s, a) => s + a.plays, 0);
            const top3Plays  = top_artists.slice(0, 3).reduce((s, a) => s + a.plays, 0);
            const loyalty    = totalPlays > 0 ? Math.round((top3Plays / totalPlays) * 100) : 50;
            const diversity  = top_artists.length > 0 ? Math.min(100, Math.round((top_artists.length / 20) * 100)) : 50;

            const [y, m] = month.split('-');
            const label = new Date(parseInt(y), parseInt(m) - 1, 1)
                .toLocaleString('en-US', { month: 'long', year: 'numeric' });

            return { month, label, top_tracks, top_artists, personality: { loyalty, diversity } };
        }));

        return res.status(200).json({ user_top_tags, monthly_history });

    } catch (err) {
        console.error('Last.fm handler error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
