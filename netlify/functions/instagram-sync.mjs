import { configuration, synchronize } from '../lib/instagram.mjs';

export default async function handler(request, context) {
  if (context?.deploy?.context !== 'production') return new Response(null, { status: 204 });
  const config = configuration();
  if (!config) return new Response(null, { status: 204 });
  try {
    await synchronize(config);
    return new Response(null, { status: 204 });
  } catch {
    console.error('Instagram sync failed. Check authorization and API configuration.');
    return new Response(null, { status: 502 });
  }
}
