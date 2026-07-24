// ══════════════════════════════════════════
//  YouTube Video Service — Extract video data using yt-dlp
// ══════════════════════════════════════════

import { detectEnvironment } from './cep';

// Supported YouTube URL patterns
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/i,
  /(?:youtu\.be\/)([\w-]{11})/i,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
  /(?:youtube\.com\/embed\/)([\w-]{11})/i,
  /(?:youtube\.com\/v\/)([\w-]{11})/i,
];

/**
 * Extract video ID from a YouTube URL.
 */
function extractVideoId(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) throw new Error('Please paste a YouTube URL.');

  for (const pattern of YT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  throw new Error(
    'Invalid YouTube URL. Supported formats:\n• youtube.com/watch?v=...\n• youtu.be/...\n• youtube.com/shorts/...',
  );
}

// ── yt-dlp Binary Management ─────────────

/**
 * Get the path where yt-dlp.exe should be stored.
 * Uses the extension's own directory for portability.
 */
function getYtDlpDir() {
  const env = detectEnvironment();
  const os = env.os;
  const path = env.path;

  // Store in user's AppData for persistence across extension updates
  const baseDir = path.join(os.homedir(), '.find_your_assets');
  if (!env.fs.existsSync(baseDir)) {
    env.fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

/**
 * Get the full path to the yt-dlp executable.
 */
function getYtDlpPath() {
  const env = detectEnvironment();
  const dir = getYtDlpDir();
  const exe = env.os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  return env.path.join(dir, exe);
}

/**
 * Check if yt-dlp is installed at the expected location.
 */
export function isYtDlpInstalled() {
  const env = detectEnvironment();
  if (!env.isCEP) return false;
  return env.fs.existsSync(getYtDlpPath());
}

/**
 * Download yt-dlp binary from GitHub releases.
 * Returns a promise that resolves when download is complete.
 */
export function downloadYtDlp(onProgress) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error('Node.js required'));

  const platform = env.os.platform();
  let assetName;
  if (platform === 'win32') {
    assetName = 'yt-dlp.exe';
  } else if (platform === 'darwin') {
    assetName = 'yt-dlp_macos';
  } else {
    assetName = 'yt-dlp_linux';
  }

  const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
  const savePath = getYtDlpPath();

  if (onProgress) onProgress('Downloading yt-dlp...');

  return new Promise((resolve, reject) => {
    const download = (url, redirectCount = 0) => {
      if (redirectCount > 10) {
        reject(new Error('Too many redirects'));
        return;
      }

      const protocol = url.startsWith('https') ? env.https : env.http;

      protocol.get(url, { headers: { 'User-Agent': 'FindYourAssets/1.0' } }, (res) => {
        // Follow redirects (GitHub always redirects)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        const fileStream = env.fs.createWriteStream(savePath);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (onProgress && totalBytes > 0) {
            const pct = Math.round((downloadedBytes / totalBytes) * 100);
            onProgress(`Downloading yt-dlp... ${pct}%`);
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();

          // Make executable on Unix
          if (platform !== 'win32') {
            try {
              env.fs.chmodSync(savePath, '755');
            } catch { /* ignore */ }
          }

          if (onProgress) onProgress('yt-dlp ready!');
          resolve(savePath);
        });

        fileStream.on('error', (err) => {
          // Clean up partial file
          try { env.fs.unlinkSync(savePath); } catch { /* ignore */ }
          reject(new Error(`Failed to save: ${err.message}`));
        });
      }).on('error', (err) => {
        reject(new Error(`Download error: ${err.message}`));
      });
    };

    download(downloadUrl);
  });
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
    const child = env.child_process.execFile(
      ytdlpPath,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          // Extract useful error from stderr
          const errMsg = (stderr || error.message || '').trim();
          if (errMsg.includes('Video unavailable')) {
            reject(new Error('Video is unavailable or has been removed.'));
          } else if (errMsg.includes('Private video')) {
            reject(new Error('This is a private video.'));
          } else if (errMsg.includes('Sign in')) {
            reject(new Error('This video requires sign-in (age-restricted or members-only).'));
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

// ── Public API ───────────────────────────

/**
 * Fetch video metadata and available formats from a YouTube URL.
 *
 * Uses yt-dlp's --dump-json to get all video info including
 * direct download URLs with decrypted signatures.
 *
 * @param {string} url - YouTube video URL
 * @returns {Promise<{title, thumbnail, author, duration, qualities[], videoId}>}
 */
export async function fetchYouTubeVideo(url) {
  const videoId = extractVideoId(url);
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use yt-dlp to dump JSON info for all formats
  const jsonStr = await runYtDlp([
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    ytUrl,
  ]);

  let info;
  try {
    info = JSON.parse(jsonStr);
  } catch {
    throw new Error('Failed to parse video info from yt-dlp.');
  }

  // Parse formats — prefer muxed (video+audio) mp4 formats
  const qualities = [];
  const seen = new Set();

  const allFormats = info.formats || [];

  // 1. Muxed formats (video + audio in one file)
  const muxedFormats = allFormats.filter(
    (f) =>
      f.url &&
      f.vcodec && f.vcodec !== 'none' &&
      f.acodec && f.acodec !== 'none' &&
      f.height,
  );

  // Sort by height descending
  muxedFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of muxedFormats) {
    if (seen.has(fmt.height)) continue;
    seen.add(fmt.height);

    // Prefer mp4 container
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

  // 2. Also add high-quality video-only formats (if we don't already have a muxed version for that resolution)
  const videoOnlyFormats = allFormats.filter(
    (f) =>
      f.url &&
      f.vcodec && f.vcodec !== 'none' &&
      f.height &&
      (f.ext === 'mp4' || f.ext === 'webm'),
  );

  videoOnlyFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of videoOnlyFormats) {
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

  if (qualities.length === 0) {
    throw new Error(
      'No downloadable formats found. The video may be DRM-protected.',
    );
  }

  return {
    title: info.title || 'YouTube Video',
    thumbnail:
      info.thumbnail ||
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    author: info.uploader || info.channel || '',
    duration: info.duration || null,
    qualities,
    videoId,
  };
}

/**
 * Download a specific video format using yt-dlp.
 * This is more reliable than using Node's https.get since yt-dlp
 * handles specific headers, large files, and DASH streams automatically.
 *
 * @param {string} videoId - YouTube video ID
 * @param {string} formatId - The format ID to download
 * @param {string} savePath - The absolute path to save the file
 */
export async function downloadYtDlpVideo(videoId, formatId, savePath) {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // --format <id> downloads that specific format
  // -o <path> specifies the output file path
  await runYtDlp([
    '--no-playlist',
    '--no-warnings',
    '--format', formatId,
    '-o', savePath,
    ytUrl,
  ], 5 * 60 * 1000); // 5 minute timeout for download
}
