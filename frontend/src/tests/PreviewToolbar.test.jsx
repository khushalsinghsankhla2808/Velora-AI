// PATH: frontend/src/tests/PreviewToolbar.test.jsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, describe, vi, beforeEach } from "vitest";
import PreviewToolbar from "../components/PreviewToolbar";

describe("PreviewToolbar Component Tests", () => {
  let onChangeMock;

  beforeEach(() => {
    onChangeMock = vi.fn();
  });

  test("renders all three preview modes (Desktop, Tablet, Mobile)", () => {
    render(
      <PreviewToolbar current="desktop" onChange={onChangeMock} />
    );

    expect(screen.getByTitle("Switch to Desktop View")).toBeInTheDocument();
    expect(screen.getByTitle("Switch to Tablet View")).toBeInTheDocument();
    expect(screen.getByTitle("Switch to Mobile View")).toBeInTheDocument();
  });

  test("clicking a device button triggers onChange callback with correct value", () => {
    render(
      <PreviewToolbar current="desktop" onChange={onChangeMock} />
    );

    const tabletButton = screen.getByTitle("Switch to Tablet View");
    fireEvent.click(tabletButton);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith("tablet");

    const mobileButton = screen.getByTitle("Switch to Mobile View");
    fireEvent.click(mobileButton);

    expect(onChangeMock).toHaveBeenCalledWith("mobile");
  });

  test("applies active styles to the selected preview mode", () => {
    const { rerender } = render(
      <PreviewToolbar current="desktop" onChange={onChangeMock} />
    );

    const desktopButton = screen.getByTitle("Switch to Desktop View");
    expect(desktopButton.className).toContain("bg-white/10");
    expect(desktopButton.className).toContain("text-white");

    const tabletButton = screen.getByTitle("Switch to Tablet View");
    expect(tabletButton.className).toContain("text-zinc-400");
    expect(tabletButton.className).not.toContain("bg-white/10");

    // Rerender with tablet selected
    rerender(<PreviewToolbar current="tablet" onChange={onChangeMock} />);

    expect(screen.getByTitle("Switch to Tablet View").className).toContain("bg-white/10");
    expect(screen.getByTitle("Switch to Desktop View").className).not.toContain("bg-white/10");
  });
});
