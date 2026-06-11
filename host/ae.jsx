// ══════════════════════════════════════════
//  Image Search Extension — Host Script
//  Runs inside After Effects (ExtendScript)
// ══════════════════════════════════════════

/**
 * Create a new composition (kept from original)
 */
function createComp() {
    app.project.items.addComp(
        "My First Extension",
        1920,
        1080,
        1,
        10,
        30
    );
}

/**
 * Import a file into the AE project
 * @param {string} filePath - Absolute path to the file (use forward slashes)
 * @returns {string} "OK" on success, or an error message
 */
function importFileToProject(filePath) {
    try {
        var f = new File(filePath);
        if (!f.exists) {
            return "ERROR: File not found at " + filePath;
        }

        var importOptions = new ImportOptions(f);
        var importedItem = app.project.importFile(importOptions);

        return "OK:" + importedItem.name;
    } catch (e) {
        return "ERROR: " + e.toString();
    }
}

/**
 * Get the folder where the current project is saved
 * Returns empty string if project is not saved yet
 * @returns {string} Absolute path to the project folder (forward slashes)
 */
function getProjectFolder() {
    try {
        if (app.project.file) {
            var projectFile = app.project.file;
            var folder = projectFile.parent;
            // Return path with forward slashes for Node.js compatibility
            return folder.fsName.replace(/\\/g, "/");
        }
        return "";
    } catch (e) {
        return "";
    }
}