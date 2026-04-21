export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { RESEND_API_KEY, OWNER_EMAIL } = process.env;
    if (!RESEND_API_KEY || !OWNER_EMAIL) {
        return res.status(503).json({ error: 'Notify not configured' });
    }

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Trivia Bot <onboarding@resend.dev>',
                to: [OWNER_EMAIL],
                subject: 'Trivia: someone finished all your questions!',
                html: '<p>A visitor on your site has answered all of your trivia questions. Time to answer more at <strong>/trivia-admin.html</strong>!</p>',
            }),
        });
        if (!r.ok) return res.status(502).json({ error: 'Email send failed' });
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
