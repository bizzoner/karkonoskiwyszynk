import { configuration, readFeed } from '../lib/instagram.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const headers = { 'Cache-Control': 'public, max-age=60', 'Netlify-CDN-Cache-Control': 'public, s-maxage=300', 'X-Content-Type-Options': 'nosniff' };
  const config = configuration();
  if (!config) return Response.json({ status: 'not_configured', items: [] }, { headers });
  try {
    const feed = await readFeed(config);
    if (!feed) return Response.json({ status: 'unavailable', items: [] }, { headers });
    const items = feed.items.map(({ id, caption, poster, permalink, timestamp }) => ({ id, caption, poster, permalink, timestamp }));
    return Response.json({ status: items.length ? 'ready' : 'empty', items, updatedAt: feed.updatedAt }, { headers });
  } catch {
    return Response.json({ status: 'unavailable', items: [] }, { headers });
  }
}
