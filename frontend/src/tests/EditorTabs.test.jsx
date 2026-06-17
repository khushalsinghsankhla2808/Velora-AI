// PATH: frontend/src/tests/EditorTabs.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, describe, vi, beforeEach } from "vitest";
import EditorTabs from "../components/EditorTabs";

describe("EditorTabs Component Tests", () => {
  const mockOpenFiles = [
    { _id: "f1", path: "index.html" },
    { _id: "f2", path: "style.css" },
    { _id: "f3", path: "js/script.js" }
  ];

  let onTabSelectMock;
  let onTabCloseMock;

  beforeEach(() => {
    onTabSelectMock = vi.fn();
    onTabCloseMock = vi.fn();
  });

  test("renders open files as tabs, styling active one distinctly", () => {
    render(
      <EditorTabs
        openFiles={mockOpenFiles}
        activeFileId="f1"
        onTabSelect={onTabSelectMock}
        onTabClose={onTabCloseMock}
      />
    );

    expect(screen.getByText("index.html")).toBeInTheDocument();
    expect(screen.getByText("style.css")).toBeInTheDocument();
    expect(screen.getByText("script.js")).toBeInTheDocument();
  });

  test("clicking inactive tab makes it active", () => {
    render(
      <EditorTabs
        openFiles={mockOpenFiles}
        activeFileId="f1"
        onTabSelect={onTabSelectMock}
        onTabClose={onTabCloseMock}
      />
    );

    const inactiveTab = screen.getByText("style.css");
    fireEvent.click(inactiveTab);

    expect(onTabSelectMock).toHaveBeenCalledWith("f2");
  });

  test("unsaved indicator shows when a tab is dirty", () => {
    const mockUnsavedChanges = { f2: true };

    render(
      <EditorTabs
        openFiles={mockOpenFiles}
        activeFileId="f1"
        unsavedChanges={mockUnsavedChanges}
        onTabSelect={onTabSelectMock}
        onTabClose={onTabCloseMock}
      />
    );

    // Look for the element with title "Unsaved changes"
    const dirtyIndicator = screen.getByTitle("Unsaved changes");
    expect(dirtyIndicator).toBeInTheDocument();
  });
});
