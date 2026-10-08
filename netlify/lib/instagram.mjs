import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const MAX_AGE = 6 * 60 * 60 * 1000;

export function configuration() {
  const { INSTAGRAM_ACCESS_TOKEN: token, INSTAGRAM_USER_ID: userId, INSTAGRAM_API_VERSION: version } = process.env;
  if (!token || !/^\d+$/.test(userId || '') || !/^v\d+\.\d+$/.test(version || '')) return null;
  return { token, userId, version };
}

export function mediaUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return ['cdninstagram.com', 'fbcdn.net'].some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain)) ? url.href : null;
  } catch { return null; }
}

export function reelUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['www.instagram.com', 'instagram.com'].includes(url.hostname) && /^\/(reel|p)\/[\w-]+\/?$/.test(url.pathname) ? 'https://www.instagram.com' + url.pathname : null;
  } catch { return null; }
}

export function normalizeReels(media) {
  return media.filter(item => item.media_product_type === 'REELS' && item.media_type === 'VIDEO')
    .map(item => ({ id: String(item.id), caption: String(item.caption || '').slice(0, 180), poster: mediaUrl(item.thumbnail_url), video: mediaUrl(item.media_url), permalink: reelUrl(item.permalink), timestamp: item.timestamp }))
    .filter(item => /^\d+$/.test(item.id) && item.poster && item.video && item.permalink && Number.isFinite(Date.parse(item.timestamp)))
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp))
    .filter((item, index, items) => items.findIndex(other => other.id === item.id) === index)
    .slice(0, 4);
}

async function requestMeta(url, token) {
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(4500), redirect: 'error' });
  if (!response.ok) throw new Error('Instagram request failed');
  const data = await response.json();
  if (data.error) throw new Error('Instagram response failed');
  return data;
}

export function feedStore(config) {
  return getStore({ name: 'instagram-' + config.userId, consistency: 'strong' });
}

export async function readFeed(config) {
  const cached = await feedStore(config).get('feed', { type: 'json' });
  return cached && Date.now() - Date.parse(cached.updatedAt) < MAX_AGE ? cached : null;
}

export async function synchronize(config) {
  const store = feedStore(config);
  const fingerprint = createHash('sha256').update(config.token).digest('hex');
  let credential = await store.get('credential', { type: 'json' });
  if (!credential || credential.fingerprint !== fingerprint) {
    credential = { token: config.token, fingerprint, refreshedAt: Date.now() };
    await store.setJSON('credential', credential);
  }
  if (Date.now() - credential.refreshedAt >= 7 * 24 * 60 * 60 * 1000) {
    const refresh = new URL('https://graph.instagram.com/refresh_access_token');
    refresh.searchParams.set('grant_type', 'ig_refresh_token');
    refresh.searchParams.set('access_token', credential.token);
    const renewed = await requestMeta(refresh, credential.token);
    if (typeof renewed.access_token !== 'string' || !renewed.access_token) throw new Error('Instagram renewal failed');
    credential = { token: renewed.access_token, fingerprint, refreshedAt: Date.now() };
    await store.setJSON('credential', credential);
  }
  const media = [];
  let cursor;
  for (let page = 0; page < 3; page += 1) {
    const url = new URL('https://graph.instagram.com/' + config.version + '/' + config.userId + '/media');
    url.searchParams.set('fields', 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp');
    url.searchParams.set('limit', '50');
    if (cursor) url.searchParams.set('after', cursor);
    const result = await requestMeta(url, credential.token);
    if (!Array.isArray(result.data)) throw new Error('Instagram media missing');
    media.push(...result.data);
    cursor = result.paging?.cursors?.after;
    if (normalizeReels(media).length >= 4 || !result.paging?.next || !cursor) break;
  }
  const feed = { items: normalizeReels(media), updatedAt: new Date().toISOString() };
  await store.setJSON('feed', feed);
  return feed;
}
