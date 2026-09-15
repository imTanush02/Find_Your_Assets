// ══════════════════════════════════════════
//  Instagram Service — Extract reels, images & carousels using yt-dlp + HTML fallback
// ══════════════════════════════════════════

import { detectEnvironment } from './cep';
import { isYtDlpInstalled, downloadYtDlp, updateYtDlp, getYtDlpVersion } from './youtube';
import { httpGetBinary } from './http';

// Re-export yt-dlp helpers so the modal can import from one place
export { isYtDlpInstalled, downloadYtDlp, updateYtDlp, getYtDlpVersion };

// Supported Instagram URL patterns
const IG_PATTERNS = [
  /(?:instagram\.com\/reels?\/)([A-Za-z0-9_-]+)/i,
  /(?:instagram\.com\/p\/)([A-Za-z0-9_-]+)/i,
  /(?:instagram\.com\/tv\/)([A-Za-z0-9_-]+)/i,
  /(?:instagram\.com\/stories\/[^/]+\/)(\d+)/i,
];

/**
 * Extract the shortcode/reel code from an Instagram URL.
 */
function extractPostCode(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) throw new Error('Please paste an Instagram URL.');

  for (const pattern of IG_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  throw new Error(
    'Invalid Instagram URL. Supported formats:\n• instagram.com/reel/...\n• instagram.com/reels/...\n• instagram.com/p/...\n• instagram.com/tv/...',
  );
}

// ── yt-dlp Binary Path (reuse from youtube.js) ──

/**
 * Get the path where yt-dlp.exe is stored.
 */
function getYtDlpPath() {
  const env = detectEnvironment();
  const dir = env.path.join(env.os.homedir(), '.find_your_assets');
  const exe = env.os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  return env.path.join(dir, exe);
}

// ── yt-dlp Execution ─────────────────────

/**
 * Run yt-dlp with the given arguments and return the stdout output.
 */
function runYtDlp(args, timeoutMs = 60000) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error('Node.js required'));

  const ytdlpPath = getYtDlpPath();
  if (!env.fs.existsSync(ytdlpPath)) {
    return Promise.reject(
      new Error('yt-dlp is not installed. Click "Setup yt-dlp" first.'),
    );
  }

  return new Promise((resolve, reject) => {
    env.child_process.execFile(
      ytdlpPath,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const errMsg = (stderr || error.message || '').trim();
          if (errMsg.includes('login') || errMsg.includes('Login') || errMsg.includes('authentication')) {
            reject(new Error('This content requires an Instagram login (private account or age-restricted).'));
          } else if (errMsg.includes('not exist') || errMsg.includes('Not Found') || errMsg.includes('404')) {
            reject(new Error('Post not found. It may have been deleted or the URL is incorrect.'));
          } else {
            reject(new Error(errMsg || 'yt-dlp failed'));
          }
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

// ── HTML Scraping Fallback (Pinterest-style) ──

/**
 * Fetch raw HTML from an Instagram URL using Node.js https.
 * Follows up to 5 redirects.
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
        reject(new Error(`Instagram returned HTTP ${res.statusCode}`));
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
      reject(new Error('Request timed out fetching Instagram page.'));
    });
  });
}

/**
 * Extract image/video data from Instagram page HTML as fallback.
 * Tries og:image, og:video meta tags and embedded JSON data.
 */
function extractFromHTML(html, postCode) {
  const result = {
    title: '',
    thumbnail: '',
    author: '',
    images: [],
    videos: [],
  };

  // ── Extract og:image (single image or poster) ──
  const ogImageMatch = html.match(
    /<meta\s+(?:property|name)\s*=\s*["']og:image["']\s+content\s*=\s*["']([^"']+)["']/i,
  );
  if (ogImageMatch) {
    result.thumbnail = ogImageMatch[1];
  }

  // ── Extract og:title / og:description ──
  const ogTitleMatch = html.match(
    /<meta\s+(?:property|name)\s*=\s*["']og:title["']\s+content\s*=\s*["']([^"']+)["']/i,
  );
  if (ogTitleMatch) {
    result.title = ogTitleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  // ── Extract og:video (if it's a video post) ──
  const ogVideoMatch = html.match(
    /<meta\s+(?:property|name)\s*=\s*["']og:video(?::url)?["']\s+content\s*=\s*["']([^"']+)["']/i,
  );
  if (ogVideoMatch) {
    result.videos.push({
      url: ogVideoMatch[1],
      width: null,
      height: null,
    });
  }

  // ── Try to extract embedded JSON data ──
  // Instagram embeds data in several patterns
  const jsonPatterns = [
    // window._sharedData
    /window\._sharedData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i,
    // window.__additionalDataLoaded
    /window\.__additionalDataLoaded\s*\(\s*['"][^'"]*['"]\s*,\s*(\{[\s\S]*?\})\s*\)\s*;/i,
    // require("ServerJS").handle pattern
    /"require"\s*:\s*\[\s*\["ScheduledServerJS"\s*,\s*"handle"\s*,\s*null\s*,\s*\[(\{[\s\S]*?\})\]/i,
  ];

  for (const pattern of jsonPatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const extracted = extractMediaFromJson(data, postCode);
        if (extracted) {
          if (extracted.images.length > 0) result.images = extracted.images;
          if (extracted.videos.length > 0) result.videos = extracted.videos;
          if (extracted.title) result.title = extracted.title;
          if (extracted.author) result.author = extracted.author;
          break;
        }
      } catch { /* skip parse errors */ }
    }
  }

  // If no embedded JSON found but we have og:image, use that as a single image
  if (result.images.length === 0 && result.videos.length === 0 && result.thumbnail) {
    result.images.push({
      url: result.thumbnail,
      width: null,
      height: null,
      index: 0,
    });
  }

  return result;
}

/**
 * Recursively search embedded JSON for media (images/videos).
 * Instagram nests media data deeply in their JSON structures.
 */
function extractMediaFromJson(obj, postCode, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 20) return null;

  // Look for edge/sidecar nodes (carousel)
  if (obj.edge_sidecar_to_children && obj.edge_sidecar_to_children.edges) {
    const items = obj.edge_sidecar_to_children.edges;
    const images = [];
    const videos = [];

    items.forEach((edge, idx) => {
      const node = edge.node || edge;
      if (node.is_video && node.video_url) {
        videos.push({
          url: node.video_url,
          thumbnail: node.display_url || node.display_resources?.[0]?.src || '',
          width: node.dimensions?.width || null,
          height: node.dimensions?.height || null,
          index: idx,
        });
      } else if (node.display_url || node.display_resources) {
        const imgUrl = node.display_url || node.display_resources?.slice(-1)[0]?.src || '';
        if (imgUrl) {
          images.push({
            url: imgUrl,
            width: node.dimensions?.width || null,
            height: node.dimensions?.height || null,
            index: idx,
          });
        }
      }
    });

    return {
      images,
      videos,
      title: obj.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 100) || '',
      author: obj.owner?.username || '',
    };
  }

  // Look for single post data
  if (obj.shortcode === postCode || obj.code === postCode) {
    const images = [];
    const videos = [];

    if (obj.is_video && obj.video_url) {
      videos.push({
        url: obj.video_url,
        thumbnail: obj.display_url || '',
        width: obj.dimensions?.width || null,
        height: obj.dimensions?.height || null,
        index: 0,
      });
    } else if (obj.display_url) {
      images.push({
        url: obj.display_url,
        width: obj.dimensions?.width || null,
        height: obj.dimensions?.height || null,
        index: 0,
      });
    }

    return {
      images,
      videos,
      title: obj.edge_media_to_caption?.edges?.[0]?.node?.text?.substring(0, 100) || '',
      author: obj.owner?.username || '',
    };
  }

  // Recurse into child values
  const values = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of values) {
    if (val && typeof val === 'object') {
      const found = extractMediaFromJson(val, postCode, depth + 1);
      if (found && (found.images.length > 0 || found.videos.length > 0)) {
        return found;
      }
    }
  }

  return null;
}

// ── AE-Compatible Codec Check ────────────

/**
 * Check if a codec is supported by After Effects.
 * AE supports H.264 (avc1), H.265 (hevc/hev1), ProRes, and a few others.
 * It does NOT support AV1, VP8, VP9.
 */
function isAECompatibleCodec(vcodec) {
  if (!vcodec || vcodec === 'none') return false;
  const vc = vcodec.toLowerCase();
  // H.264 variants
  if (vc.startsWith('avc') || vc.startsWith('h264') || vc === 'h.264') return true;
  // H.265 variants
  if (vc.startsWith('hev') || vc.startsWith('hevc') || vc.startsWith('h265') || vc === 'h.265') return true;
  // MPEG-4 Part 2
  if (vc.startsWith('mp4v') || vc.startsWith('mpeg4')) return true;
  return false;
}

// ── Format Parsing (from yt-dlp JSON) ────

/**
 * Parse video formats from yt-dlp info JSON.
 * Only returns AE-compatible formats (H.264/H.265).
 * Falls back to all formats only if no compatible ones exist.
 */
function parseVideoQualities(info) {
  const allFormats = info.formats || [];

  // ── Collect all candidate formats ──
  const muxedFormats = allFormats.filter(
    (f) =>
      f.url &&
      f.vcodec && f.vcodec !== 'none' &&
      f.acodec && f.acodec !== 'none' &&
      f.height,
  );

  const videoOnlyFormats = allFormats.filter(
    (f) =>
      f.url &&
      f.vcodec && f.vcodec !== 'none' &&
      f.height &&
      (f.ext === 'mp4' || f.ext === 'webm'),
  );

  // ── Prefer AE-compatible codecs (H.264, H.265) ──
  const compatMuxed = muxedFormats.filter((f) => isAECompatibleCodec(f.vcodec));
  const compatVideoOnly = videoOnlyFormats.filter((f) => isAECompatibleCodec(f.vcodec));

  // Only use AE-compatible codecs. Never leak VP9/AV1 if compatible formats exist.
  const hasCompatible = compatMuxed.length > 0 || compatVideoOnly.length > 0;
  const useMuxed = compatMuxed.length > 0 ? compatMuxed : (hasCompatible ? [] : muxedFormats);
  const useVideoOnly = compatVideoOnly.length > 0 ? compatVideoOnly : (hasCompatible ? [] : videoOnlyFormats);

  // ── Build quality list ──
  const qualities = [];
  const seen = new Set();

  // Sort muxed by height descending
  useMuxed.sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of useMuxed) {
    if (seen.has(fmt.height)) continue;
    seen.add(fmt.height);

    const ext = fmt.ext || 'mp4';
    const qualityLabel = fmt.format_note || `${fmt.height}p`;

    qualities.push({
      format_id: fmt.format_id,
      quality: `${fmt.height}p`,
      label: `${qualityLabel} (${ext})`,
      url: fmt.url,
      width: fmt.width || null,
      height: fmt.height || null,
      duration: info.duration || null,
      hasAudio: true,
      ext,
      filesize: fmt.filesize || fmt.filesize_approx || null,
    });
  }

  // Video-only: only add resolutions not already covered by muxed
  useVideoOnly.sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of useVideoOnly) {
    if (seen.has(fmt.height)) continue;
    seen.add(fmt.height);

    const ext = fmt.ext || 'mp4';
    const qualityLabel = fmt.format_note || `${fmt.height}p`;

    qualities.push({
      format_id: fmt.format_id,
      quality: `${fmt.height}p`,
      label: `${qualityLabel} (${ext}, no audio)`,
      url: fmt.url,
      width: fmt.width || null,
      height: fmt.height || null,
      duration: info.duration || null,
      hasAudio: false,
      ext,
      filesize: fmt.filesize || fmt.filesize_approx || null,
    });
  }

  // Sort final list by height descending
  qualities.sort((a, b) => (b.height || 0) - (a.height || 0));

  return qualities;
}

/**
 * Extract image URLs from yt-dlp info JSON.
 * yt-dlp may return image posts as a single entry with thumbnail/url.
 */
function parseImagesFromInfo(info) {
  const images = [];

  // For single image posts, yt-dlp returns the image URL in `url` or `thumbnail`
  // and the formats array may be empty or have image-type entries
  const imageUrl = info.url || info.thumbnail || '';

  if (imageUrl && !imageUrl.includes('.mp4') && !imageUrl.includes('.webm')) {
    images.push({
      url: imageUrl,
      width: info.width || null,
      height: info.height || null,
      index: 0,
    });
  }

  // Also check thumbnails array for higher res versions
  if (info.thumbnails && Array.isArray(info.thumbnails)) {
    const sorted = [...info.thumbnails]
      .filter((t) => t.url)
      .sort((a, b) => (b.width || 0) - (a.width || 0));

    if (sorted.length > 0 && images.length === 0) {
      images.push({
        url: sorted[0].url,
        width: sorted[0].width || null,
        height: sorted[0].height || null,
        index: 0,
      });
    }
  }

  return images;
}

// ── Public API ───────────────────────────

/**
 * Fetch post data from an Instagram URL.
 * Handles all content types: reels (video), single images, and carousels.
 *
 * Uses yt-dlp as the primary extractor, with HTML scraping as fallback.
 *
 * @param {string} url - Instagram URL (reel, post, or TV)
 * @returns {Promise<{type, title, thumbnail, author, duration, qualities[], images[], items[], postCode}>}
 */
export async function fetchInstagramPost(url) {
  const postCode = extractPostCode(url);

  // Build the canonical URL
  const igUrl = url.trim().startsWith('http')
    ? url.trim()
    : `https://www.instagram.com/p/${postCode}/`;

  // ── Strategy 1: yt-dlp (primary) ──
  let ytdlpResult = null;
  let ytdlpError = null;

  try {
    const jsonStr = await runYtDlp([
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      igUrl,
    ]);

    let info;
    try {
      info = JSON.parse(jsonStr);
    } catch {
      throw new Error('Failed to parse post info from yt-dlp.');
    }

    // ── Detect content type from yt-dlp output ──

    // Check for carousel/playlist — yt-dlp returns `entries` for multi-item posts
    if (info.entries && Array.isArray(info.entries) && info.entries.length > 1) {
      const items = info.entries.map((entry, idx) => {
        const entryQualities = parseVideoQualities(entry);
        const isVideo = entryQualities.length > 0;

        if (isVideo) {
          return {
            type: 'video',
            index: idx,
            thumbnail: entry.thumbnail || '',
            title: entry.title || `Video ${idx + 1}`,
            qualities: entryQualities,
            duration: entry.duration || null,
          };
        } else {
          // Image item in carousel
          const images = parseImagesFromInfo(entry);
          return {
            type: 'image',
            index: idx,
            thumbnail: entry.thumbnail || images[0]?.url || '',
            url: images[0]?.url || entry.thumbnail || '',
            title: entry.title || `Image ${idx + 1}`,
            width: images[0]?.width || null,
            height: images[0]?.height || null,
          };
        }
      });

      return {
        type: 'carousel',
        title: info.title || info.entries[0]?.title || 'Instagram Post',
        thumbnail: info.thumbnail || info.entries[0]?.thumbnail || '',
        author: info.uploader || info.channel || info.uploader_id || '',
        duration: null,
        qualities: [],
        images: [],
        items,
        postCode,
      };
    }

    // Check for video (reel) — has downloadable video formats
    const qualities = parseVideoQualities(info);
    if (qualities.length > 0) {
      return {
        type: 'reel',
        title: info.title || info.description?.substring(0, 80) || 'Instagram Reel',
        thumbnail: info.thumbnail || '',
        author: info.uploader || info.channel || info.uploader_id || '',
        duration: info.duration || null,
        qualities,
        images: [],
        items: [],
        postCode,
      };
    }

    // Check for single image — no video formats but has image data
    const images = parseImagesFromInfo(info);
    if (images.length > 0) {
      return {
        type: 'image',
        title: info.title || info.description?.substring(0, 80) || 'Instagram Post',
        thumbnail: images[0].url,
        author: info.uploader || info.channel || info.uploader_id || '',
        duration: null,
        qualities: [],
        images,
        items: [],
        postCode,
      };
    }

    // yt-dlp returned data but we couldn't extract anything useful
    ytdlpResult = info;
  } catch (err) {
    ytdlpError = err;
  }

  // ── Strategy 2: HTML Scraping Fallback (Pinterest-style) ──
  try {
    const html = await fetchHTML(igUrl);
    const extracted = extractFromHTML(html, postCode);

    // Build result from scraped data
    if (extracted.videos.length > 0) {
      // Video found via scraping
      const qualities = extracted.videos.map((v, idx) => ({
        format_id: `scraped_${idx}`,
        quality: v.height ? `${v.height}p` : 'video',
        label: v.height ? `${v.height}p (mp4)` : 'mp4',
        url: v.url,
        width: v.width,
        height: v.height,
        duration: null,
        hasAudio: true,
        ext: 'mp4',
        filesize: null,
      }));

      return {
        type: 'reel',
        title: extracted.title || 'Instagram Video',
        thumbnail: extracted.thumbnail || '',
        author: extracted.author || '',
        duration: null,
        qualities,
        images: [],
        items: [],
        postCode,
      };
    }

    if (extracted.images.length > 1) {
      // Carousel found via scraping
      const items = extracted.images.map((img, idx) => ({
        type: 'image',
        index: idx,
        thumbnail: img.url,
        url: img.url,
        title: `Image ${idx + 1}`,
        width: img.width,
        height: img.height,
      }));

      return {
        type: 'carousel',
        title: extracted.title || 'Instagram Post',
        thumbnail: extracted.thumbnail || items[0]?.url || '',
        author: extracted.author || '',
        duration: null,
        qualities: [],
        images: [],
        items,
        postCode,
      };
    }

    if (extracted.images.length === 1) {
      // Single image found via scraping
      return {
        type: 'image',
        title: extracted.title || 'Instagram Post',
        thumbnail: extracted.images[0].url,
        author: extracted.author || '',
        duration: null,
        qualities: [],
        images: extracted.images,
        items: [],
        postCode,
      };
    }
  } catch {
    // HTML scraping also failed — fall through to error
  }

  // ── Both strategies failed ──
  if (ytdlpError) {
    // Re-throw the original yt-dlp error — it's usually more descriptive
    throw ytdlpError;
  }

  throw new Error(
    'Could not extract any media from this Instagram post.\nThe post may be private, deleted, or from an unsupported format.',
  );
}

/**
 * Backward-compatible alias for fetchInstagramPost.
 * @deprecated Use fetchInstagramPost instead.
 */
export const fetchInstagramReel = fetchInstagramPost;

/**
 * Download a specific video format using yt-dlp.
 *
 * @param {string} igUrl - Full Instagram URL
 * @param {string} formatId - The format ID to download
 * @param {string} savePath - The absolute path to save the file
 */
export async function downloadInstagramVideo(igUrl, formatId, savePath) {
  // If the format ID starts with 'scraped_', we have a direct URL — use httpGetBinary
  if (formatId.startsWith('scraped_')) {
    // For scraped formats, the URL was stored elsewhere;
    // this path shouldn't normally be hit since scraped videos use direct download
    throw new Error('Scraped video formats should use direct URL download.');
  }

  // Format selector: download formatId and merge audio if video-only
  const formatSelector = `${formatId}+bestaudio[ext=m4a]/bestaudio/${formatId}/best`;

  await runYtDlp([
    '--no-playlist',
    '--no-warnings',
    '--format', formatSelector,
    '--merge-output-format', 'mp4',
    '-o', savePath,
    igUrl,
  ], 5 * 60 * 1000); // 5 minute timeout for download
}

/**
 * Download an Instagram image by direct URL.
 *
 * @param {string} imageUrl - Direct image URL
 * @param {string} savePath - The absolute path to save the file
 */
export async function downloadInstagramImage(imageUrl, savePath) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Node.js required');

  const { buffer } = await httpGetBinary(imageUrl);
  env.fs.writeFileSync(savePath, buffer);
}
