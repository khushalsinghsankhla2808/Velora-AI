// PATH: backend/utils/extractJson.js
const extractJson = (text) => {
  try {
    if (!text) {
      return null;
    }

    const cleaned = text.replace(/```json/g, "").replace(/```/g, "");
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first === -1 || last === -1) {
      return null;
    }

    const parsed = JSON.parse(cleaned.slice(first, last + 1));

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.message !== "string") {
      return null;
    }

    if (!Array.isArray(parsed.files)) {
      return null;
    }

    const validExtensions = /\.(html|css|js|jsx|ts|tsx|json)$/i;

    for (const file of parsed.files) {
      if (!file || typeof file !== "object") {
        return null;
      }
      if (typeof file.path !== "string" || !file.path.trim()) {
        return null;
      }
      if (!validExtensions.test(file.path)) {
        return null;
      }
      if (typeof file.content !== "string" || !file.content.trim()) {
        return null;
      }
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

export default extractJson;
