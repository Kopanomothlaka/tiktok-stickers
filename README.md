# Sticker Grabber

Paste a TikTok video link → scans its comments through SearchAPI's TikTok Comments API → shows every sticker/image comment in a grid, with single and zip downloads. Hosted on Netlify.

## Deploy to Netlify

**Option A — GitHub (recommended)**
1. Push this folder to a GitHub repo.
2. Netlify → Add new site → Import an existing project → pick the repo. Build settings are read from `netlify.toml` (no build command needed).
3. Site configuration → Environment variables → add `SEARCHAPI_KEY` = your key.
4. Deploys → Trigger deploy (so the functions pick up the key).

**Option B — CLI**
```
npm install -g netlify-cli
netlify login
netlify init        # create/link the site
netlify env:set SEARCHAPI_KEY your_key_here
netlify deploy --prod
```

Drag-and-drop deploys don't include functions — use A or B.

## Run locally

```
npm install -g netlify-cli
cp .env.example .env    # paste your key
netlify dev             # http://localhost:8888
```

## Structure

- `public/index.html` — the page. Loops page by page through `/api/scan`, showing progress live.
- `netlify/functions/scan.mjs` → `/api/scan` — one SearchAPI page per call (keeps each call under Netlify's 10s limit). Resolves vm/vt short links.
- `netlify/functions/image.mjs` → `/api/image` — proxies TikTok CDN images (TikTok hosts only).

## Notes

- Each page of comments = one billed SearchAPI search. Depth (2/5/10/20) controls cost; "Include replies" spends extra searches.
- TikTok image links are signed and expire — download soon after scanning.
- SearchAPI returns one `image` field for both photos and stickers.
- The API key lives only in Netlify's environment variables — never in `public/`.
