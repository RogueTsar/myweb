/**
 * GitHub OAuth initiation endpoint for Decap CMS.
 * Redirects the user to GitHub's OAuth authorization page.
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID     — from your GitHub OAuth App
 *   SITE_URL             — e.g. https://vaishnavisingh.vercel.app (no trailing slash)
 */
export default function handler(req, res) {
  const { provider } = req.query;

  if (provider !== 'github') {
    return res.status(400).send('Unsupported provider');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('GITHUB_CLIENT_ID env var is not set');
  }

  const siteUrl = process.env.SITE_URL || 'https://vaishnavisingh.vercel.app';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/callback`,
    scope: 'repo,user',
    state: Math.random().toString(36).slice(2),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
