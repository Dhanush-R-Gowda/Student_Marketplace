import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">StudentMart</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Find what you need. Sell what you don&apos;t.
              <br />
              The second-hand marketplace built for students.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Marketplace
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/browse", label: "Browse Listings" },
                { href: "/search", label: "Search" },
                { href: "/listings/new", label: "Sell an Item" },
                { href: "/wishlist", label: "My Wishlist" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Account
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/login", label: "Log In" },
                { href: "/register", label: "Sign Up" },
                { href: "/profile", label: "My Profile" },
                { href: "/transactions", label: "Transactions" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} StudentMart — DBMS Level 3 Academic Project
          </p>
        </div>
      </div>
    </footer>
  );
}
