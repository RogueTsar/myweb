const GENIUS_API = 'https://api.genius.com';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { GENIUS_ACCESS_TOKEN } = process.env;
    if (!GENIUS_ACCESS_TOKEN) {
        return res.status(503).json({ error: 'GENIUS_ACCESS_TOKEN not configured' });
    }

    const { artist, track } = req.query || {};
    if (!artist || !track) {
        return res.status(400).json({ error: 'Missing required query params: artist, track' });
    }

    try {
        const q = encodeURIComponent(`${artist} ${track}`);
        const searchRes = await fetch(`${GENIUS_API}/search?q=${q}`, {
            headers: { 'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}` },
        });
        if (!searchRes.ok) return res.status(502).json({ error: 'Genius search failed' });

        const searchData = await searchRes.json();
        const hits = searchData?.response?.hits || [];
        if (hits.length === 0) return res.status(404).json({ error: 'No results found' });

        const hit = hits[0].result;
        const songId = hit.id;

        // Fetch full song for description
        let description = null;
        try {
            const songRes = await fetch(`${GENIUS_API}/songs/${songId}?text_format=plain`, {
                headers: { 'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}` },
            });
            if (songRes.ok) {
                const songData = await songRes.json();
                const plain = songData?.response?.song?.description?.plain || '';
                if (plain && plain !== '?') {
                    description = plain.slice(0, 220).trim();
                }
            }
        } catch (_) { /* description is optional */ }

        return res.status(200).json({
            song_id: songId,
            title: hit.title,
            artist: hit.primary_artist?.name || artist,
            thumbnail_url: hit.song_art_image_thumbnail_url || null,
            url: hit.url,
            description,
        });
    } catch (err) {
        console.error('Genius API error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
