// PATH: frontend/src/App.jsx
import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import LiveSite from "./pages/LiveSite";

import ErrorBoundary from "./components/ErrorBoundary";

const Generate = lazy(() => import("./pages/Generate"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WebsiteEditor = lazy(() => import("./pages/WebsiteEditor"));

const ProtectedRoute = ({ children }) => {
  const { userData } = useSelector((state) => state.user);
  return userData ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen bg-black text-white flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/generate"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Generate />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <WebsiteEditor />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/site/:slug" element={<LiveSite />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
