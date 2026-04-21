const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { JSONBIN_ID, JSONBIN_KEY, TRIVIA_ADMIN_SECRET } = process.env;
    if (!JSONBIN_ID || !JSONBIN_KEY || !TRIVIA_ADMIN_SECRET) {
        return res.status(503).json({ error: 'Trivia not configured' });
    }

    const { secret, question_obj, owner_result } = req.body || {};

    if (!secret || secret !== TRIVIA_ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!question_obj || !question_obj.question || !owner_result) {
        return res.status(400).json({ error: 'Missing question_obj or owner_result' });
    }

    if (owner_result !== 'correct' && owner_result !== 'incorrect') {
        return res.status(400).json({ error: 'owner_result must be "correct" or "incorrect"' });
    }

    try {
        // Read current data
        const readRes = await fetch(`${JSONBIN_BASE}/${JSONBIN_ID}/latest`, {
            headers: { 'X-Access-Key': JSONBIN_KEY },
        });
        let questions = [];
        if (readRes.ok) {
            const existing = await readRes.json();
            questions = existing?.record?.questions || [];
        }

        // Stable ID from question text
        const qId = btoa(question_obj.question).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

        // Upsert
        const idx = questions.findIndex(q => q.id === qId);
        const record = {
            id: qId,
            question: question_obj.question,
            correct_answer: question_obj.correct_answer,
            incorrect_answers: question_obj.incorrect_answers || [],
            category: question_obj.category || '',
            difficulty: question_obj.difficulty || 'medium',
            type: question_obj.type || 'multiple',
            owner_result,
        };

        if (idx >= 0) {
            questions[idx] = record;
        } else {
            questions.push(record);
        }

        // Write back
        const writeRes = await fetch(`${JSONBIN_BASE}/${JSONBIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': JSONBIN_KEY,
            },
            body: JSON.stringify({ questions }),
        });

        if (!writeRes.ok) {
            return res.status(502).json({ error: 'Failed to save trivia data' });
        }

        return res.status(200).json({ success: true, total: questions.length, id: qId });
    } catch (err) {
        console.error('trivia-admin error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
