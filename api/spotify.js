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
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: SPOTIFY_REFRESH_TOKEN,
        }),
    });

    if (!res.ok) {
        throw new Error(`Token refresh failed: ${res.status}`);
    }

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

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const token = await getAccessToken();

        const [currentlyPlaying, topArtists, topTracks] = await Promise.all([
            fetchSpotify(token, '/me/player/currently-playing'),
            fetchSpotify(token, '/me/top/artists?time_range=short_term&limit=10'),
            fetchSpotify(token, '/me/top/tracks?time_range=short_term&limit=10'),
        ]);

        // Build last_played from currently-playing or fall back to recently-played
        let last_played = null;

        if (currentlyPlaying && currentlyPlaying.item) {
            const track = currentlyPlaying.item;
            last_played = {
                track: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                album_art: track.album.images[1]?.url || track.album.images[0]?.url,
                is_playing: currentlyPlaying.is_playing,
            };
        } else {
            // Fall back to recently played
            const recent = await fetchSpotify(token, '/me/player/recently-played?limit=1');
            if (recent && recent.items && recent.items.length > 0) {
                const track = recent.items[0].track;
                last_played = {
                    track: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    album_art: track.album.images[1]?.url || track.album.images[0]?.url,
                    is_playing: false,
                };
            }
        }

        // Map top artists
        const top_artists = topArtists?.items?.map(a => ({
            name: a.name,
            popularity: a.popularity,
            image: a.images[2]?.url || a.images[0]?.url,
        })) || [];

        // Map top tracks
        const top_tracks = topTracks?.items?.map(t => ({
            name: t.name,
            artist: t.artists.map(a => a.name).join(', '),
            popularity: t.popularity,
        })) || [];

        return res.status(200).json({ last_played, top_artists, top_tracks });
    } catch (err) {
        console.error('Spotify API error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
