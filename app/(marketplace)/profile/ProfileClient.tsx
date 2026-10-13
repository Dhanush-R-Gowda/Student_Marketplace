"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, GraduationCap, Building2, Calendar,
  Package, ArrowLeftRight, Edit3, CheckCircle, XCircle,
  LogOut
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";
import type { User as UserType, Listing, Transaction } from "@/types";

interface ProfileClientProps {
  user: UserType;
  listings: Listing[];
  transactions: Transaction[];
}

const YEAR_OPTIONS = [1,2,3,4,5,6].map(y => ({ value: y, label: `${y}${['st','nd','rd','th','th','th'][y-1]} Year` }));

export function ProfileClient({ user, listings, transactions }: ProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    college: user.college ?? "",
    department: user.department ?? "",
    year: user.year ?? ("" as string | number),
  });

  const activeListings = listings.filter(l => l.status === "Available").length;
  const soldListings = listings.filter(l => l.status === "Sold").length;
  const purchases = transactions.filter(t => t.buyer_id === user.id).length;
  const sales = transactions.filter(t => t.seller_id === user.id).length;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          college: form.college || undefined,
          department: form.department || undefined,
          year: form.year ? Number(form.year) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error ?? "Failed to save.");
      } else {
        setSaveSuccess(true);
        setEditing(false);
        router.refresh();
      }
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Profile info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <Input
                  label="Full name"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input
                  label="College / University"
                  value={form.college}
                  onChange={e => setForm(p => ({ ...p, college: e.target.value }))}
                  placeholder="IIT Bombay"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Department"
                    value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    placeholder="Computer Science"
                  />
                  <Select
                    label="Year"
                    value={form.year}
                    onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                    options={YEAR_OPTIONS}
                    placeholder="Select year"
                  />
                </div>

                {saveError && (
                  <p className="text-sm text-red-500" role="alert">{saveError}</p>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleSave} loading={saving} size="sm">
                    <CheckCircle className="h-4 w-4" />
                    Save changes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditing(false); setSaveError(null); }}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Mail, label: "Email", value: user.email },
                  { icon: Building2, label: "College", value: user.college ?? "—" },
                  { icon: GraduationCap, label: "Department", value: user.department ?? "—" },
                  { icon: Calendar, label: "Year", value: user.year ? `Year ${user.year}` : "—" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs font-medium text-slate-500">{label}</dt>
                      <dd className="text-sm text-slate-900 dark:text-slate-100">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            {saveSuccess && (
              <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Profile updated.
              </p>
            )}
          </Card>

          {/* My Listings */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">My Listings</h3>
              <Link
                href="/listings/new"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                + New listing
              </Link>
            </div>

            {listings.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                You haven&apos;t listed anything yet.
              </p>
            ) : (
              <div className="space-y-3">
                {listings.slice(0, 5).map(l => (
                  <Link
                    key={l.id}
                    href={`/listings/${l.id}`}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                      {l.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.primary_image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600">
                        {l.title}
                      </p>
                      <p className="text-xs text-slate-500">₹{l.price.toLocaleString()}</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                ))}
                {listings.length > 5 && (
                  <p className="text-xs text-center text-slate-500 pt-1">
                    +{listings.length - 5} more listings
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Stats */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
              Activity
            </h3>
            <div className="space-y-4">
              {[
                { label: "Active listings", value: activeListings, icon: Package, color: "text-green-600" },
                { label: "Items sold", value: soldListings, icon: CheckCircle, color: "text-indigo-600" },
                { label: "Purchases made", value: purchases, icon: ArrowLeftRight, color: "text-purple-600" },
                { label: "Successful sales", value: sales, icon: ArrowLeftRight, color: "text-amber-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Member since
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          </Card>

          <div className="space-y-2">
            <Link href="/offers" className="block w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors">
              View my offers
            </Link>
            <Link href="/transactions" className="block w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors">
              Transaction history
            </Link>
            <Link href="/wishlist" className="block w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors">
              My wishlist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
