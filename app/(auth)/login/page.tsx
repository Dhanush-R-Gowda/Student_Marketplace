"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Client component — cannot export metadata here; handled in a separate
// server-side metadata export via generateMetadata is not needed for auth pages.

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const suspended = searchParams.get("suspended") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    suspended ? "Your account has been suspended." : null
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Login failed.");
        return;
      }

      // Redirect — admin goes to /admin, others to redirect param
      const destination =
        json.data.role === "admin" ? "/admin" : redirect;
      router.push(destination);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(type: "student" | "admin") {
    setEmail(type === "admin" ? "admin@example.com" : "student@example.com");
    setPassword(type === "admin" ? "admin123" : "student123");
    setError(null);
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Log in to your StudentMart account
          </p>
        </div>

        {/* Demo credentials banner */}
        <div className="mb-6 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            Demo accounts
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemo("student")}
              className="flex-1 rounded-lg bg-indigo-100 dark:bg-indigo-800 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors"
            >
              Student demo
            </button>
            <button
              type="button"
              onClick={() => fillDemo("admin")}
              className="flex-1 rounded-lg bg-indigo-100 dark:bg-indigo-800 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors"
            >
              Admin demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Password <span className="text-red-500" aria-hidden>*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            className="mt-2"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
