const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

async function getAccessToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
        throw new Error('Missing Spotify environment variables');
    }
    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json();
    return data.access_token;
}

async function fetchSpotify(token, endpoint) {
    const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`Spotify API error: ${res.status} on ${endpoint}`);
    return res.json();
}

function classifyVibe(avg) {
    if (avg.energy > 0.7 && avg.danceability > 0.7) return { label: 'party', emoji: '\uD83C\uDF89' };
    if (avg.valence < 0.3 && avg.energy < 0.4) return { label: 'melancholy', emoji: '\uD83C\uDF27\uFE0F' };
    if (avg.acousticness > 0.6) return { label: 'acoustic', emoji: '\uD83C\uDFB8' };
    if (avg.energy > 0.6 && avg.valence > 0.6) return { label: 'feel-good', emoji: '\u2600\uFE0F' };
    if (avg.tempo > 130 && avg.energy > 0.7) return { label: 'workout', emoji: '\uD83D\uDCAA' };
    if (avg.valence > 0.5 && avg.danceability > 0.5) return { label: 'groovy', emoji: '\uD83D\uDD7A' };
    if (avg.energy < 0.4) return { label: 'chill', emoji: '\uD83C\uDF19' };
    return { label: 'eclectic', emoji: '\uD83C\uDFB6' };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { type, id } = req.query;

    if (type !== 'playlist-vibe' || !id) {
        return res.status(400).json({ error: 'Required: ?type=playlist-vibe&id={playlistId}' });
    }

    try {
        const token = await getAccessToken();

        // Fetch playlist tracks (up to 50)
        const playlistData = await fetchSpotify(
            token,
            `/playlists/${id}/tracks?fields=items(track(id))&limit=50`
        );

        const trackIds = (playlistData?.items || [])
            .map(item => item?.track?.id)
            .filter(Boolean)
            .slice(0, 100);

        if (trackIds.length === 0) {
            return res.status(200).json({ vibe: null, message: 'No tracks found' });
        }

        // Batch fetch audio features (may fail if app lacks extended access)
        let validFeatures = [];
        try {
            const features = await fetchSpotify(token, `/audio-features?ids=${trackIds.join(',')}`);
            validFeatures = (features?.audio_features || []).filter(Boolean);
        } catch (_) {
            // audio-features endpoint deprecated for some apps
        }

        if (validFeatures.length === 0) {
            return res.status(200).json({ vibe: null, message: 'No audio features available' });
        }

        // Compute averages
        const sum = { energy: 0, danceability: 0, valence: 0, tempo: 0, acousticness: 0 };
        validFeatures.forEach(f => {
            sum.energy += f.energy;
            sum.danceability += f.danceability;
            sum.valence += f.valence;
            sum.tempo += f.tempo;
            sum.acousticness += f.acousticness;
        });
        const n = validFeatures.length;
        const avg = {
            energy: sum.energy / n,
            danceability: sum.danceability / n,
            valence: sum.valence / n,
            tempo: Math.round(sum.tempo / n),
            acousticness: sum.acousticness / n,
        };

        const vibe = classifyVibe(avg);

        return res.status(200).json({
            vibe: {
                ...vibe,
                bpm: avg.tempo,
                energy: Math.round(avg.energy * 100),
                danceability: Math.round(avg.danceability * 100),
                mood: Math.round(avg.valence * 100),
                acousticness: Math.round(avg.acousticness * 100),
                track_count_analyzed: n,
            },
        });
    } catch (err) {
        console.error('Spotify details error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
