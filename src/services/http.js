// ══════════════════════════════════════════
//  Shared HTTP GET — Node.js (CEP) or fetch (browser)
// ══════════════════════════════════════════

import { detectEnvironment } from './cep';

/**
 * Performs a GET request and returns parsed JSON.
 * Uses Node.js https in CEP, fetch in browser.
 */
export function httpGetJSON(hostname, path) {
  const env = detectEnvironment();

  if (env.isCEP && env.https) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path,
        method: 'GET',
        headers: { 'User-Agent': 'FindYourAssets/1.0' },
      };

      const req = env.https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`API error ${res.statusCode}: ${body.substring(0, 100)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.end();
    });
  }

  // Browser fallback
  return fetch(`https://${hostname}${path}`)
    .then((res) => {
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    });
}

/**
 * Downloads a URL as binary Buffer (CEP only).
 * Follows redirects automatically.
 */
export function httpGetBinary(url) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error('Node.js required'));

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? env.https : env.http;

    protocol.get(url, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        httpGetBinary(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = env.Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        resolve({ buffer, contentType });
      });
    }).on('error', reject);
  });
}

/**
 * Performs a POST request with JSON payload and returns binary Buffer (CEP only).
 */
export function httpPostJSONForBinary(url, headers, payloadData) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error('Node.js required'));

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      family: 4, // Force IPv4 to prevent ETIMEDOUT on some networks
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': env.Buffer.byteLength(payloadData),
        'User-Agent': 'FindYourAssets/1.0',
        ...headers,
      },
    };

    const req = env.https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = env.Buffer.concat(chunks);
        if (res.statusCode >= 300) {
          try {
            const errRes = JSON.parse(buffer.toString());
            reject(new Error(`API Error: ${errRes.errors?.[0]?.title || errRes.message || res.statusCode}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${buffer.toString()}`));
          }
          return;
        }
        const contentType = res.headers['content-type'] || 'image/png';
        resolve({ buffer, contentType });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out connecting to API.'));
    });
    
    req.write(payloadData);
    req.end();
  });
}
