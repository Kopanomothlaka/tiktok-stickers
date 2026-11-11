// Netlify Function — fetches ONE page of TikTok comments from SearchAPI.
// The page loops over pages itself, so every call stays well under Netlify's 10s limit.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Short links (vm/vt.tiktok.com, tiktok.com/t/) aren't accepted by SearchAPI, so resolve them first.
async function resolveVideoId(input) {
  const raw = String(input || "").trim();
  if (/^\d{8,19}$/.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    throw new Error("That doesn't look like a TikTok link.");
  }
  if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) throw new Error("Only tiktok.com links are supported.");

  const direct = url.href.match(/\/(?:video|photo)\/(\d{8,19})/);
  if (direct) return direct[1];

  const res = await fetch(url.href, { redirect: "follow", headers: { "User-Agent": UA } });
  const resolved = res.url.match(/\/(?:video|photo)\/(\d{8,19})/);
  if (resolved) return resolved[1];

  throw new Error("Couldn't find a video in that link. Try the full link from the browser address bar.");
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const key = process.env.SEARCHAPI_KEY;
  if (!key) return json({ error: "Server isn't configured: SEARCHAPI_KEY missing." }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const params = { engine: "tiktok_comments" };
    let videoId = body.videoId || null;

    if (body.token) {
      params.next_page_token = body.token; // token carries video + comment on its own
    } else {
      videoId = videoId || (await resolveVideoId(body.link));
      params.video_id = videoId;
      if (body.commentId) params.comment_id = String(body.commentId);
    }

    const res = await fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        res.status === 401 ? "SearchAPI key is missing or invalid." :
        res.status === 429 ? "SearchAPI rate limit reached. Try again later." :
        data.error || `SearchAPI error (${res.status}).`;
      return json({ error: msg }, res.status === 401 || res.status === 429 ? res.status : 502);
    }

    // "No comments / past the end" comes back as 200 with an error message
    if (data.error && !data.comments) {
      return json({ videoId, done: true, message: data.error, comments: [], next: null });
    }

    const comments = (data.comments || []).map((c) => ({
      id: c.id,
      image: c.image || null,
      text: c.text || "",
      likes: c.likes || 0,
      replies: c.replies || 0,
      isReply: !!body.commentId,
      author: {
        username: c.author?.username || "",
        link: c.author?.link || "",
      },
    }));

    return json({
      videoId,
      totalOnVideo: data.video?.comments ?? null,
      comments,
      next: data.pagination?.next_page_token || null,
    });
  } catch (err) {
    return json({ error: err.message }, 400);
  }
};

export const config = { path: "/api/scan" };
