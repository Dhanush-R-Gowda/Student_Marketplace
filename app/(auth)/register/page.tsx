"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const YEAR_OPTIONS = [
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
  { value: 5, label: "5th Year" },
  { value: 6, label: "6th Year" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    department: "",
    year: "" as string | number,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        college: form.college || undefined,
        department: form.department || undefined,
        year: form.year ? Number(form.year) : undefined,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.details) {
          setFieldErrors(json.details);
        } else {
          setError(json.error ?? "Registration failed.");
        }
        return;
      }

      // Registered and logged in — go to marketplace
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create account
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Join StudentMart — buy and sell on campus
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Global error */}
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {/* Name */}
          <Input
            label="Full name"
            type="text"
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Arjun Sharma"
            autoComplete="name"
            required
            error={fieldErrors.name?.[0]}
          />

          {/* Email */}
          <Input
            label="Email address"
            type="email"
            id="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            error={fieldErrors.email?.[0]}
          />

          {/* Password */}
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
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
            {fieldErrors.password?.[0] && (
              <p className="text-xs text-red-500" role="alert">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
            <p className="text-xs text-slate-400 mb-3">
              Optional — helps buyers and sellers find you
            </p>
          </div>

          {/* College */}
          <Input
            label="College / University"
            type="text"
            id="college"
            value={form.college}
            onChange={(e) => update("college", e.target.value)}
            placeholder="IIT Bombay"
            autoComplete="organization"
          />

          {/* Department + Year */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              type="text"
              id="department"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              placeholder="Computer Science"
            />
            <Select
              label="Year"
              id="year"
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
              options={YEAR_OPTIONS}
              placeholder="Select year"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            className="mt-2"
          >
            <UserPlus className="h-4 w-4" />
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
