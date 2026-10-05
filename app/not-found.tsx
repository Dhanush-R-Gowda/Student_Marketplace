import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-slate-100 dark:bg-slate-800 p-6">
        <SearchX className="h-12 w-12 text-slate-400" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-lg text-slate-500">Page not found</p>
      <p className="mt-1 text-sm text-slate-400 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/browse"
          className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Browse listings
        </Link>
      </div>
    </div>
  );
}
