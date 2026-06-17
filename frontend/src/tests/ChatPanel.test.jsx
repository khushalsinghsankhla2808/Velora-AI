// PATH: frontend/src/tests/ChatPanel.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, describe, vi, beforeEach } from "vitest";
import axios from "axios";
import ChatPanel from "../components/ChatPanel";

vi.mock("axios");

describe("ChatPanel Component Tests", () => {
  const projectId = "mock-project-id";
  let onUpdateSuccessMock;
  let onFileClickMock;
  let setUpdateLoadingMock;

  const mockChatHistory = {
    success: true,
    data: {
      messages: [
        {
          _id: "m1",
          role: "user",
          message: "Make background pink",
          createdAt: new Date(Date.now() - 5000).toISOString(),
        },
        {
          _id: "m2",
          role: "assistant",
          message: "I made the background pink.",
          filesChanged: ["style.css"],
          createdAt: new Date().toISOString(),
        },
      ],
      hasMore: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onUpdateSuccessMock = vi.fn();
    onFileClickMock = vi.fn();
    setUpdateLoadingMock = vi.fn();

    // Default mock implementation for get chat history
    axios.get.mockResolvedValue({ data: mockChatHistory });
  });

  test("renders chat history successfully", async () => {
    render(
      <ChatPanel
        projectId={projectId}
        onClose={vi.fn()}
        onUpdateSuccess={onUpdateSuccessMock}
        onFileClick={onFileClickMock}
        updateLoading={false}
        setUpdateLoading={setUpdateLoadingMock}
      />
    );

    // Should fetch chat history on mount
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(`/api/website/${projectId}/chat`),
      expect.any(Object)
    );

    // Wait for messages to render
    await waitFor(() => {
      expect(screen.getByText("Make background pink")).toBeInTheDocument();
      expect(screen.getByText("I made the background pink.")).toBeInTheDocument();
    });

    // Check files changed chips
    expect(screen.getByText("style.css")).toBeInTheDocument();
  });

  test("clicking files-changed chip triggers onFileClick", async () => {
    render(
      <ChatPanel
        projectId={projectId}
        onClose={vi.fn()}
        onUpdateSuccess={onUpdateSuccessMock}
        onFileClick={onFileClickMock}
        updateLoading={false}
        setUpdateLoading={setUpdateLoadingMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("style.css")).toBeInTheDocument();
    });

    const chip = screen.getByText("style.css");
    fireEvent.click(chip);

    expect(onFileClickMock).toHaveBeenCalledWith("style.css");
  });

  test("submitting prompt sends request, appends response and fires onUpdateSuccess", async () => {
    render(
      <ChatPanel
        projectId={projectId}
        onClose={vi.fn()}
        onUpdateSuccess={onUpdateSuccessMock}
        onFileClick={onFileClickMock}
        updateLoading={false}
        setUpdateLoading={setUpdateLoadingMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask AI to make targeted edits...")).toBeInTheDocument();
    });

    // Mock post edit response
    const mockPostResponse = {
      success: true,
      data: {
        chat: {
          _id: "m3",
          role: "assistant",
          message: "Added title to index.html.",
          filesChanged: ["index.html"],
          createdAt: new Date().toISOString(),
        },
        remainingCredits: 8,
        latestCode: "<html></html>",
        filesChanged: ["index.html"],
      },
    };
    axios.post.mockResolvedValue({ data: mockPostResponse });

    const textarea = screen.getByPlaceholderText("Ask AI to make targeted edits...");
    const submitBtn = screen.getByRole("button", { name: "Send message" });

    fireEvent.change(textarea, { target: { value: "add title tag to index.html" } });
    fireEvent.click(submitBtn);

    // Should call setUpdateLoading(true) during request
    expect(setUpdateLoadingMock).toHaveBeenCalledWith(true);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`/api/website/${projectId}/chat`),
      { instruction: "add title tag to index.html" },
      expect.any(Object)
    );

    await waitFor(() => {
      // New assistant reply should render
      expect(screen.getByText("Added title to index.html.")).toBeInTheDocument();
    });

    // Should fire success callback
    expect(onUpdateSuccessMock).toHaveBeenCalledWith({
      remainingCredits: 8,
      latestCode: "<html></html>",
      filesChanged: ["index.html"],
    });
  });

  test("textarea and submit buttons are disabled when loading", async () => {
    render(
      <ChatPanel
        projectId={projectId}
        onClose={vi.fn()}
        onUpdateSuccess={onUpdateSuccessMock}
        onFileClick={onFileClickMock}
        updateLoading={true}
        setUpdateLoading={setUpdateLoadingMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask AI to make targeted edits...")).toBeDisabled();
    });

    const submitBtn = screen.getByRole("button", { name: "Send message" });
    expect(submitBtn).toBeDisabled();
  });
});
