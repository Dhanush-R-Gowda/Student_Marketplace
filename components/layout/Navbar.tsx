"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  ShoppingBag,
  Search,
  Heart,
  Package,
  ArrowLeftRight,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  PlusCircle,
} from "lucide-react";
import type { SessionUser } from "@/types";

interface NavbarProps {
  user: SessionUser | null;
}

const studentLinks = [
  { href: "/browse", label: "Browse", icon: ShoppingBag },
  { href: "/search", label: "Search", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/offers", label: "My Offers", icon: Package },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // Unread notification count — fetched on mount when the user is logged in
  const [unreadCount, setUnreadCount] = useState(0);

  const navLinks = user?.role === "admin" ? adminLinks : studentLinks;

  // Unread notification count — fetched on mount and polled every 60 s.
  // The async function is defined inside the effect so setState is called
  // only from within the async callback, satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!user) return;

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/notifications?limit=1", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) setUnreadCount(json.data.unreadCount ?? 0);
      } catch {
        // Non-critical: silently ignore network errors in the nav badge
      }
    }

    // Fetch immediately on mount / when user changes
    fetchUnreadCount();
    // Poll every 60 s so the badge stays fresh without WebSockets
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg hidden sm:block">
            StudentMart
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Sell button (students only) */}
              {user.role === "student" && (
                <Link
                  href="/listings/new"
                  className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Sell Item
                </Link>
              )}

              {/* Notifications bell — shows unread count badge */}
              <button
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                onClick={async () => {
                  // Mark all as read and reset badge when the bell is clicked
                  if (unreadCount > 0) {
                    setUnreadCount(0);
                    await fetch("/api/notifications", {
                      method: "PATCH",
                      credentials: "include",
                    });
                  }
                }}
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile dropdown */}
              <div className="relative group">
                <button
                  aria-label="User menu"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                    <span className="text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block font-medium">{user.name.split(" ")[0]}</span>
                </button>

                {/* Dropdown */}
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-2"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                  pathname === href
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user?.role === "student" && (
              <Link
                href="/listings/new"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white mt-2"
              >
                <PlusCircle className="h-4 w-4" />
                Sell Item
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
