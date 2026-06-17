// PATH: backend/utils/migrationHelper.js
import { FileModel } from "../models/fileModel.js";

/**
 * Infers language from the file path extension.
 * @param {string} filePath 
 * @returns {string}
 */
export const getLanguageFromPath = (filePath) => {
  if (!filePath || typeof filePath !== "string") return "plaintext";
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case "html": return "html";
    case "css": return "css";
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json": return "json";
    default: return "plaintext";
  }
};

/**
 * Helper to inline styles and scripts into a single HTML document for legacy rendering support in iframe previews.
 * @param {Array<object>} files - Array of file objects with path and content
 * @param {string} entryPath - The entry file path to bundle
 * @returns {string} Bundled HTML
 */
export const bundleHTML = (files, entryPath = "index.html") => {
  if (!Array.isArray(files)) return "";
  const indexFile = files.find(f => f.path === entryPath);
  if (!indexFile) return "";

  let html = indexFile.content;

  // Find css files and inline them
  files.forEach(file => {
    if (file.path && file.path.endsWith(".css")) {
      const fileName = file.path;
      // We look for <link ... href="fileName" ...> or <link ... href="./fileName" ...>
      const linkRegex = new RegExp(`<link[^>]*href=["']\\.?/?${fileName.replace(".", "\\.")}["'][^>]*>`, "g");
      html = html.replace(linkRegex, `<style>\n${file.content}\n</style>`);
    }
  });

  // Find js/ts files and inline them
  files.forEach(file => {
    if (file.path && (file.path.endsWith(".js") || file.path.endsWith(".ts"))) {
      const fileName = file.path;
      const scriptRegex = new RegExp(`<script[^>]*src=["']\\.?/?${fileName.replace(".", "\\.")}["'][^>]*>\\s*</script>`, "g");
      html = html.replace(scriptRegex, `<script>\n${file.content}\n</script>`);
    }
  });

  // Inject preview navigation interceptor script
  const interceptorScript = `
<script>
// Click interceptor for multi-page previews
document.addEventListener('click', function(e) {
  const anchor = e.target.closest('a');
  if (anchor && anchor.getAttribute('href')) {
    const href = anchor.getAttribute('href').trim();
    if (href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
      e.preventDefault();
      window.parent.postMessage({ type: 'NAVIGATE_PREVIEW', path: href }, '*');
    }
  }
});

// Capture and forward standard script errors
window.onerror = function(message, source, lineno, colno, error) {
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: message,
      source: source || 'inline',
      lineno: lineno || 0,
      colno: colno || 0,
      stack: error ? error.stack : ''
    }
  }, '*');
  return false;
};

// Capture and forward unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: event.reason ? (event.reason.message || String(event.reason)) : 'Unhandled Promise Rejection',
      stack: event.reason ? event.reason.stack : ''
    }
  }, '*');
});

// Intercept console.error calls
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  window.parent.postMessage({
    type: 'CONSOLE_ERROR',
    error: {
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    }
  }, '*');
};
</script>
`;
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${interceptorScript}\n</body>`);
  } else {
    html += interceptorScript;
  }

  return html;
};

/**
 * Migration helper to ensure a website document has a populated files array.
 * If the website is a legacy single-file website (has latestCode but no files),
 * we construct the simulated file array.
 * @param {object} website 
 * @returns {object} website with files populated
 */
export const ensureWebsiteFiles = (website) => {
  if (!website) return null;

  // If files array is empty or undefined, simulate legacy file structure
  if (!website.files || website.files.length === 0) {
    website.files = [
      {
        _id: "legacy",
        projectId: website._id,
        path: "index.html",
        content: website.latestCode || "",
        language: "html",
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,
      },
    ];
  }
  return website;
};

/**
 * Saves project files to DB (creating, updating, or deleting as needed) and returns an array of file ObjectIds.
 * @param {mongoose.Types.ObjectId} websiteId 
 * @param {Array<object>} filesArray 
 * @returns {Promise<Array<mongoose.Types.ObjectId>>} List of file ObjectIds
 */
export const saveWebsiteFiles = async (websiteId, filesArray) => {
  if (!Array.isArray(filesArray)) return [];

  // Get existing files for this websiteId
  const existingFiles = await FileModel.find({ projectId: websiteId });
  const existingPathsMap = new Map(existingFiles.map(f => [f.path, f]));

  const fileIds = [];
  
  // Insert or update the files in filesArray
  for (const fileItem of filesArray) {
    const language = getLanguageFromPath(fileItem.path);
    
    let fileDoc = existingPathsMap.get(fileItem.path);
    if (fileDoc) {
      fileDoc.content = fileItem.content;
      fileDoc.language = language;
      await fileDoc.save();
      fileIds.push(fileDoc._id);
      existingPathsMap.delete(fileItem.path); // kept
    } else {
      fileDoc = await FileModel.create({
        projectId: websiteId,
        path: fileItem.path,
        content: fileItem.content,
        language
      });
      fileIds.push(fileDoc._id);
    }
  }

  // Delete any files that were NOT in the new filesArray
  for (const [path, fileDoc] of existingPathsMap.entries()) {
    await FileModel.deleteOne({ _id: fileDoc._id });
  }

  return fileIds;
};
