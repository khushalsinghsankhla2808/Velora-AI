import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";
import { useErrorHandler } from "../hooks/useErrorHandler";

// Helper components for throwing errors
const ProblemChild = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Test rendering crash");
  }
  return <div>Healthy Child</div>;
};

const ManualErrorChild = ({ triggerError }) => {
  const handleError = useErrorHandler();
  React.useEffect(() => {
    if (triggerError) {
      handleError(new Error("Async manual error"));
    }
  }, [triggerError, handleError]);
  return <div>Manual Error Child</div>;
};

// Helper wrapper to simulate dynamic recovery from error states
const RecoverableTestWrapper = () => {
  const [shouldThrow, setShouldThrow] = React.useState(true);
  return (
    <div>
      <ErrorBoundary>
        <ProblemChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
      <button onClick={() => setShouldThrow(false)}>Fix Error</button>
    </div>
  );
};

describe("ErrorBoundary Component and useErrorHandler Hook Tests", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress console.error output in test logs, but spy on it
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should render children normally when no error occurs", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <div>Healthy Child Content</div>
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText("Healthy Child Content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  test("should render fallback UI when a child component throws during render", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
      </MemoryRouter>
    );

    // Verify fallback content is rendered
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/The AI generated content caused an issue. Your work is saved. Please try refreshing or generating again./i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Dashboard/i })).toBeInTheDocument();
    
    // Check that error logging was called
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test("should reset error state when 'Try Again' button is clicked", () => {
    render(
      <MemoryRouter>
        <RecoverableTestWrapper />
      </MemoryRouter>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // 1. Resolve the underlying error state
    const fixButton = screen.getByRole("button", { name: /Fix Error/i });
    fireEvent.click(fixButton);

    // 2. Click Try Again to reset ErrorBoundary state
    const tryAgainButton = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(tryAgainButton);

    // 3. Verify that the boundary has reset and healthy children are mounted
    expect(screen.getByText("Healthy Child")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  test("should redirect to /dashboard when 'Go to Dashboard' button is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/editor/1"]}>
        <Routes>
          <Route
            path="/editor/:id"
            element={
              <ErrorBoundary>
                <ProblemChild shouldThrow={true} />
              </ErrorBoundary>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard Page Content</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    const dashboardButton = screen.getByRole("button", { name: /Go to Dashboard/i });
    fireEvent.click(dashboardButton);

    // Verify navigation occurred and Dashboard is rendered
    expect(screen.getByText("Dashboard Page Content")).toBeInTheDocument();
  });

  test("should trigger error boundary when manual hook useErrorHandler throws in render cycle", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ManualErrorChild triggerError={true} />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
