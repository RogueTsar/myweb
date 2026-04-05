/**
 * Spotify Refresh Token Setup
 * Run: node scripts/get-spotify-token.js
 *
 * Prerequisites:
 *   1. Go to https://developer.spotify.com/dashboard
 *   2. Create an app (or use existing)
 *   3. In app settings → Redirect URIs → add: http://localhost:8888/callback
 *   4. Copy your Client ID and Client Secret
 *   5. Run this script and paste them in when prompted
 */

import http from 'http';
import { exec } from 'child_process';
import readline from 'readline';

const REDIRECT_URI = 'http://localhost:8888/callback';
const SCOPES = [
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-top-read',
    'playlist-read-private',
    'user-read-private',
    'user-read-email',
].join(' ');

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function openBrowser(url) {
    const cmd = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "${url}"`);
}

async function exchangeCode(clientId, clientSecret, code) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Token exchange failed: ${res.status} – ${err.error_description || err.error || 'unknown'}`);
    }
    return res.json();
}

async function main() {
    console.log('\n── Spotify Setup ──────────────────────────────────\n');
    console.log('Make sure you have added this Redirect URI in your');
    console.log('Spotify app settings:  http://localhost:8888/callback\n');

    const clientId = await prompt('Paste your SPOTIFY_CLIENT_ID: ');
    const clientSecret = await prompt('Paste your SPOTIFY_CLIENT_SECRET: ');

    const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
    });

    console.log('\nOpening Spotify in your browser...');
    console.log('If it does not open automatically, visit:\n' + authUrl + '\n');
    openBrowser(authUrl);

    // Wait for the callback
    const code = await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, 'http://localhost:8888');
            if (url.pathname !== '/callback') return;

            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            if (error) {
                res.end('<h2>Authorization denied.</h2><p>You can close this tab.</p>');
                server.close();
                reject(new Error('Authorization denied: ' + error));
                return;
            }
            res.end('<h2>All done!</h2><p>You can close this tab and check your terminal.</p>');
            server.close();
            resolve(code);
        });
        server.listen(8888, () => console.log('Waiting for Spotify callback on port 8888...'));
    });

    console.log('\nExchanging code for tokens...');
    const tokens = await exchangeCode(clientId, clientSecret, code);

    console.log('\n── Copy these into Vercel → Settings → Environment Variables ──\n');
    console.log(`SPOTIFY_CLIENT_ID=${clientId}`);
    console.log(`SPOTIFY_CLIENT_SECRET=${clientSecret}`);
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nDone! After adding the vars, redeploy Vercel for them to take effect.\n');
}

main().catch(err => { console.error('\nError:', err.message); process.exit(1); });
