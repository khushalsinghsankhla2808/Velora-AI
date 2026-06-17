/**
 * Velora AI - GitHub Export Flow Integration Tests
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import cookieParser from "cookie-parser";

// Mock rate limiters and express-rate-limit security middlewares to prevent 429 errors in tests
jest.unstable_mockModule("../middlewares/security.js", () => {
  const mockMiddleware = (req, res, next) => next();
  return {
    paymentLimiter: mockMiddleware,
    globalLimiter: mockMiddleware,
    generateLimiter: mockMiddleware,
    updateLimiter: mockMiddleware,
    securityHeaders: mockMiddleware,
    corsOptions: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
  };
});

// Mock Octokit rest client
jest.unstable_mockModule("@octokit/rest", () => {
  const mockGetAuthenticated = jest.fn();
  const mockCreateForAuthenticatedUser = jest.fn();
  const mockCreateOrUpdateFileContents = jest.fn();
  const mockDelete = jest.fn();

  class MockOctokit {
    constructor(options) {
      this.options = options;
      this.users = {
        getAuthenticated: mockGetAuthenticated,
      };
      this.repos = {
        createForAuthenticatedUser: mockCreateForAuthenticatedUser,
        createOrUpdateFileContents: mockCreateOrUpdateFileContents,
        delete: mockDelete,
      };
    }
  }

  return {
    Octokit: MockOctokit,
    _mocks: {
      getAuthenticated: mockGetAuthenticated,
      createForAuthenticatedUser: mockCreateForAuthenticatedUser,
      createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      delete: mockDelete,
    },
  };
});

// Import dynamically to ensure mocks are applied first
const { _mocks: octokitMocks } = await import("@octokit/rest");
const { User } = await import("../models/userModel.js");
const { Website } = await import("../models/websiteModel.js");
const { FileModel } = await import("../models/fileModel.js");
const { default: websiteRoute } = await import("../routes/websiteRoute.js");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/website", websiteRoute);

const originalStartSession = mongoose.startSession;

describe("GitHub Export Integration Tests", () => {
  let mongoServer;
  let ownerUser;
  let nonOwnerUser;
  let ownerToken;
  let nonOwnerToken;
  let testWebsite;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    mongoose.startSession = async (...args) => {
      const session = await originalStartSession.apply(mongoose, args);
      session.startTransaction = () => {};
      session.commitTransaction = () => {};
      session.abortTransaction = () => {};
      session.inTransaction = () => false;
      return session;
    };
  });

  afterAll(async () => {
    mongoose.startSession = originalStartSession;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

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

    // Create website
    testWebsite = await Website.create({
      user: ownerUser._id,
      title: "My Awesome Portfolio",
      latestCode: "<html>Index</html>",
      files: [],
    });

    // Seed file
    const file1 = await FileModel.create({
      projectId: testWebsite._id,
      path: "index.html",
      content: "<html>Test</html>",
      language: "html",
    });
    const file2 = await FileModel.create({
      projectId: testWebsite._id,
      path: "style.css",
      content: "body { background: black; }",
      language: "css",
    });

    testWebsite.files = [file1._id, file2._id];
    await testWebsite.save();
  });

  test("should successfully create repo and push all project files", async () => {
    octokitMocks.getAuthenticated.mockResolvedValue({
      data: { login: "githubuser" },
    });
    octokitMocks.createForAuthenticatedUser.mockResolvedValue({
      data: {
        full_name: "githubuser/my-portfolio",
        html_url: "https://github.com/githubuser/my-portfolio",
      },
    });
    octokitMocks.createOrUpdateFileContents.mockResolvedValue({});

    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        githubToken: "ghp_validtoken",
        repoName: "my-portfolio",
        isPrivate: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.repoName).toBe("githubuser/my-portfolio");
    expect(response.body.data.repoUrl).toBe("https://github.com/githubuser/my-portfolio");

    expect(octokitMocks.getAuthenticated).toHaveBeenCalled();
    expect(octokitMocks.createForAuthenticatedUser).toHaveBeenCalledWith({
      name: "my-portfolio",
      private: true,
      auto_init: false,
    });
    // Check files pushed (first index.html, then style.css)
    expect(octokitMocks.createOrUpdateFileContents).toHaveBeenCalledTimes(2);
  });

  test("should fail if GitHub auth fails (invalid token)", async () => {
    octokitMocks.getAuthenticated.mockRejectedValue(new Error("Bad credentials"));

    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        githubToken: "ghp_invalidtoken",
        repoName: "my-portfolio",
        isPrivate: false,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("GITHUB_AUTH_FAILED");
  });

  test("should fail if repository creation fails (e.g. name conflict)", async () => {
    octokitMocks.getAuthenticated.mockResolvedValue({
      data: { login: "githubuser" },
    });
    octokitMocks.createForAuthenticatedUser.mockRejectedValue(
      new Error("name already exists on this account")
    );

    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        githubToken: "ghp_validtoken",
        repoName: "duplicate-repo",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("GITHUB_REPO_CREATE_FAILED");
    expect(response.body.error.message).toContain("already exists on your account");
  });

  test("should cleanup by deleting repository if file commit fails", async () => {
    octokitMocks.getAuthenticated.mockResolvedValue({
      data: { login: "githubuser" },
    });
    octokitMocks.createForAuthenticatedUser.mockResolvedValue({
      data: {
        full_name: "githubuser/failed-repo",
        html_url: "https://github.com/githubuser/failed-repo",
      },
    });
    // First commit succeeds (index.html), second commit throws (style.css)
    octokitMocks.createOrUpdateFileContents
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Push connection dropped"));
    octokitMocks.delete.mockResolvedValue({});

    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        githubToken: "ghp_validtoken",
        repoName: "failed-repo",
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("GITHUB_PUSH_FAILED");
    expect(octokitMocks.delete).toHaveBeenCalledWith({
      owner: "githubuser",
      repo: "failed-repo",
    });
  });

  test("should block non-owners from exporting project", async () => {
    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${nonOwnerToken}`)
      .send({
        githubToken: "ghp_token",
        repoName: "stolen-repo",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ACCESS_DENIED");
  });

  test("should validate input schema rules", async () => {
    const response = await request(app)
      .post(`/api/website/${testWebsite._id}/export/github`)
      .set("Cookie", `token=${ownerToken}`)
      .send({
        githubToken: "",
        repoName: "invalid name with spaces",
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
