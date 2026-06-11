/**
 * CSInterface.js — Adobe CEP Interface Library
 * Provides communication between the CEP panel and the host application.
 * Based on Adobe CEP 9.x/11.x specification.
 */

/**
 * @class CSInterface
 * This is the core class of the CEP JavaScript SDK.
 * It provides an interface to the CEP infrastructure.
 */
function CSInterface() {}

/**
 * Retrieves the scale factor of the current screen.
 * @return {number}
 */
CSInterface.prototype.getScaleFactor = function() {
    return window.__adobe_cep__ ? window.__adobe_cep__.getScaleFactor() : 1;
};

/**
 * Evaluates a JavaScript script in the host application's scripting engine.
 * @param {string} script - The JavaScript script to evaluate.
 * @param {function} [callback] - Optional callback with the result.
 */
CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
        if (callback) {
            window.__adobe_cep__.evalScript(script, callback);
        } else {
            window.__adobe_cep__.evalScript(script);
        }
    } else {
        if (callback) {
            callback("EvalScript error.");
        }
    }
};

/**
 * Retrieves the unique identifier of the extension.
 * @return {string}
 */
CSInterface.prototype.getExtensionID = function() {
    return window.__adobe_cep__ ? window.__adobe_cep__.getExtensionId() : "";
};

/**
 * Retrieves information about the host application.
 * @return {object}
 */
CSInterface.prototype.getHostEnvironment = function() {
    if (window.__adobe_cep__) {
        var hostEnv = window.__adobe_cep__.getHostEnvironment();
        return typeof hostEnv === "string" ? JSON.parse(hostEnv) : hostEnv;
    }
    return null;
};

/**
 * Returns the system path of a given type.
 * @param {string} pathType
 * @return {string}
 */
CSInterface.prototype.getSystemPath = function(pathType) {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};

/**
 * Opens a URL in the default browser.
 * @param {string} url
 */
CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (window.__adobe_cep__) {
        if (typeof window.__adobe_cep__.openURLInDefaultBrowser === "function") {
            window.__adobe_cep__.openURLInDefaultBrowser(url);
        } else {
            window.open(url);
        }
    } else {
        window.open(url);
    }
};

/**
 * Registers a callback for a CEP event.
 * @param {string} type - The event type.
 * @param {function} listener - The callback function.
 * @param {object} [obj] - The listener object.
 */
CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    }
};

/**
 * Removes a callback for a CEP event.
 * @param {string} type - The event type.
 * @param {function} listener - The callback function.
 * @param {object} [obj] - The listener object.
 */
CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
};

/**
 * Dispatches a CEP event.
 * @param {object} event - The event object.
 */
CSInterface.prototype.dispatchEvent = function(event) {
    if (window.__adobe_cep__) {
        if (typeof event === "object") {
            window.__adobe_cep__.dispatchEvent(event);
        }
    }
};

/**
 * Closes this extension.
 */
CSInterface.prototype.closeExtension = function() {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.closeExtension();
    }
};

/**
 * Returns the API version of the CEP runtime.
 * @return {object}
 */
CSInterface.prototype.getCurrentApiVersion = function() {
    if (window.__adobe_cep__) {
        var version = window.__adobe_cep__.getCurrentApiVersion();
        return typeof version === "string" ? JSON.parse(version) : version;
    }
    return { major: 0, minor: 0, micro: 0 };
};

/**
 * Requests the native file/folder selection dialog.
 * @param {string} title - Dialog title.
 * @param {string} initialPath - Initial path.
 * @param {Array} fileTypes - File type filters.
 * @param {function} callback
 */
CSInterface.prototype.showOpenDialog = function(title, initialPath, fileTypes, callback) {
    // Not available outside of CEP
    if (callback) callback({ data: [] });
};

/**
 * Requests the native save dialog.
 * @param {string} title - Dialog title.
 * @param {string} initialPath - Initial path.
 * @param {Array} fileTypes - File type filters.
 * @param {function} callback
 */
CSInterface.prototype.showSaveDialog = function(title, initialPath, fileTypes, callback) {
    // Not available outside of CEP
    if (callback) callback({ data: "" });
};

// ── System Path Constants ──
var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

// ── CSEvent Class ──
function CSEvent(type, scope, appId, extensionId) {
    this.type = type || "";
    this.scope = scope || "APPLICATION";
    this.appId = appId || "";
    this.extensionId = extensionId || "";
    this.data = "";
}
