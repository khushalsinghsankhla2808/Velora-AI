// PATH: frontend/src/tests/FileExplorer.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, describe, vi, beforeEach } from "vitest";
import FileExplorer from "../components/FileExplorer";

describe("FileExplorer Component Tests", () => {
  const mockFiles = [
    { _id: "f1", path: "index.html", content: "index", language: "html" },
    { _id: "f2", path: "css/style.css", content: "css", language: "css" },
    { _id: "f3", path: "js/script.js", content: "js", language: "javascript" },
    { _id: "f4", path: "assets/.keep", content: "", language: "plaintext" }
  ];

  let onFileSelectMock;
  let onCreateFileMock;
  let onCreateFolderMock;
  let onRenameFileMock;
  let onDeleteFileMock;

  beforeEach(() => {
    onFileSelectMock = vi.fn();
    onCreateFileMock = vi.fn();
    onCreateFolderMock = vi.fn();
    onRenameFileMock = vi.fn();
    onDeleteFileMock = vi.fn();
  });

  test("renders the file tree correctly", () => {
    render(
      <FileExplorer
        files={mockFiles}
        activeFileId="f1"
        onFileSelect={onFileSelectMock}
        onCreateFile={onCreateFileMock}
        onCreateFolder={onCreateFolderMock}
        onRenameFile={onRenameFileMock}
        onDeleteFile={onDeleteFileMock}
      />
    );

    // Verify files and directories are visible (root is root, css/js folders are rendered, index.html is rendered)
    expect(screen.getByText("index.html")).toBeInTheDocument();
    expect(screen.getByText("css")).toBeInTheDocument();
    expect(screen.getByText("js")).toBeInTheDocument();
    expect(screen.getByText("assets")).toBeInTheDocument();
    
    // Verify hidden .keep files are NOT visible
    expect(screen.queryByText(".keep")).not.toBeInTheDocument();
  });

  test("clicking a file triggers onFileSelect", () => {
    render(
      <FileExplorer
        files={mockFiles}
        activeFileId="f2"
        onFileSelect={onFileSelectMock}
      />
    );

    const fileItem = screen.getByText("index.html");
    fireEvent.click(fileItem);

    expect(onFileSelectMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: "f1", path: "index.html" })
    );
  });

  test("clicking '+' and typing adds a file", async () => {
    onCreateFileMock.mockResolvedValue({});

    render(
      <FileExplorer
        files={mockFiles}
        activeFileId="f1"
        onCreateFile={onCreateFileMock}
      />
    );

    // Click on create file button (Plus icon)
    const plusBtn = screen.getByTitle("New File");
    fireEvent.click(plusBtn);

    // Find input element and type new file name
    const input = screen.getByPlaceholderText("filename.html...");
    fireEvent.change(input, { target: { value: "test.css" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(onCreateFileMock).toHaveBeenCalledWith("test.css");
    });
  });
});
