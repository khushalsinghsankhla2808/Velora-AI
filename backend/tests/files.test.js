// PATH: backend/tests/files.test.js
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

describe("Project File CRUD Integration Tests", () => {
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
      title: "Test Project",
      latestCode: "<html>Index</html>",
      files: []
    });
  });

  test("Owner can create, list, retrieve, update, rename, and delete files", async () => {
    // 1. Create a file
    const createRes = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "css/style.css", content: "body { color: blue; }", language: "css" });

    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.success, true);
    const createdFileId = createRes.body.data.file._id;
    assert.ok(createdFileId);

    // 2. List files
    const listRes = await request(app)
      .get(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`);

    assert.strictEqual(listRes.status, 200);
    // Since it migrated the legacy index.html first when we created style.css,
    // there should be 2 files in the project now: index.html and css/style.css.
    assert.strictEqual(listRes.body.data.files.length, 2);

    // 3. Get single file
    const getRes = await request(app)
      .get(`/api/website/${testWebsite._id}/files/${createdFileId}`)
      .set("Cookie", `token=${ownerToken}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.data.file.path, "css/style.css");

    // 4. Update file content
    const updateRes = await request(app)
      .put(`/api/website/${testWebsite._id}/files/${createdFileId}`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ content: "body { color: red; }" });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.file.content, "body { color: red; }");

    // 5. Rename file
    const renameRes = await request(app)
      .patch(`/api/website/${testWebsite._id}/files/${createdFileId}/rename`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ newPath: "css/custom.css" });
    assert.strictEqual(renameRes.status, 200);
    assert.strictEqual(renameRes.body.data.file.path, "css/custom.css");

    // 6. Delete file
    const deleteRes = await request(app)
      .delete(`/api/website/${testWebsite._id}/files/${createdFileId}`)
      .set("Cookie", `token=${ownerToken}`);
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.body.success, true);

    // Verify it is deleted
    const dbFile = await FileModel.findById(createdFileId);
    assert.strictEqual(dbFile, null);
  });

  test("Non-owner gets 403 on every file operation", async () => {
    // 1. Create file block
    const createRes = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ path: "css/style.css", content: "body {}", language: "css" });
    assert.strictEqual(createRes.status, 403);

    // 2. List files block
    const listRes = await request(app)
      .get(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${nonOwnerToken}`);
    assert.strictEqual(listRes.status, 403);

    // 3. Get single file block
    const getRes = await request(app)
      .get(`/api/website/${testWebsite._id}/files/507f1f77bcf86cd799439011`)
      .set("Cookie", `token=${nonOwnerToken}`);
    assert.strictEqual(getRes.status, 403);

    // 4. Update file block
    const updateRes = await request(app)
      .put(`/api/website/${testWebsite._id}/files/507f1f77bcf86cd799439011`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ content: "body {}" });
    assert.strictEqual(updateRes.status, 403);

    // 5. Rename file block
    const renameRes = await request(app)
      .patch(`/api/website/${testWebsite._id}/files/507f1f77bcf86cd799439011/rename`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ newPath: "css/new.css" });
    assert.strictEqual(renameRes.status, 403);

    // 6. Delete file block
    const deleteRes = await request(app)
      .delete(`/api/website/${testWebsite._id}/files/507f1f77bcf86cd799439011`)
      .set("Cookie", `token=${nonOwnerToken}`);
    assert.strictEqual(deleteRes.status, 403);

    // 7. Create folder block
    const folderRes = await request(app)
      .post(`/api/website/${testWebsite._id}/folders`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({ path: "images" });
    assert.strictEqual(folderRes.status, 403);
  });

  test("Invalid paths and path traversal attempts are rejected with 422", async () => {
    // Path traversal with ".."
    const res1 = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "../../etc/passwd", content: "body {}", language: "css" });
    assert.strictEqual(res1.status, 422);

    // Path traversal with leading "/"
    const res2 = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "/etc/passwd", content: "body {}", language: "css" });
    assert.strictEqual(res2.status, 422);

    // Empty path
    const res3 = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "", content: "body {}", language: "css" });
    assert.strictEqual(res3.status, 422);
  });

  test("Deleting a non-existent file returns 404", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/website/${testWebsite._id}/files/${nonExistentId}`)
      .set("Cookie", `token=${ownerToken}`);
    
    assert.strictEqual(res.status, 404);
  });

  test("Renaming to a path that already exists returns 409", async () => {
    // Create first file
    await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "css/style.css", content: "body {}" });

    // Create second file
    const file2Res = await request(app)
      .post(`/api/website/${testWebsite._id}/files`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "css/theme.css", content: "body {}" });

    const file2Id = file2Res.body.data.file._id;

    // Try to rename file2 to style.css
    const res = await request(app)
      .patch(`/api/website/${testWebsite._id}/files/${file2Id}/rename`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ newPath: "css/style.css" });

    assert.strictEqual(res.status, 409);
  });

  test("Owner can create a folder (persisted via virtual .keep file)", async () => {
    const res = await request(app)
      .post(`/api/website/${testWebsite._id}/folders`)
      .set("Cookie", `token=${ownerToken}`)
      .send({ path: "assets/images" });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.folder.path, "assets/images");

    // Verify .keep file exists in database
    const dbKeepFile = await FileModel.findOne({ projectId: testWebsite._id, path: "assets/images/.keep" });
    assert.ok(dbKeepFile);
    assert.strictEqual(dbKeepFile.content, "");
  });
});
