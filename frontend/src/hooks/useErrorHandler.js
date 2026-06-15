import { useState, useCallback } from "react";

/**
 * A custom React hook that returns a function to manually trigger the nearest parent Error Boundary.
 * This is useful for forwarding errors caught in event handlers or async processes (like API calls)
 * which React Error Boundaries do not catch by default.
 *
 * @returns {function(Error): void} A function that, when called with an Error object, will throw it in the next render cycle.
 */
export function useErrorHandler() {
  const [, setError] = useState(null);

  const handleError = useCallback((error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return handleError;
}

export default useErrorHandler;
