// PATH: backend/tests/chat.test.js
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

describe("Project AI Chat Integration Tests", () => {
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
      title: "Chat Project",
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

  test("Owner can modify files via targeted AI chat (2 credits charged, unmentioned files untouched)", async () => {
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: "I updated style.css and added script.js.",
              files: [
                { path: "style.css", content: "body { background: blue; }" },
                { path: "script.js", content: "console.log('hello');" },
              ],
            }),
          },
        },
      ],
      usage: {
        total_tokens: 250,
      },
    };

    setupMockFetch(mockAIResponse);

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "change bg to blue and add script.js" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.message, "I updated style.css and added script.js.");
    
    // Accept the proposed changes
    const acceptRes = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/accept`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        projectId: testWebsite._id.toString(),
        instruction: "change bg to blue and add script.js",
        message: res.body.data.message,
        tokensUsed: res.body.data.tokensUsed,
        files: res.body.data.filesChanged.map(f => ({ path: f.path, content: f.newContent }))
      });

    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.success, true);
    assert.deepStrictEqual(acceptRes.body.data.filesChanged, ["style.css", "script.js"]);
    assert.strictEqual(acceptRes.body.data.remainingCredits, 8); // 10 - 2 = 8

    // Verify database state:
    // 1. Unmentioned file (index.html) is untouched
    const dbIndex = await FileModel.findOne({ projectId: testWebsite._id, path: "index.html" });
    assert.ok(dbIndex);
    assert.strictEqual(dbIndex.content, "<html><body>Initial</body></html>");

    // 2. Mentioned files updated/created
    const dbStyle = await FileModel.findOne({ projectId: testWebsite._id, path: "style.css" });
    assert.ok(dbStyle);
    assert.strictEqual(dbStyle.content, "body { background: blue; }");

    const dbScript = await FileModel.findOne({ projectId: testWebsite._id, path: "script.js" });
    assert.ok(dbScript);
    assert.strictEqual(dbScript.content, "console.log('hello');");
    assert.strictEqual(dbScript.language, "javascript");

    // 3. User credits updated
    const updatedUser = await User.findById(ownerUser._id);
    assert.strictEqual(updatedUser.credits, 8);

    // 4. Chat messages logged (1 user, 1 assistant)
    const chats = await Chat.find({ projectId: testWebsite._id }).sort({ createdAt: 1 });
    assert.strictEqual(chats.length, 2);
    
    assert.strictEqual(chats[0].role, "user");
    assert.strictEqual(chats[0].message, "change bg to blue and add script.js");

    assert.strictEqual(chats[1].role, "assistant");
    assert.strictEqual(chats[1].message, "I updated style.css and added script.js.");
    assert.deepStrictEqual(chats[1].filesChanged, ["style.css", "script.js"]);
    assert.strictEqual(chats[1].tokensUsed, 0);
  });

  test("Non-owner gets 403 error on chat edits", async () => {
    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ instruction: "change colors" });

    assert.strictEqual(res.status, 403);
  });

  test("Chat edit on non-existent project returns 404", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/website/${nonExistentId}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "make responsive" });

    assert.strictEqual(res.status, 404);
  });

  test("Insufficient credits returns 402", async () => {
    // Reduce credits to 1
    await User.findByIdAndUpdate(ownerUser._id, { credits: 1 });

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "change colors" });

    assert.strictEqual(res.status, 402);
  });

  test("Path traversal in AI response is rejected and credits refunded", async () => {
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: "Malicious update",
              files: [
                { path: "../etc/passwd.js", content: "malicious" },
              ],
            }),
          },
        },
      ],
      usage: {
        total_tokens: 100,
      },
    };

    setupMockFetch(mockAIResponse);

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "malicious update request" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "PATH_TRAVERSAL_DETECTED");

    // Credits should be fully refunded to 10
    const updatedUser = await User.findById(ownerUser._id);
    assert.strictEqual(updatedUser.credits, 10);
  });

  test("Invalid AI response formats are rejected and credits refunded", async () => {
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: "Not JSON at all",
          },
        },
      ],
      usage: {
        total_tokens: 50,
      },
    };

    setupMockFetch(mockAIResponse);

    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ instruction: "give raw text response" });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, "INVALID_AI_RESPONSE");

    // Refunded
    const updatedUser = await User.findById(ownerUser._id);
    assert.strictEqual(updatedUser.credits, 10);
  });

  test("Owner can fetch paginated chat history", async () => {
    // Seed some chat logs
    const now = Date.now();
    const chat1 = await Chat.create({
      projectId: testWebsite._id,
      userId: ownerUser._id,
      role: "user",
      message: "Message 1",
      createdAt: new Date(now - 3000),
    });

    const chat2 = await Chat.create({
      projectId: testWebsite._id,
      userId: ownerUser._id,
      role: "assistant",
      message: "Reply 1",
      createdAt: new Date(now - 2000),
    });

    const chat3 = await Chat.create({
      projectId: testWebsite._id,
      userId: ownerUser._id,
      role: "user",
      message: "Message 2",
      createdAt: new Date(now - 1000),
    });

    // 1. Get all history
    const resAll = await request(app)
      .get(`/api/website/${testWebsite._id}/chat`)
      .set("Cookie", `token=${ownerToken}`);

    assert.strictEqual(resAll.status, 200);
    assert.strictEqual(resAll.body.success, true);
    assert.strictEqual(resAll.body.data.messages.length, 3);
    assert.strictEqual(resAll.body.data.messages[0].message, "Message 1");
    assert.strictEqual(resAll.body.data.messages[1].message, "Reply 1");
    assert.strictEqual(resAll.body.data.messages[2].message, "Message 2");

    // 2. Paginate using `before`
    const resPaginated = await request(app)
      .get(`/api/website/${testWebsite._id}/chat?before=${chat3.createdAt.toISOString()}`)
      .set("Cookie", `token=${ownerToken}`);

    assert.strictEqual(resPaginated.status, 200);
    assert.strictEqual(resPaginated.body.data.messages.length, 2);
    assert.strictEqual(resPaginated.body.data.messages[0].message, "Message 1");
    assert.strictEqual(resPaginated.body.data.messages[1].message, "Reply 1");
  });

  test("Targeted AI chat edits cannot delete files that the user did not ask to modify/delete", async () => {
    // We already have index.html and style.css seeded in beforeEach.
    // The AI mock response will only return updates to style.css.
    const mockAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              message: "I updated style.css only.",
              files: [
                { path: "style.css", content: "body { color: green; }" },
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
      .send({ instruction: "change text color in style.css" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Accept the proposed changes
    const acceptRes = await request(app)
      .post(`/api/website/${testWebsite._id}/chat/accept`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        projectId: testWebsite._id.toString(),
        instruction: "change text color in style.css",
        message: res.body.data.message,
        tokensUsed: res.body.data.tokensUsed,
        files: res.body.data.filesChanged.map(f => ({ path: f.path, content: f.newContent }))
      });

    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.success, true);

    // Verify index.html still exists in database and is unchanged
    const dbIndex = await FileModel.findOne({ projectId: testWebsite._id, path: "index.html" });
    assert.ok(dbIndex);
    assert.strictEqual(dbIndex.content, "<html><body>Initial</body></html>");

    // Verify style.css is updated
    const dbStyle = await FileModel.findOne({ projectId: testWebsite._id, path: "style.css" });
    assert.ok(dbStyle);
    assert.strictEqual(dbStyle.content, "body { color: green; }");

    // Verify the project files array in the website document still contains both files
    const dbWebsite = await Website.findById(testWebsite._id);
    assert.strictEqual(dbWebsite.files.length, 2);
  });
});
