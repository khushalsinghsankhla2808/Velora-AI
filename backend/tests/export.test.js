// PATH: backend/tests/export.test.js
import "./setup.js";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../index.js";
import { User } from "../models/userModel.js";
import { Website } from "../models/websiteModel.js";
import { FileModel } from "../models/fileModel.js";

describe("Project Export Integration Tests", () => {
  let mongoServer;
  let ownerUser;
  let nonOwnerUser;
  let ownerToken;
  let nonOwnerToken;
  let testWebsite;

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

    // Create owner
    ownerUser = await User.create({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      email: "owner@velora.ai",
      name: "Owner User",
      credits: 100,
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
      credits: 100,
    });
    nonOwnerToken = jwt.sign(
      { id: nonOwnerUser._id.toString() },
      process.env.JWT_SECRET || "mysecretkey"
    );

    // Create website owned by ownerUser
    testWebsite = await Website.create({
      user: ownerUser._id,
      title: "My Awesome Portfolio",
      latestCode: "<html>Index</html>",
      files: []
    });

    // Add files to project
    const file1 = await FileModel.create({
      projectId: testWebsite._id,
      path: "index.html",
      content: "<html>Test</html>",
      language: "html"
    });
    const file2 = await FileModel.create({
      projectId: testWebsite._id,
      path: "css/style.css",
      content: "body { color: red; }",
      language: "css"
    });

    testWebsite.files = [file1._id, file2._id];
    await testWebsite.save();
  });

  test("Owner can export project as ZIP", async () => {
    const res = await request(app)
      .get(`/api/website/${testWebsite._id}/export`)
      .set("Cookie", `token=${ownerToken}`)
      .buffer()
      .parse((res, callback) => {
        let data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers["content-type"], "application/zip");
    assert.ok(res.headers["content-disposition"].includes("My_Awesome_Portfolio_export.zip"));

    // Verify response is a ZIP file (Magic bytes: PK\x03\x04)
    const zipMagicBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    assert.deepStrictEqual(res.body.subarray(0, 4), zipMagicBytes);

    // Verify ZIP contains file paths we added
    const textContent = res.body.toString("utf-8");
    assert.ok(textContent.includes("index.html"));
    assert.ok(textContent.includes("css/style.css"));
  });

  test("Non-owner gets 403 on export", async () => {
    const res = await request(app)
      .get(`/api/website/${testWebsite._id}/export`)
      .set("Cookie", `token=${nonOwnerToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, "ACCESS_DENIED");
  });

  test("Unauthenticated user gets 401", async () => {
    const res = await request(app)
      .get(`/api/website/${testWebsite._id}/export`);

    assert.strictEqual(res.status, 401);
  });

  test("Invalid website ID format returns 422", async () => {
    const res = await request(app)
      .get(`/api/website/invalid-id/export`)
      .set("Cookie", `token=${ownerToken}`);

    assert.strictEqual(res.status, 422);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, "VALIDATION_ERROR");
  });

  test("Non-existent website ID returns 404", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/website/${nonExistentId}/export`)
      .set("Cookie", `token=${ownerToken}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, "WEBSITE_NOT_FOUND");
  });
});
