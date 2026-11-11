// Netlify Function — proxies TikTok CDN images so the page can show and download them.
// Only TikTok image hosts are allowed, so this can't be used as an open proxy.

const ALLOWED = /(tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|tiktokv\.com|tiktokv\.us|tiktokv\.eu|byteimg\.com|ibyteimg\.com|ibytedtos\.com|ttwstatic\.com|byteoversea\.com|muscdn\.com|akamaized\.net)$/i;
export default async (req) => {
  try {
    const target = new URL(new URL(req.url).searchParams.get("url") || "");
    if (target.protocol !== "https:" || !ALLOWED.test(target.hostname)) {
      return new Response("Not a TikTok image URL.", { status: 400 });
    }

    const upstream = await fetch(target.href, {
      headers: { Referer: "https://www.tiktok.com/", "User-Agent": "Mozilla/5.0" },
    });
    if (!upstream.ok) return new Response("Image expired or unavailable.", { status: upstream.status });

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/webp",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Bad image URL.", { status: 400 });
  }
};

export const config = { path: "/api/image" };
