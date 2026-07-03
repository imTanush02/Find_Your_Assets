// ══════════════════════════════════════════
//  Importer Service — Download + Import into AE
// ══════════════════════════════════════════

import { detectEnvironment, evalScript } from './cep';
import { httpGetBinary, httpPostJSONForBinary } from './http';
import { uploadToReplicate, createVideoBgPrediction, pollPredictionUntilDone, downloadToFile } from './replicate';

const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
};

/**
 * Get the save directory for downloaded images.
 * Uses project folder if available, falls back to system temp.
 */
async function getSaveDirectory() {
  const env = detectEnvironment();

  try {
    const result = await evalScript('getProjectFolder()');
    if (result && result !== '' && result !== 'EvalScript error.') {
      const importDir = env.path.join(result, '_ae_imports');
      if (!env.fs.existsSync(importDir)) {
        env.fs.mkdirSync(importDir, { recursive: true });
      }
      return importDir;
    }
  } catch (e) {
    // Fall through to temp dir
  }

  const baseDir = env.os.tmpdir().replace(/\\/g, '/');
  const importDir = env.path.join(baseDir, '_ae_imports');
  if (!env.fs.existsSync(importDir)) {
    env.fs.mkdirSync(importDir, { recursive: true });
  }
  return importDir;
}

/**
 * Download an image and import it into AE project.
 * Returns the imported file path.
 */
export async function downloadAndImport(imageUrl, description, imageId) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Import requires After Effects');

  const saveDir = await getSaveDirectory();
  const safeName = (description || imageId || 'image')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 60);
  const baseName = `${safeName}_${imageId}`;

  // Download the file
  const { buffer, contentType } = await httpGetBinary(imageUrl);

  // Determine correct extension from content-type
  const ext = EXT_MAP[contentType.split(';')[0].trim()] || '.jpg';
  const finalPath = env.path.join(saveDir, baseName + ext);

  // Skip if already downloaded
  if (!env.fs.existsSync(finalPath)) {
    env.fs.writeFileSync(finalPath, buffer);
  }

  // Import into AE
  const escapedPath = finalPath.replace(/\\/g, '/');
  const result = await evalScript(`importFileToProject("${escapedPath}")`);

  if (result && result.indexOf('ERROR') === 0) {
    throw new Error(result);
  }

  return { path: finalPath, fileName: baseName + ext };
}

/**
 * Remove background via remove.bg API and import into AE.
 */
export async function removeBgAndImport(imageUrl, description, imageId, apiKey) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Import requires After Effects');

  const saveDir = await getSaveDirectory();
  const safeName = (description || imageId || 'image')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 60);
  const baseName = `${safeName}_${imageId}_nobg`;
  const finalPath = env.path.join(saveDir, baseName + '.png');

  // Skip if already downloaded
  if (!env.fs.existsSync(finalPath)) {
    const payload = JSON.stringify({
      image_url: imageUrl,
      size: 'auto'
    });

    const { buffer } = await httpPostJSONForBinary(
      'https://api.remove.bg/v1.0/removebg',
      { 'X-Api-Key': apiKey },
      payload
    );
    env.fs.writeFileSync(finalPath, buffer);
  }

  // Import into AE
  const escapedPath = finalPath.replace(/\\/g, '/');
  const result = await evalScript(`importFileToProject("${escapedPath}")`);

  if (result && result.indexOf('ERROR') === 0) {
    throw new Error(result);
  }

  return { path: finalPath, fileName: baseName + '.png' };
}

/**
 * Remove background from a local file via remove.bg API and import into AE.
 */
export async function removeBgLocalAndImport(localFilePath, apiKey) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Import requires After Effects');
  if (!env.fs.existsSync(localFilePath)) throw new Error('File not found: ' + localFilePath);

  // Read local file and convert to base64
  const fileBuffer = env.fs.readFileSync(localFilePath);
  const base64Data = fileBuffer.toString('base64');

  const saveDir = await getSaveDirectory();
  const originalFileName = env.path.basename(localFilePath, env.path.extname(localFilePath));
  const safeName = originalFileName.replace(/[^a-z0-9]/gi, '_').substring(0, 60);
  const baseName = `${safeName}_nobg_${Date.now()}`;
  const finalPath = env.path.join(saveDir, baseName + '.png');

  const payload = JSON.stringify({
    image_file_b64: base64Data,
    size: 'auto'
  });

  const { buffer } = await httpPostJSONForBinary(
    'https://api.remove.bg/v1.0/removebg',
    { 'X-Api-Key': apiKey },
    payload
  );
  
  env.fs.writeFileSync(finalPath, buffer);

  // Import into AE
  const escapedPath = finalPath.replace(/\\/g, '/');
  const result = await evalScript(`importFileToProject("${escapedPath}")`);

  if (result && result.indexOf('ERROR') === 0) {
    throw new Error(result);
  }

  return { path: finalPath, fileName: baseName + '.png' };
}

/**
 * Load an image URL as a base64 data URI (for Pixabay hotlink workaround).
 */
export async function loadImageAsDataUri(url) {
  const { buffer, contentType } = await httpGetBinary(url);
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

/**
 * Download a video and import it into AE project.
 * Returns the imported file path.
 */
export async function downloadAndImportVideo(videoUrl, description, videoId) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Import requires After Effects');

  const saveDir = await getSaveDirectory();
  const safeName = (description || videoId || 'video')
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 60);
  const baseName = `${safeName}_${videoId}`;

  // Download the video file
  const { buffer, contentType } = await httpGetBinary(videoUrl);

  // Determine correct extension from content-type
  const ext = EXT_MAP[contentType.split(';')[0].trim()] || '.mp4';
  const finalPath = env.path.join(saveDir, baseName + ext);

  // Skip if already downloaded
  if (!env.fs.existsSync(finalPath)) {
    env.fs.writeFileSync(finalPath, buffer);
  }

  // Import into AE (same function — AE handles video footage natively)
  const escapedPath = finalPath.replace(/\\/g, '/');
  const result = await evalScript(`importFileToProject("${escapedPath}")`);

  if (result && result.indexOf('ERROR') === 0) {
    throw new Error(result);
  }

  return { path: finalPath, fileName: baseName + ext };
}

/**
 * Browser-only download fallback.
 */
export function browserDownload(imageUrl, description, imageId) {
  return fetch(imageUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(description || imageId || 'image').replace(/[^a-z0-9]/gi, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
}

/**
 * Find FFmpeg binary — checks PATH first, then common install locations.
 */
function findFFmpeg(env) {
  const isWindows = (typeof process !== 'undefined') && process.platform === 'win32';

  // 1) Check PATH
  try {
    const cmd = isWindows ? 'where' : 'which';
    const result = env.child_process.spawnSync(cmd, ['ffmpeg'], { timeout: 5000 });
    if (result.status === 0 && result.stdout) {
      const firstLine = result.stdout.toString().trim().split(/\r?\n/)[0].trim();
      if (firstLine) return firstLine;
    }
  } catch { /* not in PATH */ }

  // 2) Probe common Windows install locations
  if (isWindows) {
    const candidates = [
      env.path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
      env.path.join(process.env.USERPROFILE || '', 'scoop', 'shims', 'ffmpeg.exe'),
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      env.path.join(process.env.ProgramFiles || 'C:\\Program Files', 'FFmpeg', 'bin', 'ffmpeg.exe'),
    ];
    for (const c of candidates) {
      if (c && env.fs.existsSync(c)) return c;
    }
  }

  return null;
}

/**
 * Convert a green-screen video to ProRes 4444 with alpha channel via FFmpeg.
 */
function runFFmpegConversion(env, ffmpegBin, inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vf', 'colorkey=0x00FF00:0.3:0.2',
      '-c:v', 'prores_ks',
      '-profile:v', '4444',
      '-pix_fmt', 'yuva444p10le',
      '-vendor', 'apl0',
      outputPath,
    ];

    const proc = env.child_process.spawn(ffmpegBin, args);
    const stderrChunks = [];

    proc.stderr.on('data', (data) => { stderrChunks.push(data.toString()); });

    proc.on('close', (code) => {
      if (code !== 0) {
        const errMsg = stderrChunks.join('').slice(-300);
        reject(new Error(`FFmpeg exited with code ${code}: ${errMsg}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run FFmpeg: ${err.message}`));
    });
  });
}

/**
 * Remove background from a local video using Replicate's cloud API and import into AE.
 *
 * Flow:
 *   1. Upload video to Replicate
 *   2. Start RobustVideoMatting prediction (cloud GPU)
 *   3. Poll until processing completes
 *   4. Download the green-screen result
 *   5. Convert to ProRes 4444 with alpha (via FFmpeg, if available)
 *   6. Import into After Effects
 */
export async function removeVideoBgLocalAndImport(localFilePath, apiKey, onProgress) {
  const env = detectEnvironment();
  if (!env.isCEP) throw new Error('Requires After Effects');
  if (!env.fs.existsSync(localFilePath)) throw new Error('File not found: ' + localFilePath);
  if (!apiKey) throw new Error('Replicate API token is required. Set it in Settings.');

  const saveDir = await getSaveDirectory();
  const originalFileName = env.path.basename(localFilePath, env.path.extname(localFilePath));
  const safeName = originalFileName.replace(/[^a-z0-9]/gi, '_').substring(0, 60);
  const timestamp = Date.now();
  const greenScreenPath = env.path.join(saveDir, `${safeName}_gs_${timestamp}.mp4`);
  const finalPath = env.path.join(saveDir, `${safeName}_nobg_${timestamp}.mov`);

  // ── Phase 1: Upload to Replicate (0 → 15%) ──
  if (onProgress) onProgress(1);
  const fileUrl = await uploadToReplicate(localFilePath, apiKey);
  if (onProgress) onProgress(15);

  // ── Phase 2: Start cloud prediction (15 → 20%) ──
  const prediction = await createVideoBgPrediction(fileUrl, apiKey);
  if (onProgress) onProgress(20);

  // ── Phase 3: Poll until done (20 → 78%) ──
  const outputUrl = await pollPredictionUntilDone(prediction.id, apiKey, onProgress);
  if (onProgress) onProgress(78);

  // ── Phase 4: Download result (78 → 88%) ──
  if (!outputUrl) throw new Error('Cloud processing completed but returned no output URL.');
  await downloadToFile(outputUrl, greenScreenPath);
  if (onProgress) onProgress(88);

  // ── Phase 5: FFmpeg conversion — green-screen → ProRes 4444 alpha (88 → 98%) ──
  let importFilePath;
  const ffmpegBin = findFFmpeg(env);

  if (ffmpegBin) {
    try {
      await runFFmpegConversion(env, ffmpegBin, greenScreenPath, finalPath);
      importFilePath = finalPath;
      // Clean up temp green-screen file
      try { env.fs.unlinkSync(greenScreenPath); } catch { /* ignore */ }
    } catch (ffmpegErr) {
      // FFmpeg conversion failed — fall back to importing the green-screen video directly
      console.warn('FFmpeg conversion failed, importing green-screen directly:', ffmpegErr.message);
      importFilePath = greenScreenPath;
    }
  } else {
    // No FFmpeg available — import the green-screen video as-is
    importFilePath = greenScreenPath;
  }
  if (onProgress) onProgress(98);

  // ── Phase 6: Import into AE (98 → 100%) ──
  const escapedPath = importFilePath.replace(/\\/g, '/');
  const result = await evalScript(`importFileToProject("${escapedPath}")`);

  if (result && result.indexOf('ERROR') === 0) {
    throw new Error(result);
  }

  if (onProgress) onProgress(100);
  const importFileName = env.path.basename(importFilePath);
  return { path: importFilePath, fileName: importFileName };
}

