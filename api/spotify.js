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
        const body = await res.json().catch(() => ({}));
        throw new Error(`Token refresh failed: ${res.status} – ${body.error || 'unknown'}`);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token in token response');
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const token = await getAccessToken();

        const settled = await Promise.allSettled([
            fetchSpotify(token, '/me/player/currently-playing'),
            fetchSpotify(token, '/me/top/artists?time_range=short_term&limit=10'),
            fetchSpotify(token, '/me/top/tracks?time_range=short_term&limit=10'),
            fetchSpotify(token, '/me/top/artists?time_range=long_term&limit=50'),
            fetchSpotify(token, '/me/player/recently-played?limit=10'),
            fetchSpotify(token, '/me/playlists?limit=50'),
            fetchSpotify(token, '/me'),
        ]);

        const [currentlyPlaying, topArtists, topTracks, topArtistsLongTerm, recentlyPlayed, playlistsRaw, profile] =
            settled.map(r => (r.status === 'fulfilled' ? r.value : null));

        // Try to fetch audio features (may fail with 403 if app lacks extended access)
        const trackIds = (topTracks?.items || []).map(t => t.id).filter(Boolean);
        let audioFeaturesData = null;
        if (trackIds.length > 0) {
            try {
                audioFeaturesData = await fetchSpotify(token, `/audio-features?ids=${trackIds.join(',')}`);
            } catch (_) { /* audio-features deprecated for newer apps */ }
        }

        // Get playlist items
        const playlistItems = (playlistsRaw?.items || []).filter(p => p && p.name);

        // Build last_played
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
        } else if (recentlyPlayed?.items?.length > 0) {
            const track = recentlyPlayed.items[0].track;
            last_played = {
                track: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                album_art: track.album.images[1]?.url || track.album.images[0]?.url,
                is_playing: false,
            };
        }

        // Top artists with popularity
        const top_artists = topArtists?.items?.map((a, i) => ({
            name: a.name,
            rank: i + 1,
            genres: (a.genres || []).slice(0, 3),
            image: a.images[2]?.url || a.images[0]?.url,
            popularity: a.popularity || 0,
        })) || [];

        // Genre lookup
        const artistGenreMap = {};
        topArtistsLongTerm?.items?.forEach(a => {
            if (a.genres && a.genres.length > 0) {
                artistGenreMap[a.name] = a.genres;
            }
        });
        topArtists?.items?.forEach(a => {
            if (a.genres && a.genres.length > 0 && !artistGenreMap[a.name]) {
                artistGenreMap[a.name] = a.genres;
            }
        });

        // Top tracks with id and album_art
        const top_tracks = topTracks?.items?.map((t, i) => {
            const firstArtist = t.artists[0]?.name || '';
            const genres = (artistGenreMap[firstArtist] || []).slice(0, 3);
            return {
                id: t.id,
                name: t.name,
                artist: t.artists.map(a => a.name).join(', '),
                album: t.album?.name || '',
                album_art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null,
                rank: i + 1,
                genres,
            };
        }) || [];

        // Aggregate genres
        const genreCount = {};
        [topArtistsLongTerm, topArtists].forEach(source => {
            source?.items?.forEach(a => {
                (a.genres || []).forEach(g => {
                    genreCount[g] = (genreCount[g] || 0) + 1;
                });
            });
        });
        const top_genres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name]) => name);

        // Recent history
        const recent_tracks = (recentlyPlayed?.items || []).map(item => ({
            track: item.track.name,
            artist: item.track.artists.map(a => a.name).join(', '),
            album: item.track.album.name,
            album_art: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
            played_at: item.played_at,
        }));

        // Playlists — use data from the list endpoint directly (avoids 26 extra API calls)
        const playlist_list = playlistItems.slice(0, 30).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            track_count: p.tracks?.total ?? 0,
            image: p.images?.[0]?.url || null,
            url: p.external_urls?.spotify || 'https://open.spotify.com/',
        }));

        // Audio features (already fetched above)
        const audio_features = (audioFeaturesData?.audio_features || []).filter(Boolean).map(f => ({
            id: f.id,
            energy: f.energy,
            danceability: f.danceability,
            valence: f.valence,
            tempo: f.tempo,
            acousticness: f.acousticness,
            instrumentalness: f.instrumentalness,
            speechiness: f.speechiness,
            liveness: f.liveness,
        }));

        const spotify_url = profile?.external_urls?.spotify || 'https://open.spotify.com/';

        return res.status(200).json({
            last_played, top_artists, top_tracks, top_genres,
            recent_tracks, playlists: playlist_list, spotify_url,
            audio_features,
        });
    } catch (err) {
        console.error('Spotify API error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
