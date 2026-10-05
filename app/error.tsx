"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-red-50 dark:bg-red-900/20 p-6">
        <AlertTriangle className="h-12 w-12 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
      <p className="mt-2 text-slate-500 max-w-sm">
        An unexpected error occurred. This has been logged.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-4 max-w-lg text-left text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-4 overflow-auto text-red-600">
          {error.message}
        </pre>
      )}
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
