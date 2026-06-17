// PATH: backend/tests/multiFile.test.js
import "./setup.js";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Website } from "../models/websiteModel.js";
import { FileModel } from "../models/fileModel.js";
import { User } from "../models/userModel.js";
import { ensureWebsiteFiles, bundleHTML, saveWebsiteFiles } from "../utils/migrationHelper.js";
import extractJson from "../utils/extractJson.js";

describe("Multi-file Project Data Model Integration Tests", () => {
  let mongoServer;

  before(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  });

  test("saveWebsiteFiles should create, update, and delete file documents properly", async () => {
    const websiteId = new mongoose.Types.ObjectId();
    
    // 1. Initial files creation
    const filesArray = [
      { path: "index.html", content: "<html></html>" },
      { path: "style.css", content: "body { color: red; }" }
    ];

    const fileIds = await saveWebsiteFiles(websiteId, filesArray);
    assert.strictEqual(fileIds.length, 2);

    // Verify DB entries
    const dbFiles = await FileModel.find({ projectId: websiteId });
    assert.strictEqual(dbFiles.length, 2);
    
    const indexFile = dbFiles.find(f => f.path === "index.html");
    assert.ok(indexFile);
    assert.strictEqual(indexFile.content, "<html></html>");
    assert.strictEqual(indexFile.language, "html");

    const styleFile = dbFiles.find(f => f.path === "style.css");
    assert.ok(styleFile);
    assert.strictEqual(styleFile.content, "body { color: red; }");
    assert.strictEqual(styleFile.language, "css");

    // 2. Update existing, delete index.html, add script.js
    const updatedFilesArray = [
      { path: "style.css", content: "body { color: blue; }" },
      { path: "script.js", content: "console.log('hi');" }
    ];

    const updatedFileIds = await saveWebsiteFiles(websiteId, updatedFilesArray);
    assert.strictEqual(updatedFileIds.length, 2);

    const dbUpdatedFiles = await FileModel.find({ projectId: websiteId });
    assert.strictEqual(dbUpdatedFiles.length, 2);

    const deletedIndex = dbUpdatedFiles.find(f => f.path === "index.html");
    assert.strictEqual(deletedIndex, undefined);

    const updatedStyle = dbUpdatedFiles.find(f => f.path === "style.css");
    assert.ok(updatedStyle);
    assert.strictEqual(updatedStyle.content, "body { color: blue; }");

    const newScript = dbUpdatedFiles.find(f => f.path === "script.js");
    assert.ok(newScript);
    assert.strictEqual(newScript.content, "console.log('hi');");
    assert.strictEqual(newScript.language, "javascript");
  });

  test("ensureWebsiteFiles compatibility transform should simulate file structure for legacy projects", async () => {
    // Create a legacy website in database (latestCode populated, files empty)
    const legacyWebsite = await Website.create({
      title: "Legacy Project",
      latestCode: "<html>Legacy Content</html>",
      files: []
    });

    const websiteObj = await Website.findById(legacyWebsite._id).lean();
    assert.strictEqual(websiteObj.files.length, 0);

    // Run transform
    ensureWebsiteFiles(websiteObj);

    assert.strictEqual(websiteObj.files.length, 1);
    assert.strictEqual(websiteObj.files[0].path, "index.html");
    assert.strictEqual(websiteObj.files[0].content, "<html>Legacy Content</html>");
    assert.strictEqual(websiteObj.files[0].language, "html");
    assert.strictEqual(websiteObj.files[0]._id, "legacy");
  });

  test("bundleHTML should correctly inline styles and scripts into index.html", async () => {
    const files = [
      { path: "index.html", content: '<html><head><link rel="stylesheet" href="style.css"></head><body><script src="script.js"></script></body></html>' },
      { path: "style.css", content: "h1 { color: green; }" },
      { path: "script.js", content: "alert('hello');" }
    ];

    const bundled = bundleHTML(files);
    assert.ok(bundled.includes("<style>"));
    assert.ok(bundled.includes("h1 { color: green; }"));
    assert.ok(bundled.includes("<script>"));
    assert.ok(bundled.includes("alert('hello');"));
    assert.ok(!bundled.includes('link rel="stylesheet"'));
    assert.ok(!bundled.includes('script src="script.js"'));
  });

  test("extractJson should validate shape and run sanity checks on path extension and content", () => {
    // 1. Valid multi-file shape
    const validJson = JSON.stringify({
      message: "Ready",
      files: [
        { path: "index.html", content: "index" },
        { path: "style.css", content: "style" }
      ]
    });
    const parsedValid = extractJson(validJson);
    assert.ok(parsedValid);
    assert.strictEqual(parsedValid.message, "Ready");
    assert.strictEqual(parsedValid.files.length, 2);

    // 2. Invalid shape - missing files
    const missingFiles = JSON.stringify({
      message: "Ready"
    });
    assert.strictEqual(extractJson(missingFiles), null);

    // 3. Invalid shape - invalid path extension
    const invalidExt = JSON.stringify({
      message: "Ready",
      files: [
        { path: "index.txt", content: "text file" }
      ]
    });
    assert.strictEqual(extractJson(invalidExt), null);

    // 4. Invalid shape - empty content
    const emptyContent = JSON.stringify({
      message: "Ready",
      files: [
        { path: "index.html", content: "" }
      ]
    });
    assert.strictEqual(extractJson(emptyContent), null);

    // 5. Invalid shape - empty path
    const emptyPath = JSON.stringify({
      message: "Ready",
      files: [
        { path: "", content: "content" }
      ]
    });
    assert.strictEqual(extractJson(emptyPath), null);
  });
});
