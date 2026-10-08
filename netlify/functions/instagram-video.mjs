import { configuration, readFeed, mediaUrl } from '../lib/instagram.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const headers = { 'Cache-Control': 'no-store' };
  const id = new URL(request.url).searchParams.get('id');
  if (!/^\d+$/.test(id || '')) return Response.json({ status: 'unavailable' }, { status: 400, headers });
  const config = configuration();
  if (config) {
    try {
      const feed = await readFeed(config);
      const video = mediaUrl(feed?.items.find(item => item.id === id)?.video);
      if (video) return Response.json({ video }, { headers });
    } catch {}
  }
  return Response.json({ status: 'unavailable' }, { status: 404, headers });
}
