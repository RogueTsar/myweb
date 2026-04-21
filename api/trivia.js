const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { JSONBIN_ID, JSONBIN_KEY } = process.env;
    if (!JSONBIN_ID || !JSONBIN_KEY) {
        return res.status(503).json({ error: 'Trivia not configured', questions: [] });
    }

    try {
        const r = await fetch(`${JSONBIN_BASE}/${JSONBIN_ID}/latest`, {
            headers: { 'X-Access-Key': JSONBIN_KEY },
        });
        if (!r.ok) return res.status(502).json({ error: 'Could not read trivia data', questions: [] });
        const data = await r.json();
        const questions = data?.record?.questions || [];
        return res.status(200).json({ questions });
    } catch (err) {
        console.error('trivia GET error:', err.message);
        return res.status(500).json({ error: err.message, questions: [] });
    }
}
