// ══════════════════════════════════════════
//  Replicate API Service — Cloud Video BG Removal
// ══════════════════════════════════════════

import { detectEnvironment } from "./cep";

const REPLICATE_API_HOST = 'api.replicate.com';
const RVM_VERSION = '73d2128a371922d5d1abf0712a1d974be0e4e2358cc1218e4e34714767232bac';

/**
 * Internal helper — make an HTTPS request to the Replicate REST API.
 * Returns parsed JSON (or raw Buffer if the response isn't JSON).
 */
function replicateRequest(method, path, apiKey, opts = {}) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error("Node.js required"));

  const { body, contentType, timeout = 120000 } = opts;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: REPLICATE_API_HOST,
      path,
      method,
      family: 4, // Force IPv4 (same as http.js)
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "FindYourAssets/1.0",
      },
    };

    if (contentType) reqOptions.headers["Content-Type"] = contentType;
    if (body) reqOptions.headers["Content-Length"] = body.length;

    const req = env.https.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = env.Buffer.concat(chunks);

        if (res.statusCode >= 400) {
          let errMsg;
          try {
            const errData = JSON.parse(buffer.toString());
            errMsg =
              errData.detail ||
              errData.error ||
              buffer.toString().substring(0, 300);
          } catch {
            errMsg = buffer.toString().substring(0, 300);
          }
          reject(new Error(`Replicate API ${res.statusCode}: ${errMsg}`));
          return;
        }

        try {
          resolve(JSON.parse(buffer.toString()));
        } catch {
          resolve(buffer); // non-JSON response (binary)
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error("Replicate request timed out"));
    });

    if (body) req.write(body);
    req.end();
  });
}

// ── Public API ───────────────────────────

/**
 * Upload a local video file to Replicate's file hosting.
 * Returns a serving URL that can be passed as model input.
 */
export async function uploadToReplicate(localFilePath, apiKey) {
  const env = detectEnvironment();
  const fileBuffer = env.fs.readFileSync(localFilePath);
  const filename = env.path.basename(localFilePath);

  // Build multipart/form-data body
  const boundary = "----ReplicateUpload" + Date.now();
  const headerPart = env.Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="content"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
  );
  const footerPart = env.Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = env.Buffer.concat([headerPart, fileBuffer, footerPart]);

  const data = await replicateRequest("POST", "/v1/files", apiKey, {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
    timeout: 300000, // 5 min for large uploads
  });

  const servingUrl = data?.urls?.get || data?.serving_url || data?.url;
  if (!servingUrl) {
    throw new Error("File upload succeeded but no serving URL was returned.");
  }
  return servingUrl;
}

/**
 * Start a Robust Video Matting prediction on Replicate.
 * Returns the prediction object (contains `id`, `status`, `urls`, etc.).
 */
export async function createVideoBgPrediction(fileUrl, apiKey) {
  const env = detectEnvironment();
  const payload = JSON.stringify({
    version: RVM_VERSION,
    input: {
      input_video: fileUrl,
      output_type: 'green-screen',
    },
  });

  const data = await replicateRequest(
    'POST',
    '/v1/predictions',
    apiKey,
    {
      body: env.Buffer.from(payload),
      contentType: 'application/json',
    },
  );

  if (!data.id) {
    throw new Error("Prediction response did not include an ID.");
  }
  return data;
}

/**
 * Fetch the current status of a prediction.
 */
export async function getPrediction(predictionId, apiKey) {
  return replicateRequest("GET", `/v1/predictions/${predictionId}`, apiKey);
}

/**
 * Poll a prediction until it reaches a terminal state.
 * Calls `onProgress(percent)` periodically with a value in [20, 75].
 * Returns the prediction `output` (typically a URL string).
 */
export async function pollPredictionUntilDone(
  predictionId,
  apiKey,
  onProgress,
) {
  const POLL_INTERVAL = 2000; // 2 seconds
  const MAX_POLLS = 450; // 15 minutes max

  for (let i = 0; i < MAX_POLLS; i++) {
    const data = await getPrediction(predictionId, apiKey);

    if (data.status === "succeeded") {
      return data.output;
    }
    if (data.status === "failed") {
      throw new Error(
        data.error || "Cloud processing failed. Check the input video format.",
      );
    }
    if (data.status === "canceled") {
      throw new Error("Cloud processing was canceled.");
    }

    // Asymptotic progress curve: starts fast, slows down near 75%
    if (onProgress) {
      const cloudProgress = 20 + 55 * (1 - Math.exp(-i / 30));
      onProgress(cloudProgress);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error(
    "Cloud processing timed out (15 min). Try a shorter or lower-res video.",
  );
}

/**
 * Download a URL to a local file path using streaming (pipe to disk).
 * Follows HTTP redirects automatically.
 */
export function downloadToFile(url, outputPath) {
  const env = detectEnvironment();
  if (!env.isCEP) return Promise.reject(new Error("Node.js required"));

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? env.https : env.http;

    const request = protocol.get(url, (response) => {
      // Follow redirects
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadToFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = env.fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      fileStream.on("error", (err) => {
        try {
          env.fs.unlinkSync(outputPath);
        } catch {
          /* ignore */
        }
        reject(err);
      });
    });

    request.on("error", reject);
    request.setTimeout(300000, () => {
      // 5 min download timeout
      request.destroy();
      reject(new Error("Download timed out"));
    });
  });
}
