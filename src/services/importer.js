// ══════════════════════════════════════════
//  Importer Service — Download + Import into AE
// ══════════════════════════════════════════

import { detectEnvironment, evalScript } from './cep';
import { httpGetBinary, httpPostJSONForBinary } from './http';

const EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp',
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
 * Load an image URL as a base64 data URI (for Pixabay hotlink workaround).
 */
export async function loadImageAsDataUri(url) {
  const { buffer, contentType } = await httpGetBinary(url);
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
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
