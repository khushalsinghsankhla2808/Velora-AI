// PATH: backend/tests/diffUndo.test.js
import "./setup.js";
import { test, describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../index.js";
import { User } from "../models/userModel.js";
import { Website } from "../models/websiteModel.js";
import { FileModel } from "../models/fileModel.js";
import { Chat } from "../models/chatModel.js";

describe("AI Chat Diff Preview and Undo Integration Tests", () => {
  let mongoServer;
  let ownerUser;
  let nonOwnerUser;
  let ownerToken;
  let nonOwnerToken;
  let testWebsite;
  const originalFetch = globalThis.fetch;

  before(async () => {
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
    // Clear databases
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }

    // Create owner with credits
    ownerUser = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "owner@velora.ai",
      name: "Owner User",
      credits: 10,
    });
    ownerToken = jwt.sign(
      { id: ownerUser._id.toString() },
      process.env.JWT_SECRET || "mysecretkey"
    );

    // Create non-owner
    nonOwnerUser = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439022"),
      email: "nonowner@velora.ai",
      name: "Non-Owner User",
      credits: 10,
    });
    nonOwnerToken = jwt.sign(
      { id: nonOwnerUser._id.toString() },
      process.env.JWT_SECRET || "mysecretkey"
    );

    // Create website owned by ownerUser with some initial files
    testWebsite = await Website.create({
      user: ownerUser._id,
      title: "Diff Project",
      latestCode: "<html><body>Initial</body></html>",
      files: [],
    });

    // Seed initial files (index.html, style.css)
    const indexFile = await FileModel.create({
      projectId: testWebsite._id,
      path: "index.html",
      content: "<html><body>Initial</body></html>",
      language: "html",
    });

    const styleFile = await FileModel.create({
      projectId: testWebsite._id,
      path: "style.css",
      content: "body { background: white; }",
      language: "css",
    });

    testWebsite.files = [indexFile._id, styleFile._id];
    await testWebsite.save();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const setupMockFetch = (jsonResponse, ok = true) => {
    let mockResponse = jsonResponse;
    if (ok && jsonResponse && jsonResponse.choices) {
      const content = jsonResponse.choices[0].message.content;
      mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: content }]
            }
          }
        ]
      };
    }
    globalThis.fetch = async () => {
      return {
        ok,
        status: ok ? 200 : 400,
        json: async () => mockResponse,
        text: async () => typeof mockResponse === "string" ? mockResponse : JSON.stringify(mockResponse)
      };
    };
  };

  test("1. /chat endpoint returns proposed diff, refunds reserved credits, and does NOT save changes yet", async () => {
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: "Proposed background change.",
              files: [
                { path: "style.css", content: "body { background: blue; }" },
                { path: "script.js", content: "console.log('hi');" }
              ],
            }),
          },
        },
      ],
      usage: {
        total_tokens: 150,
      },
    };

    setupMockFetch(mockAIResponse);

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "change bg to blue and add script" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.message, "Proposed background change.");

    // Validate proposed diff data shape
    const diffs = res.body.data.filesChanged;
    assert.strictEqual(diffs.length, 2);
    
    assert.strictEqual(diffs[0].path, "style.css");
    assert.strictEqual(diffs[0].oldContent, "body { background: white; }");
    assert.strictEqual(diffs[0].newContent, "body { background: blue; }");

    assert.strictEqual(diffs[1].path, "script.js");
    assert.strictEqual(diffs[1].oldContent, "");
    assert.strictEqual(diffs[1].newContent, "console.log('hi');");

    // Verify credits are refunded (user should still have 10 credits)
    const dbUser = await User.findById(ownerUser._id);
    assert.strictEqual(dbUser.credits, 10);

    // Verify no files are updated/created in database yet
    const dbStyle = await FileModel.findOne({ projectId: testWebsite._id, path: "style.css" });
    assert.strictEqual(dbStyle.content, "body { background: white; }");

    const dbScript = await FileModel.findOne({ projectId: testWebsite._id, path: "script.js" });
    assert.strictEqual(dbScript, null);

    // Verify no chat messages logged in database yet
    const chatCount = await Chat.countDocuments({ projectId: testWebsite._id });
    assert.strictEqual(chatCount, 0);
  });

  test("2. /accept endpoint commits changes, saves previous content, deducts credits, logs chat history", async () => {
    const payload = {
      projectId: testWebsite._id.toString(),
      instruction: "change bg to blue and add script",
      message: "Proposed background change.",
      tokensUsed: 150,
      files: [
        { path: "style.css", content: "body { background: blue; }" },
        { path: "script.js", content: "console.log('hi');" }
      ]
    };

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/accept`)
      .set("Cookie", `token=${ownerToken}`)
      .send(payload);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.remainingCredits, 8); // Deducts 2 credits

    // Verify modified file
    const dbStyle = await FileModel.findOne({ projectId: testWebsite._id, path: "style.css" });
    assert.strictEqual(dbStyle.content, "body { background: blue; }");
    assert.strictEqual(dbStyle.previousContent, "body { background: white; }"); // Version history stored!

    // Verify new file
    const dbScript = await FileModel.findOne({ projectId: testWebsite._id, path: "script.js" });
    assert.ok(dbScript);
    assert.strictEqual(dbScript.content, "console.log('hi');");
    assert.strictEqual(dbScript.previousContent, "__NEW_FILE__"); // Sentinel saved!

    // Verify chat logged
    const chats = await Chat.find({ projectId: testWebsite._id }).sort({ createdAt: 1 });
    assert.strictEqual(chats.length, 2);
    assert.strictEqual(chats[0].role, "user");
    assert.strictEqual(chats[0].message, "change bg to blue and add script");
    assert.strictEqual(chats[1].role, "assistant");
    assert.strictEqual(chats[1].message, "Proposed background change.");
    assert.deepStrictEqual(chats[1].filesChanged, ["style.css", "script.js"]);
  });

  test("3. /undo endpoint restores previousContent, deletes newly created files, and rolls back chat logs", async () => {
    // 1. Commit changes first (so we have something to undo)
    const acceptPayload = {
      projectId: testWebsite._id.toString(),
      instruction: "change bg to blue and add script",
      message: "Proposed background change.",
      tokensUsed: 150,
      files: [
        { path: "style.css", content: "body { background: blue; }" },
        { path: "script.js", content: "console.log('hi');" }
      ]
    };

    await request(app)
      .post(`/api/website/${testWebsite._id}/chat/accept`)
      .set("Cookie", `token=${ownerToken}`)
      .send(acceptPayload);

    // 2. Call undo
    const undoRes = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/undo`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ projectId: testWebsite._id.toString() });

    assert.strictEqual(undoRes.status, 200);
    assert.strictEqual(undoRes.body.success, true);

    // Verify style.css content restored to white and previousContent cleared to null
    const dbStyle = await FileModel.findOne({ projectId: testWebsite._id, path: "style.css" });
    assert.strictEqual(dbStyle.content, "body { background: white; }");
    assert.strictEqual(dbStyle.previousContent, null);

    // Verify script.js newly created file is deleted from database
    const dbScript = await FileModel.findOne({ projectId: testWebsite._id, path: "script.js" });
    assert.strictEqual(dbScript, null);

    // Verify files list array in website model removed script.js
    const dbWebsite = await Website.findById(testWebsite._id);
    assert.strictEqual(dbWebsite.files.length, 2); // only index.html and style.css

    // Verify chat messages were deleted from history
    const chatCount = await Chat.countDocuments({ projectId: testWebsite._id });
    assert.strictEqual(chatCount, 0);
  });

  test("4. Non-owner gets 403 on accept and undo requests", async () => {
    const acceptRes = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/accept`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({
        projectId: testWebsite._id.toString(),
        instruction: "edit style code",
        message: "proposed change details",
        files: []
      });
    assert.strictEqual(acceptRes.status, 403);

    const undoRes = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/undo`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ projectId: testWebsite._id.toString() });
    assert.strictEqual(undoRes.status, 403);
  });
});
