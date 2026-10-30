# Call page setup

One-time setup to connect `/call` to your Google Calendar. The page only ever asks Google for free/busy blocks. Event titles, guests and locations are never requested, so they can't leak.

## 1. Google Cloud project
1. Go to <https://console.cloud.google.com> and create a project, e.g. `call-page`.
2. APIs & Services → Library → find **Google Calendar API** → Enable.

## 2. Service account
3. IAM & Admin → Service Accounts → Create service account. Name it `freebusy-reader`. Grant no roles. Done.
4. Open it → Keys → Add key → Create new key → JSON. A file downloads.
5. Base64 it (macOS): `base64 -i key.json | pbcopy`
6. Delete the downloaded file, or keep it somewhere outside this repo.

## 3. Share your calendar with it
7. Google Calendar → Settings → your calendar → **Share with specific people or groups**.
8. Add the service account's email (`freebusy-reader@<project>.iam.gserviceaccount.com`) with permission **See only free/busy (hide details)**.

## 4. Vercel environment variables
9. Vercel → Project → Settings → Environment Variables. Add every variable from `.env.example` for **Production** and **Preview**.
   - `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: the base64 string from step 5
   - `CALENDAR_IDS`: your Gmail address
   - `FRIENDS_KEY`: generate with `openssl rand -base64 24 | tr -d '/+='`
10. Redeploy the preview and open the PR preview URL.

## 5. Optional
11. Add a redirect such as `/c` → `/call` in Vercel if you want a shorter link.
12. Add `DISCORD_USER_ID` and `MEET_URL` to turn on those buttons.

## Local preview with fake data
```bash
node build.cjs
node scripts/call-dev-server.js     # http://localhost:8123/call (friends key: demo)
curl "localhost:8123/__state?s=busy"   # free | busy | off | fail
```
Add `?tz=Asia/Singapore` to the page URL to preview another viewer time zone.
