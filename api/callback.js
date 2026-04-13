/**
 * GitHub OAuth callback endpoint for Decap CMS.
 * Exchanges the temporary code for an access token and posts
 * it back to the CMS via window.postMessage.
 *
 * Required env vars:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('GitHub OAuth env vars are not set');
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return res.status(502).send('Failed to reach GitHub');
  }

  if (tokenData.error) {
    return res.status(400).send(`OAuth error: ${tokenData.error_description || tokenData.error}`);
  }

  // Build the payload Decap CMS expects:
  //   authorization:github:success:{"token":"...","provider":"github"}
  const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });
  // Double-encode so it is safe to embed as a JS string literal.
  const safePayload = JSON.stringify(payload);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  var payload = ${safePayload};
  function onMessage(e) {
    window.opener.postMessage('authorization:github:success:' + payload, e.origin);
  }
  window.addEventListener('message', onMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`);
}
