import React, { Component } from "react";
import { Navigate } from "react-router-dom";

/**
 * ErrorBoundary class component catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a premium fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component {
  /**
   * Initializes the error boundary component state.
   * @param {object} props - The component props.
   */
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      redirectToDashboard: false,
    };
  }

  /**
   * Updates state so the next render will show the fallback UI.
   * @param {Error} error - The thrown error.
   * @returns {object} The updated state.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Logs the caught error and its component stack information.
   * @param {Error} error - The caught error.
   * @param {React.ErrorInfo} errorInfo - The React error info object.
   */
  componentDidCatch(error, errorInfo) {
    // Log error and componentStack to console.error
    console.error("ErrorBoundary caught an error:", error, errorInfo?.componentStack);
  }

  /**
   * Resets the error state to attempt re-rendering the children.
   */
  handleTryAgain = () => {
    this.setState({
      hasError: false,
      error: null,
      redirectToDashboard: false,
    });
  };

  /**
   * Triggers redirection to the dashboard path.
   */
  handleGoToDashboard = () => {
    this.setState({
      redirectToDashboard: true,
    });
  };

  render() {
    if (this.state.redirectToDashboard) {
      // Clear redirect state after redirect rendering to prevent history loop
      return <Navigate to="/dashboard" replace />;
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full border border-white/10 bg-[#0b0b0b] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background ambient glow matching existing dark theme */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/10 blur-[80px]" />

            {/* Error Icon */}
            <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Something went wrong
            </h2>

            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              The AI generated content caused an issue. Your work is saved. Please try refreshing or generating again.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={this.handleTryAgain}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoToDashboard}
                className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm transition cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
