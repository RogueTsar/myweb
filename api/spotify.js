const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

// Cache access token in memory (survives across requests within same serverless instance)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

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
        cachedToken = null;
        tokenExpiry = 0;
        throw new Error(`Token refresh failed: ${res.status} - ${body.error || 'unknown'}. Run: cd ~/myweb && node scripts/get-spotify-token.js`);
    }

    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token in token response');

    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
}

async function fetchSpotify(token, endpoint, retries = 1) {
    const res = await fetch(`${SPOTIFY_API}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.status === 204) return null;
    if (res.status === 429 && retries > 0) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '1', 10);
        await new Promise(r => setTimeout(r, Math.min(retryAfter * 1000, 4000)));
        return fetchSpotify(token, endpoint, retries - 1);
    }
    if (!res.ok) throw new Error(`Spotify API error: ${res.status} on ${endpoint}`);
    return res.json();
}

/** Aggregate genres from an array of artist objects → {genre: count} sorted */
function genresFrom(artistsArr) {
    const count = {};
    (artistsArr || []).forEach(a => (a?.genres || []).forEach(g => { count[g] = (count[g] || 0) + 1; }));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n }));
}

/** Relative time formatter ("3 days ago") */
function relativeTime(iso) {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (!then) return null;
    const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Enrich one playlist with: last_updated (most recent added_at), top_artist, inferred_genre */
async function enrichPlaylist(token, playlist, artistGenreCache, token2ForArtistBatch) {
    try {
        const data = await fetchSpotify(
            token,
            `/playlists/${playlist.id}/tracks?fields=items(added_at,track(name,artists(id,name)))&limit=50`
        );
        const items = (data?.items || []).filter(i => i && i.track);

        // Most recent added_at
        let latest = null;
        items.forEach(i => {
            if (i.added_at) {
                const t = new Date(i.added_at).getTime();
                if (!latest || t > latest) latest = t;
            }
        });

        // Top artist
        const artistCounts = {};
        const artistIds = new Set();
        items.forEach(i => {
            (i.track?.artists || []).forEach(a => {
                if (a?.name) artistCounts[a.name] = (artistCounts[a.name] || 0) + 1;
                if (a?.id) artistIds.add(a.id);
            });
        });
        const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Infer genre from artists (look up via cache / batch)
        let topGenre = null;
        const genreCounts = {};
        const missingIds = [];
        artistIds.forEach(id => {
            if (artistGenreCache[id]) {
                artistGenreCache[id].forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
            } else {
                missingIds.push(id);
            }
        });
        // Batch-fetch missing artist genres (up to 50 per call)
        while (missingIds.length > 0) {
            const batch = missingIds.splice(0, 50);
            try {
                const a = await fetchSpotify(token, `/artists?ids=${batch.join(',')}`);
                (a?.artists || []).forEach(ar => {
                    if (ar?.id) {
                        artistGenreCache[ar.id] = ar.genres || [];
                        (ar.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
                    }
                });
            } catch (_) { /* skip batch */ }
        }
        topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            last_updated_iso: latest ? new Date(latest).toISOString() : null,
            last_updated_rel: latest ? relativeTime(new Date(latest).toISOString()) : null,
            top_artist: topArtist,
            top_genre: topGenre,
            track_count: items.length,
            track_names: items.slice(0, 50).map(i => i.track?.name).filter(Boolean),
        };
    } catch (_) {
        return { last_updated_iso: null, last_updated_rel: null, top_artist: null, top_genre: null, track_count: 0, track_names: [] };
    }
}

/** Run enrichment in sequential batches to avoid Spotify rate limiting (429) */
async function enrichBatched(token, playlists, artistGenreCache, batchSize = 3) {
    const results = [];
    for (let i = 0; i < playlists.length; i += batchSize) {
        const batch = playlists.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(p => enrichPlaylist(token, p, artistGenreCache)));
        results.push(...batchResults);
        if (i + batchSize < playlists.length) {
            await new Promise(r => setTimeout(r, 350)); // brief pause between batches
        }
    }
    return results;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const token = await getAccessToken();

        const settled = await Promise.allSettled([
            fetchSpotify(token, '/me/player/currently-playing'),
            fetchSpotify(token, '/me/top/artists?time_range=short_term&limit=20'),
            fetchSpotify(token, '/me/top/tracks?time_range=short_term&limit=20'),
            fetchSpotify(token, '/me/top/artists?time_range=long_term&limit=50'),
            fetchSpotify(token, '/me/player/recently-played?limit=50'),
            fetchSpotify(token, '/me/playlists?limit=50'),
            fetchSpotify(token, '/me'),
            fetchSpotify(token, '/me/top/artists?time_range=medium_term&limit=50'),
            fetchSpotify(token, '/me/top/tracks?time_range=long_term&limit=20'),
            fetchSpotify(token, '/me/top/tracks?time_range=medium_term&limit=20'),
        ]);

        const [
            currentlyPlaying,
            topArtistsShort,
            topTracksShort,
            topArtistsLong,
            recentlyPlayed,
            playlistsRaw,
            profile,
            topArtistsMed,
            topTracksLong,
            topTracksMed,
        ] = settled.map(r => (r.status === 'fulfilled' ? r.value : null));

        // Artist genre cache shared across the whole request
        const artistGenreCache = {};
        [topArtistsShort, topArtistsMed, topArtistsLong].forEach(src => {
            (src?.items || []).forEach(a => { if (a?.id) artistGenreCache[a.id] = a.genres || []; });
        });

        // Last played
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
                played_at: recentlyPlayed.items[0].played_at,
                played_at_rel: relativeTime(recentlyPlayed.items[0].played_at),
            };
        }

        // Top artists (short-term for "this month")
        const top_artists = topArtistsShort?.items?.map((a, i) => ({
            name: a.name,
            rank: i + 1,
            genres: (a.genres || []).slice(0, 3),
            image: a.images[2]?.url || a.images[0]?.url,
            popularity: a.popularity || 0,
        })) || [];

        // Artist-name → genres lookup (for track enrichment)
        const artistNameToGenres = {};
        [topArtistsLong, topArtistsMed, topArtistsShort].forEach(src => {
            (src?.items || []).forEach(a => {
                if (a?.name && a.genres?.length) artistNameToGenres[a.name] = a.genres;
            });
        });

        // Derive play-count proxy from recent_tracks (last 50 plays)
        const playCountByTrackId = {};
        const playCountByTrackName = {};
        (recentlyPlayed?.items || []).forEach(item => {
            const t = item.track;
            if (!t) return;
            if (t.id) playCountByTrackId[t.id] = (playCountByTrackId[t.id] || 0) + 1;
            const key = `${t.name}|${t.artists?.[0]?.name || ''}`.toLowerCase();
            playCountByTrackName[key] = (playCountByTrackName[key] || 0) + 1;
        });

        // Top tracks (short-term = last month)
        const top_tracks = topTracksShort?.items?.map((t, i) => {
            const firstArtist = t.artists[0]?.name || '';
            const genres = (artistNameToGenres[firstArtist] || []).slice(0, 3);
            const key = `${t.name}|${firstArtist}`.toLowerCase();
            const recent_plays = playCountByTrackId[t.id] || playCountByTrackName[key] || 0;
            // Rough estimate: tracks ranked higher are played exponentially more. Map rank → estimated monthly plays.
            // Rank 1 ≈ 40-60 plays over a month, rank 20 ≈ 5-10 plays.
            const est_plays = Math.max(recent_plays, Math.round(45 * Math.pow(0.9, i) + recent_plays));
            return {
                id: t.id,
                name: t.name,
                artist: t.artists.map(a => a.name).join(', '),
                album: t.album?.name || '',
                album_art: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null,
                rank: i + 1,
                genres,
                recent_plays,     // exact: appearances in last 50 plays
                est_plays,        // smoothed monthly estimate
            };
        }) || [];

        // Aggregate genres (overall - long + short)
        const top_genres = genresFrom([...(topArtistsLong?.items || []), ...(topArtistsShort?.items || [])])
            .slice(0, 12).map(g => g.name);

        // Genres across time (short/medium/long)
        const genres_by_range = {
            short: genresFrom(topArtistsShort?.items).slice(0, 10),
            medium: genresFrom(topArtistsMed?.items).slice(0, 10),
            long: genresFrom(topArtistsLong?.items).slice(0, 10),
        };

        // Top tracks across time ranges
        const top_tracks_by_range = {
            short: (topTracksShort?.items || []).slice(0, 10).map((t, i) => ({
                rank: i + 1, name: t.name, artist: t.artists.map(a => a.name).join(', '),
                album_art: t.album?.images?.[1]?.url || null,
            })),
            medium: (topTracksMed?.items || []).slice(0, 10).map((t, i) => ({
                rank: i + 1, name: t.name, artist: t.artists.map(a => a.name).join(', '),
                album_art: t.album?.images?.[1]?.url || null,
            })),
            long: (topTracksLong?.items || []).slice(0, 10).map((t, i) => ({
                rank: i + 1, name: t.name, artist: t.artists.map(a => a.name).join(', '),
                album_art: t.album?.images?.[1]?.url || null,
            })),
        };

        // Recent history
        const recent_tracks = (recentlyPlayed?.items || []).slice(0, 10).map(item => ({
            track: item.track.name,
            artist: item.track.artists.map(a => a.name).join(', '),
            album: item.track.album.name,
            album_art: item.track.album.images[2]?.url || item.track.album.images[0]?.url,
            played_at: item.played_at,
            played_at_rel: relativeTime(item.played_at),
        }));

        // Build playlist-name → last_played lookup (scan ALL 50 recent plays, match by track name)
        // Note: Spotify's recently-played doesn't tell us which playlist a track came from. Best approximation:
        // a playlist's "last played by me" = most recent time ANY of its tracks appeared in recent_tracks.
        // We'll fill this in below after enrichment.

        const playlistItems = (playlistsRaw?.items || []).filter(p => p && p.name);

        // Enrich top 9 playlists in batches of 3 to respect Spotify rate limits
        const toEnrich = playlistItems.slice(0, 9);
        const enriched = await enrichBatched(token, toEnrich, artistGenreCache, 3);

        // Build playlist list with new metadata
        const recentTrackNames = new Set((recentlyPlayed?.items || [])
            .map(i => `${i.track?.name}|${i.track?.artists?.[0]?.name || ''}`.toLowerCase()));
        const recentTrackTimeMap = {};
        (recentlyPlayed?.items || []).forEach(i => {
            const k = `${i.track?.name}|${i.track?.artists?.[0]?.name || ''}`.toLowerCase();
            if (!recentTrackTimeMap[k] || new Date(i.played_at) > new Date(recentTrackTimeMap[k])) {
                recentTrackTimeMap[k] = i.played_at;
            }
        });

        const playlist_list = playlistItems.slice(0, 30).map((p, idx) => {
            const e = enriched[idx] || {};
            // Best-effort last-played: any track from this playlist in recent_tracks?
            let lastPlayedIso = null;
            (e.track_names || []).forEach(name => {
                // approximate match: only have first artist from playlist in track_names
                // so scan by name
                Object.keys(recentTrackTimeMap).forEach(key => {
                    if (key.startsWith(name.toLowerCase() + '|')) {
                        const iso = recentTrackTimeMap[key];
                        if (!lastPlayedIso || new Date(iso) > new Date(lastPlayedIso)) lastPlayedIso = iso;
                    }
                });
            });

            // track_count: prefer Spotify's stated total, fallback to enrichment item count
            const spotifyTotal = typeof p.tracks?.total === 'number' ? p.tracks.total : null;
            const enrichCount  = (e.track_count != null && e.track_count > 0) ? e.track_count : null;
            const trackCount   = spotifyTotal ?? enrichCount ?? 0;

            return {
                id: p.id,
                name: p.name,
                description: p.description || '',
                track_count: trackCount,
                image: p.images?.[0]?.url || null,
                url: p.external_urls?.spotify || 'https://open.spotify.com/',
                last_updated_iso: e.last_updated_iso || null,
                last_updated_rel: e.last_updated_rel || null,
                last_played_iso: lastPlayedIso,
                last_played_rel: lastPlayedIso ? relativeTime(lastPlayedIso) : null,
                top_artist: e.top_artist || null,
                top_genre: e.top_genre || null,
            };
        });

        // Audio features (may be blocked for new apps)
        const trackIds = (topTracksShort?.items || []).map(t => t.id).filter(Boolean);
        let audioFeaturesData = null;
        if (trackIds.length > 0) {
            try {
                audioFeaturesData = await fetchSpotify(token, `/audio-features?ids=${trackIds.join(',')}`);
            } catch (_) { /* deprecated for newer apps */ }
        }
        const audio_features = (audioFeaturesData?.audio_features || []).filter(Boolean).map(f => ({
            id: f.id, energy: f.energy, danceability: f.danceability, valence: f.valence,
            tempo: f.tempo, acousticness: f.acousticness, instrumentalness: f.instrumentalness,
            speechiness: f.speechiness, liveness: f.liveness,
        }));

        const spotify_url = profile?.external_urls?.spotify || 'https://open.spotify.com/';

        // Personality metrics (computed server-side so we can also persist in snapshots)
        const popularityAvg = top_artists.length
            ? Math.round(top_artists.reduce((s, a) => s + (a.popularity || 0), 0) / top_artists.length)
            : 50;
        const artistSet = new Set(top_tracks.map(t => t.artist));
        const loyalty = top_tracks.length > 0 ? Math.round((1 - artistSet.size / top_tracks.length) * 100) : 50;
        const diversitySet = new Set();
        [...top_artists.map(a => a.name), ...recent_tracks.map(t => t.artist)].forEach(n => diversitySet.add(n));
        const totalSlots = top_artists.length + recent_tracks.length;
        const diversity = totalSlots ? Math.round((diversitySet.size / totalSlots) * 100) : 50;
        const personality = {
            obscurity: 100 - popularityAvg,
            mainstream: popularityAvg,
            loyalty,
            diversity,
            genre_breadth: Object.keys(artistGenreCache).length > 0
                ? new Set(Object.values(artistGenreCache).flat()).size
                : 0,
            computed_at: new Date().toISOString(),
        };

        // Debug: raw tracks field from first playlist
        const _debug_tracks = playlistItems[0]
            ? { tracks_raw: playlistItems[0].tracks, id: playlistItems[0].id, name: playlistItems[0].name }
            : null;

        // Top artists by time range (fallback for when genre data is unavailable)
        const top_artists_by_range = {
            short:  (topArtistsShort?.items || []).slice(0, 10).map(a => ({ name: a.name, genres: a.genres || [] })),
            medium: (topArtistsMed?.items  || []).slice(0, 10).map(a => ({ name: a.name, genres: a.genres || [] })),
            long:   (topArtistsLong?.items || []).slice(0, 10).map(a => ({ name: a.name, genres: a.genres || [] })),
        };

        return res.status(200).json({
            last_played,
            top_artists,
            top_tracks,
            top_genres,
            genres_by_range,
            top_artists_by_range,
            top_tracks_by_range,
            recent_tracks,
            playlists: playlist_list,
            spotify_url,
            audio_features,
            personality,
            _debug_tracks,
        });
    } catch (err) {
        console.error('Spotify API error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
