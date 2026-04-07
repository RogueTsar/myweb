// save-snapshot.js — ESM script to save monthly Spotify listening history
// Usage: node scripts/save-snapshot.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load .env file if present ──
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
            process.env[key] = val;
        }
    }
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

async function getAccessToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
        throw new Error('Missing Spotify environment variables (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN)');
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
        throw new Error(`Token refresh failed: ${res.status} - ${body.error || 'unknown'}`);
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

function monthLabel(yyyymm) {
    const [year, month] = yyyymm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

async function main() {
    console.log('Fetching Spotify data...');

    const token = await getAccessToken();

    const [topTracksRaw, topArtistsRaw, topArtistsLongRaw] = await Promise.all([
        fetchSpotify(token, '/me/top/tracks?time_range=short_term&limit=20'),
        fetchSpotify(token, '/me/top/artists?time_range=short_term&limit=10'),
        fetchSpotify(token, '/me/top/artists?time_range=long_term&limit=50'),
    ]);

    // Build artist -> genres map
    const artistGenreMap = {};
    (topArtistsLongRaw?.items || []).forEach(a => {
        if (a.genres && a.genres.length > 0) artistGenreMap[a.name] = a.genres;
    });
    (topArtistsRaw?.items || []).forEach(a => {
        if (a.genres && a.genres.length > 0 && !artistGenreMap[a.name]) {
            artistGenreMap[a.name] = a.genres;
        }
    });

    // Top tracks
    const top_tracks = (topTracksRaw?.items || []).map((t, i) => {
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
    });

    // Top artists
    const top_artists = (topArtistsRaw?.items || []).map((a, i) => ({
        name: a.name,
        rank: i + 1,
        genres: (a.genres || []).slice(0, 3),
        image: a.images?.[2]?.url || a.images?.[0]?.url || null,
        popularity: a.popularity || 0,
    }));

    // Top genres by count
    const genreCount = {};
    [topArtistsLongRaw, topArtistsRaw].forEach(source => {
        (source?.items || []).forEach(a => {
            (a.genres || []).forEach(g => {
                genreCount[g] = (genreCount[g] || 0) + 1;
            });
        });
    });
    const top_genres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);

    // Determine target month:
    // If SNAPSHOT_MONTH env var is set, use it (format: YYYY-MM).
    // If run on the 1st of the month (e.g. via cron), save as the PREVIOUS month
    // since Spotify short_term data reflects the last 4 weeks = last month.
    // Otherwise save as the current month.
    const now = new Date();
    let month;
    if (process.env.SNAPSHOT_MONTH) {
        month = process.env.SNAPSHOT_MONTH;
    } else if (now.getDate() <= 3) {
        // Near start of month → save as previous month
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    } else {
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const label = monthLabel(month);

    const snapshot = {
        month,
        label,
        saved_at: new Date().toISOString(),
        top_tracks,
        top_artists,
        top_genres,
    };

    // Save snapshot file
    const historyDir = path.join(ROOT, 'assets', 'data', 'history');
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

    const snapshotPath = path.join(historyDir, `${month}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
    console.log(`Saved snapshot to ${snapshotPath}`);

    // Update index.json
    const indexPath = path.join(historyDir, 'index.json');
    let index = [];
    if (fs.existsSync(indexPath)) {
        try {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        } catch (_) { index = []; }
    }

    if (!index.find(entry => entry.month === month)) {
        index.push({ month, label });
    }

    // Sort descending
    index.sort((a, b) => b.month.localeCompare(a.month));

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log(`Updated index.json (${index.length} entries)`);
    console.log(`Done! Snapshot saved for ${label}.`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
