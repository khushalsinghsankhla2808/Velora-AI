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

    return JSON.parse(cleaned.slice(first, last + 1));
  } catch (error) {
    return null;
  }
};

export default extractJson;
