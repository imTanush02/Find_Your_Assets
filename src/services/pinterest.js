// ══════════════════════════════════════════
//  Pinterest Video Scraper — Extract video data from pin URLs
// ══════════════════════════════════════════

import { detectEnvironment } from './cep';

const PINTEREST_PIN_REGEX = /pinterest\.com\/pin\/(\d+)/i;
const PIN_URL_ALTERNATE = /pin\.it\/([a-zA-Z0-9]+)/i;

/**
 * Validate and normalize a Pinterest pin URL.
 * Returns the canonical URL or throws if invalid.
 */
function validatePinterestUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) throw new Error('Please paste a Pinterest URL.');

  if (PINTEREST_PIN_REGEX.test(trimmed) || PIN_URL_ALTERNATE.test(trimmed)) {
    return trimmed;
  }

  throw new Error('Invalid Pinterest URL. Expected: pinterest.com/pin/...');
}

/**
 * Fetch raw HTML from a URL using Node.js https.
 * Follows up to 5 redirects (Pinterest often redirects, especially pin.it short links).
 */
function fetchHTML(url, maxRedirects = 5) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error('Node.js required'));

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? env.https : env.http;

    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    };

    const req = protocol.get(url, options, (res) => {
      // Follow redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        fetchHTML(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Pinterest returned HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve(env.Buffer.concat(chunks).toString('utf-8'));
      });
    });

    req.on('error', (err) =>
      reject(new Error(`Network error: ${err.message}`)),
    );
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Request timed out fetching Pinterest page.'));
    });
  });
}

// ── JSON Extraction Strategies ───────────

/**
 * Extract embedded JSON data from Pinterest HTML.
 *
 * Pinterest embeds pin data in several patterns — we try them all and
 * return every parsed JSON object so the caller can search each one.
 */
function extractAllJsonBlocks(html) {
  const blocks = [];

  // ── Strategy 1: <script id="__PWS_DATA__"> ──
  const pwsMatch = html.match(
    /<script[^>]*id\s*=\s*["']__PWS_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (pwsMatch) {
    try { blocks.push(JSON.parse(pwsMatch[1])); } catch { /* skip */ }
  }

  // ── Strategy 2: <script id="__PWS_INITIAL_PROPS__"> ──
  const propsMatch = html.match(
    /<script[^>]*id\s*=\s*["']__PWS_INITIAL_PROPS__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (propsMatch) {
    try { blocks.push(JSON.parse(propsMatch[1])); } catch { /* skip */ }
  }

  // ── Strategy 3: data-relay-response JSON blocks ──
  const relayRegex =
    /<script[^>]*data-relay-response\s*=\s*["']true["'][^>]*>([\s\S]*?)<\/script>/gi;
  let relayMatch;
  while ((relayMatch = relayRegex.exec(html)) !== null) {
    try { blocks.push(JSON.parse(relayMatch[1])); } catch { /* skip */ }
  }

  // ── Strategy 4: <script data-test-id="..."> with application/json ──
  const testIdRegex =
    /<script[^>]*data-test-id\s*=\s*["'][^"']*["'][^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let testIdMatch;
  while ((testIdMatch = testIdRegex.exec(html)) !== null) {
    if (testIdMatch[1].length < 500) continue;
    try { blocks.push(JSON.parse(testIdMatch[1])); } catch { /* skip */ }
  }

  // ── Strategy 5: window.__INITIAL_STATE__ = {...} ──
  const stateMatch = html.match(
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i,
  );
  if (stateMatch) {
    try { blocks.push(JSON.parse(stateMatch[1])); } catch { /* skip */ }
  }

  // ── Strategy 6: Any remaining large application/json script blocks ──
  const genericRegex =
    /<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let genericMatch;
  while ((genericMatch = genericRegex.exec(html)) !== null) {
    if (genericMatch[1].length < 500) continue;
    try {
      const obj = JSON.parse(genericMatch[1]);
      // Avoid duplicates by checking if we already have this block
      const str = JSON.stringify(obj);
      const isDuplicate = blocks.some(
        (b) => JSON.stringify(b).length === str.length,
      );
      if (!isDuplicate) blocks.push(obj);
    } catch { /* skip */ }
  }

  return blocks;
}

// ── Recursive Searchers ──────────────────

/**
 * Recursively search a JSON object for video_list data.
 * Returns the first video_list object found, or null.
 */
function findVideoList(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 25) return null;

  // Direct hit — an object that has url-bearing children typical of video_list
  if (obj.video_list && typeof obj.video_list === 'object') {
    return obj.video_list;
  }

  // videos.video_list container
  if (obj.videos && obj.videos.video_list) {
    return obj.videos.video_list;
  }

  // Recurse into all values
  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of values) {
    if (val && typeof val === 'object') {
      const found = findVideoList(val, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Recursively search for pin title / description.
 */
function findPinTitle(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 15) return '';

  // Pinterest uses several field names for titles
  for (const key of ['title', 'grid_title', 'seo_title', 'description_html', 'closeup_description']) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].trim().length > 0 && obj[key].trim().length < 300) {
      // Strip HTML tags from description fields
      return obj[key].replace(/<[^>]*>/g, '').trim();
    }
  }

  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of values) {
    if (val && typeof val === 'object') {
      const found = findPinTitle(val, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

/**
 * Recursively search for a thumbnail image URL.
 */
function findThumbnail(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 15) return '';

  if (obj.images && typeof obj.images === 'object') {
    const img =
      obj.images.orig || obj.images['736x'] || obj.images['474x'] || obj.images['236x'];
    if (img && img.url) return img.url;
  }

  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of values) {
    if (val && typeof val === 'object') {
      const found = findThumbnail(val, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

// ── Direct MP4 URL Fallback ──────────────

/**
 * Last-resort: extract .mp4 URLs directly from the raw HTML using regex.
 * This catches cases where JSON parsing fails but video URLs are present
 * in open-graph tags, inline scripts, or other HTML attributes.
 */
function extractMp4UrlsFromHtml(html) {
  const urls = new Set();

  // Match URLs ending in .mp4 (often in og:video tags, JSON strings, etc.)
  const mp4Regex = /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi;
  let match;
  while ((match = mp4Regex.exec(html)) !== null) {
    let url = match[0];
    // Clean trailing garbage characters
    url = url.replace(/[\\",;}\]]+$/, '');
    // Unescape JSON-escaped URLs
    url = url.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
    if (url.includes('pinimg.com') || url.includes('pinterest')) {
      urls.add(url);
    }
  }

  return [...urls];
}

// ── Quality Parsing ──────────────────────

/**
 * Parse video_list into a clean qualities array.
 */
function parseVideoQualities(videoList) {
  const qualities = [];
  const seen = new Set();

  // Sort entries by width descending
  const entries = Object.entries(videoList)
    .filter(([, val]) => val && val.url)
    .sort((a, b) => (b[1].width || 0) - (a[1].width || 0));

  for (const [key, val] of entries) {
    if (!val.url || seen.has(val.url)) continue;
    seen.add(val.url);

    // Derive a human-readable quality label
    let quality = key;
    if (val.width && val.height) {
      quality = `${val.height}p`;
    } else if (key.match(/V_(\d+P)/i)) {
      quality = key.match(/V_(\d+P)/i)[1].toLowerCase();
    } else if (key.match(/(\d+)P/i)) {
      quality = key.match(/(\d+)P/i)[1] + 'p';
    }

    qualities.push({
      quality,
      label: key,
      url: val.url,
      width: val.width || null,
      height: val.height || null,
      duration: val.duration != null ? val.duration : null,
    });
  }

  return qualities;
}

/**
 * Build a qualities array from raw MP4 URLs (fallback).
 */
function buildQualitiesFromUrls(urls) {
  return urls.map((url, i) => ({
    quality: urls.length === 1 ? 'video' : `option ${i + 1}`,
    label: `mp4_${i}`,
    url,
    width: null,
    height: null,
    duration: null,
  }));
}

// ── Public API ───────────────────────────

/**
 * Fetch video data from a Pinterest pin URL.
 *
 * @param {string} url - Pinterest pin URL
 * @returns {Promise<{title: string, thumbnail: string, duration: number|null, qualities: Array}>}
 */
export async function fetchPinterestVideo(url) {
  const validUrl = validatePinterestUrl(url);

  // Step 1: Fetch the page HTML
  const html = await fetchHTML(validUrl);

  // Step 2: Extract all JSON blocks from <script> tags
  const blocks = extractAllJsonBlocks(html);

  // Step 3: Search each block for video_list
  let videoList = null;
  let sourceBlock = null;

  for (const block of blocks) {
    videoList = findVideoList(block);
    if (videoList) {
      sourceBlock = block;
      break;
    }
  }

  // Step 4: Parse video qualities
  let qualities = [];
  if (videoList) {
    qualities = parseVideoQualities(videoList);
  }

  // Step 5: Fallback — extract .mp4 URLs directly from HTML
  if (qualities.length === 0) {
    const mp4Urls = extractMp4UrlsFromHtml(html);
    if (mp4Urls.length > 0) {
      qualities = buildQualitiesFromUrls(mp4Urls);
    }
  }

  // No video found at all
  if (qualities.length === 0) {
    // Check if we found ANY data to give a better error message
    if (blocks.length === 0) {
      throw new Error(
        'Could not read Pinterest page data. Pinterest may have blocked the request — try again in a moment.',
      );
    }
    throw new Error(
      'No video found on this pin. Make sure you\'re linking to a video pin, not an image.',
    );
  }

  // Step 6: Extract metadata from whichever block had the data
  const metaSource = sourceBlock || blocks[0] || {};
  const title = findPinTitle(metaSource) || 'Pinterest Video';
  const thumbnail = findThumbnail(metaSource) || '';
  const duration = qualities[0]?.duration || null;

  return {
    title,
    thumbnail,
    duration,
    qualities,
  };
}
