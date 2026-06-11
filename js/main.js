// ══════════════════════════════════════════
//  Image Search Extension — Main Script
//  Works in both CEP (AE panel) and browser
// ══════════════════════════════════════════

// ── Detect environment ──
var IS_CEP = false;
var nodeFs, nodePath, nodeHttps, nodeHttp, nodeOs;

try {
    nodeFs = require("fs");
    nodePath = require("path");
    nodeHttps = require("https");
    nodeHttp = require("http");
    nodeOs = require("os");
    IS_CEP = true;
    if (window._log) window._log('✅ Node.js loaded (CEP mode)');
} catch (e) {
    IS_CEP = false;
    if (window._log) window._log('⚠️ No Node.js (browser mode): ' + e.message);
}

// ── CSInterface (only in CEP) ──
var cs = null;
try {
    cs = new CSInterface();
    if (window._log) window._log('✅ CSInterface created');
} catch (e) {
    if (window._log) window._log('⚠️ CSInterface failed: ' + e.message);
}

// ── Unsplash API ──
var UNSPLASH_ACCESS_KEY = "4-LwakiGNcRca-LkpiBfcyWfmLZT1ZS2DT6FAws-r7o";

// ── Pixabay API ──
// Get your free key at: https://pixabay.com/api/docs/
var PIXABAY_API_KEY = "56244709-043cbbdc718f8329df77bef03";

var PER_PAGE = 20;

// ── DOM References ──
var searchInput = document.getElementById("searchInput");
var searchBtn = document.getElementById("searchBtn");
var resultsDiv = document.getElementById("results");
var statusEl = document.getElementById("status");
var loadMoreBtn = document.getElementById("loadMoreBtn");
var toastContainer = document.getElementById("toastContainer");
var statusBarText = document.getElementById("statusBarText");
var modePhotosBtn = document.getElementById("modePhotos");
var modePngsBtn = document.getElementById("modePngs");

// ── State ──
var currentQuery = "";
var currentPage = 1;
var totalPages = 1;
var searchMode = "photos"; // "photos" (Unsplash) or "pngs" (Pixabay)

// ══════════════════════════════════════════
//  UNSPLASH API — works in both environments
// ══════════════════════════════════════════

function unsplashSearch(query, page, callback) {
    var apiPath = "/search/photos"
        + "?query=" + encodeURIComponent(query)
        + "&page=" + page
        + "&per_page=" + PER_PAGE
        + "&client_id=" + UNSPLASH_ACCESS_KEY;

    if (window._log) window._log('🔍 Unsplash API: ' + query + ' page=' + page);
    nodeHttpsGet("api.unsplash.com", apiPath, callback);
}

// ══════════════════════════════════════════
//  PIXABAY API — transparent PNGs
// ══════════════════════════════════════════

function pixabaySearch(query, page, callback) {
    if (!PIXABAY_API_KEY || PIXABAY_API_KEY === "YOUR_PIXABAY_API_KEY_HERE") {
        callback(new Error("Pixabay API key not set! Edit main.js line 37 with your key from pixabay.com/api/docs"), null);
        return;
    }

    var apiPath = "/api/"
        + "?key=" + PIXABAY_API_KEY
        + "&q=" + encodeURIComponent(query)
        + "&page=" + page
        + "&per_page=" + PER_PAGE
        + "&image_type=photo"
        + "&colors=transparent";

    if (window._log) window._log('🖼️ Pixabay API: ' + query + ' page=' + page + ' (transparent)');
    nodeHttpsGet("pixabay.com", apiPath, function (err, data) {
        if (err) { callback(err, null); return; }
        // Normalize Pixabay response to match our expected format
        var totalHits = data.totalHits || 0;
        var hitsPerPage = PER_PAGE;
        callback(null, {
            total: totalHits,
            total_pages: Math.ceil(totalHits / hitsPerPage),
            results: (data.hits || []).map(function (hit) {
                return {
                    id: String(hit.id),
                    alt_description: hit.tags || "image",
                    urls: {
                        small: hit.webformatURL,
                        full: hit.largeImageURL
                    },
                    user: {
                        name: hit.user,
                        links: { html: "https://pixabay.com/users/" + hit.user + "-" + hit.user_id }
                    }
                };
            })
        });
    });
}

// ══════════════════════════════════════════
//  SHARED HTTP GET (Node.js or fetch)
// ══════════════════════════════════════════

function nodeHttpsGet(hostname, apiPath, callback) {
    if (IS_CEP) {
        var options = {
            hostname: hostname,
            path: apiPath,
            method: "GET",
            headers: { "User-Agent": "FindYourAssets/1.0" }
        };

        var req = nodeHttps.request(options, function (res) {
            var body = "";
            res.on("data", function (chunk) { body += chunk; });
            res.on("end", function () {
                if (res.statusCode !== 200) {
                    if (window._log) window._log('❌ API HTTP ' + res.statusCode + ': ' + body.substring(0, 200));
                    callback(new Error("API error " + res.statusCode + ": " + body.substring(0, 100)), null);
                    return;
                }
                try {
                    var data = JSON.parse(body);
                    callback(null, data);
                } catch (e) {
                    if (window._log) window._log('❌ JSON parse failed: ' + body.substring(0, 200));
                    callback(new Error("Invalid response from API"), null);
                }
            });
        });

        req.on("error", function (err) { callback(err, null); });
        req.setTimeout(15000, function () {
            req.destroy();
            callback(new Error("Request timed out"), null);
        });
        req.end();
    } else {
        var url = "https://" + hostname + apiPath;
        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (data) { callback(null, data); })
            .catch(function (err) { callback(err, null); });
    }
}

// ══════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════

function searchImages() {
    var query = searchInput.value.trim();
    if (window._log) window._log('🔍 Search triggered: "' + query + '"');
    if (!query) return;

    currentQuery = query;
    currentPage = 1;
    resultsDiv.innerHTML = '<div class="spinner-wrap"></div>';
    statusEl.textContent = 'Searching for "' + query + '"…';
    loadMoreBtn.style.display = "none";
    if (statusBarText) statusBarText.textContent = "Searching…";

    fetchAndRender(true);
}

function loadMore() {
    currentPage++;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";
    fetchAndRender(false);
}

function fetchAndRender(isNewSearch) {
    var searchFn = (searchMode === "pngs") ? pixabaySearch : unsplashSearch;

    searchFn(currentQuery, currentPage, function (err, data) {
        if (err) {
            if (isNewSearch) resultsDiv.innerHTML = "";
            statusEl.textContent = "⚠ Something went wrong. Please try again.";
            if (statusBarText) statusBarText.textContent = "Error";
            showToast("error", "Search failed: " + err.message);
            console.error("Search error:", err);
            return;
        }

        totalPages = data.total_pages;

        if (data.results.length === 0 && isNewSearch) {
            resultsDiv.innerHTML =
                '<div class="empty-state">'
                + '<div class="empty-icon">🔍</div>'
                + '<p>No results found for "' + currentQuery + '"</p>'
                + '</div>';
            statusEl.textContent = "";
            if (statusBarText) statusBarText.textContent = "No results";
            return;
        }

        statusEl.textContent = data.total.toLocaleString() + " images — page " + currentPage + "/" + totalPages;
        if (statusBarText) statusBarText.textContent = data.total.toLocaleString() + " results";

        if (isNewSearch) resultsDiv.innerHTML = "";
        renderResults(data.results);

        if (currentPage < totalPages) {
            loadMoreBtn.style.display = "flex";
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = "Load More";
        } else {
            loadMoreBtn.style.display = "none";
        }
    });
}

// ══════════════════════════════════════════
//  RENDER IMAGE CARDS
// ══════════════════════════════════════════

function renderResults(images) {
    images.forEach(function (img, i) {
        var card = document.createElement("div");
        card.className = "img-card";
        card.style.animationDelay = (i * 0.04) + "s";

        var imgEl = document.createElement("img");
        imgEl.alt = img.alt_description || "image";
        imgEl.setAttribute("loading", "lazy");
        card.appendChild(imgEl);

        // Pixabay blocks hotlinking — download thumbnail via Node.js
        if (IS_CEP && searchMode === "pngs") {
            imgEl.style.background = "var(--bg-tertiary)";
            imgEl.style.minHeight = "100px";
            loadImageAsDataUri(img.urls.small, function (dataUri) {
                if (dataUri) {
                    imgEl.src = dataUri;
                    imgEl.style.background = "";
                    imgEl.style.minHeight = "";
                }
            });
        } else {
            imgEl.src = img.urls.small;
        }

        var overlay = document.createElement("div");
        overlay.className = "overlay";
        var link = document.createElement("a");
        link.href = img.user.links.html + "?utm_source=ae_extension&utm_medium=referral";
        link.target = "_blank";
        link.textContent = img.user.name;
        overlay.textContent = "by ";
        overlay.appendChild(link);
        card.appendChild(overlay);

        // Click handler — import in AE or download in browser
        card.addEventListener("click", function (e) {
            e.stopPropagation();
            if (window._log) window._log('👆 Card clicked! IS_CEP=' + IS_CEP + ' cs=' + !!cs);
            if (card.classList.contains("importing") || card.classList.contains("import-success")) return;

            if (IS_CEP && cs) {
                handleImport(card, img);
            } else {
                handleBrowserDownload(card, img);
            }
        });

        resultsDiv.appendChild(card);
    });
}

// ══════════════════════════════════════════
//  LOAD IMAGE AS DATA URI (for Pixabay hotlink workaround)
// ══════════════════════════════════════════

function loadImageAsDataUri(url, callback) {
    if (!IS_CEP) { callback(null); return; }

    var protocol = url.indexOf("https") === 0 ? nodeHttps : nodeHttp;

    protocol.get(url, function (response) {
        // Follow redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            loadImageAsDataUri(response.headers.location, callback);
            return;
        }

        if (response.statusCode !== 200) {
            callback(null);
            return;
        }

        var chunks = [];
        response.on("data", function (chunk) { chunks.push(chunk); });
        response.on("end", function () {
            var buffer = Buffer.concat(chunks);
            var contentType = response.headers["content-type"] || "image/jpeg";
            var base64 = buffer.toString("base64");
            callback("data:" + contentType + ";base64," + base64);
        });
    }).on("error", function () {
        callback(null);
    });
}

// ══════════════════════════════════════════
//  CEP: DOWNLOAD + IMPORT INTO AE
// ══════════════════════════════════════════

function handleImport(card, img) {
    if (window._log) window._log('⬇️ handleImport started for: ' + (img.alt_description || img.id));
    card.classList.add("importing");
    if (statusBarText) statusBarText.textContent = "Downloading…";

    getSaveDirectory(function (saveDir) {
        if (window._log) window._log('📁 Save dir: ' + saveDir);
        var safeName = (img.alt_description || img.id || "image")
            .replace(/[^a-z0-9]/gi, "_")
            .substring(0, 60);
        var baseName = safeName + "_" + img.id;
        // Extension will be determined by content-type during download
        var tempPath = nodePath.join(saveDir, baseName + ".tmp");

        downloadFileWithExt(img.urls.full, tempPath, baseName, saveDir, function (err, finalPath) {
            if (err) {
                card.classList.remove("importing");
                card.classList.add("import-error");
                showToast("error", "Download failed: " + err.message);
                if (statusBarText) statusBarText.textContent = "Download failed";
                console.error("Download error:", err);
                setTimeout(function () { card.classList.remove("import-error"); }, 2500);
                return;
            }

            var escapedPath = finalPath.replace(/\\/g, "/");
            cs.evalScript('importFileToProject("' + escapedPath + '")', function (result) {
                card.classList.remove("importing");

                if (!result || result.indexOf("ERROR") === 0 || result === "EvalScript error.") {
                    card.classList.add("import-error");
                    showToast("error", "Import failed: " + (result || "Unknown error"));
                    if (statusBarText) statusBarText.textContent = "Import failed";
                    setTimeout(function () { card.classList.remove("import-error"); }, 2500);
                    return;
                }

                card.classList.add("import-success");
                var importedName = result.replace("OK:", "");
                showToast("success", "Imported: " + importedName);
                if (statusBarText) statusBarText.textContent = "Imported ✓";
                setTimeout(function () { card.classList.remove("import-success"); }, 2000);
            });
        });
    });
}

// ══════════════════════════════════════════
//  BROWSER: Regular download (fallback)
// ══════════════════════════════════════════

function handleBrowserDownload(card, img) {
    card.classList.add("importing");
    fetch(img.urls.full)
        .then(function (res) { return res.blob(); })
        .then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = (img.alt_description || img.id || "image").replace(/[^a-z0-9]/gi, "_") + ".jpg";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            card.classList.remove("importing");
            card.classList.add("import-success");
            showToast("success", "Downloaded!");
            setTimeout(function () { card.classList.remove("import-success"); }, 2000);
        })
        .catch(function (err) {
            card.classList.remove("importing");
            card.classList.add("import-error");
            showToast("error", "Download failed");
            setTimeout(function () { card.classList.remove("import-error"); }, 2500);
        });
}

// ══════════════════════════════════════════
//  GET SAVE DIRECTORY (CEP only)
// ══════════════════════════════════════════

function getSaveDirectory(callback) {
    cs.evalScript("getProjectFolder()", function (result) {
        var baseDir;

        if (result && result !== "" && result !== "EvalScript error.") {
            baseDir = result;
        } else {
            baseDir = nodeOs.tmpdir().replace(/\\/g, "/");
        }

        var importDir = nodePath.join(baseDir, "_ae_imports");

        if (!nodeFs.existsSync(importDir)) {
            nodeFs.mkdirSync(importDir, { recursive: true });
        }

        callback(importDir);
    });
}

// ══════════════════════════════════════════
//  DOWNLOAD FILE (Node.js)
// ══════════════════════════════════════════

function downloadFileWithExt(url, tempPath, baseName, saveDir, callback) {
    var protocol = url.indexOf("https") === 0 ? nodeHttps : nodeHttp;

    var request = protocol.get(url, function (response) {
        // Follow redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            downloadFileWithExt(response.headers.location, tempPath, baseName, saveDir, callback);
            return;
        }

        if (response.statusCode !== 200) {
            callback(new Error("HTTP " + response.statusCode), null);
            return;
        }

        // Detect correct extension from content-type
        var contentType = response.headers["content-type"] || "image/jpeg";
        var extMap = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "image/svg+xml": ".svg",
            "image/tiff": ".tiff",
            "image/bmp": ".bmp"
        };
        var ext = extMap[contentType.split(";")[0].trim()] || ".jpg";
        var finalPath = nodePath.join(saveDir, baseName + ext);

        if (window._log) window._log('📦 Content-Type: ' + contentType + ' → ' + ext);

        // Skip if already downloaded with correct extension
        if (nodeFs.existsSync(finalPath)) {
            callback(null, finalPath);
            return;
        }

        var fileStream = nodeFs.createWriteStream(finalPath);
        response.pipe(fileStream);

        fileStream.on("finish", function () {
            fileStream.close(function () { callback(null, finalPath); });
        });

        fileStream.on("error", function (err) {
            nodeFs.unlink(finalPath, function () {});
            callback(err, null);
        });
    });

    request.on("error", function (err) { callback(err, null); });
    request.setTimeout(30000, function () {
        request.destroy();
        callback(new Error("Download timed out"), null);
    });
}

// ══════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════════════

function showToast(type, message) {
    if (!toastContainer) return;
    var icons = { success: "✅", error: "❌", info: "ℹ️" };

    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;

    var iconSpan = document.createElement("span");
    iconSpan.className = "toast-icon";
    iconSpan.textContent = icons[type] || "ℹ️";

    var msgSpan = document.createElement("span");
    msgSpan.className = "toast-message";
    msgSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);

    setTimeout(function () {
        toast.classList.add("toast-exit");
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

// ══════════════════════════════════════════
//  EVENT LISTENERS
// ══════════════════════════════════════════

searchBtn.addEventListener("click", searchImages);

searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchImages();
});

loadMoreBtn.addEventListener("click", loadMore);

// ── Mode toggle ──
if (modePhotosBtn) {
    modePhotosBtn.addEventListener("click", function () {
        searchMode = "photos";
        modePhotosBtn.classList.add("active");
        modePngsBtn.classList.remove("active");
        searchInput.placeholder = "Search photos…";
        if (window._log) window._log('📷 Mode: Photos (Unsplash)');
        // Re-search if there's a query
        if (currentQuery) searchImages();
    });
}

if (modePngsBtn) {
    modePngsBtn.addEventListener("click", function () {
        searchMode = "pngs";
        modePngsBtn.classList.add("active");
        modePhotosBtn.classList.remove("active");
        searchInput.placeholder = "Search transparent PNGs…";
        if (window._log) window._log('🖼️ Mode: PNGs (Pixabay)');
        // Re-search if there's a query
        if (currentQuery) searchImages();
    });
}

searchInput.focus();

if (statusBarText) {
    statusBarText.textContent = IS_CEP ? "Ready — search & import" : "Ready — browser mode";
}