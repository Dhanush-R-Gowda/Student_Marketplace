"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import type { User as UserType } from "@/types";

interface Props {
  users: UserType[];
  total: number;
  currentFilters: { status?: string; search?: string; page?: string };
}

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  suspended:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  deactivated: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function AdminUsersClient({ users: initial, total: _total, currentFilters }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [search, setSearch] = useState(currentFilters.search ?? "");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    router.push(`/admin/users?${p}`);
  }

  async function toggleStatus(userId: string, current: string) {
    const next = current === "active" ? "suspended" : "active";
    setLoading(p => ({ ...p, [userId]: true }));
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: next as UserType["status"] } : u));
      }
    } finally {
      setLoading(p => ({ ...p, [userId]: false }));
    }
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button type="submit" className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); router.push("/admin/users"); }}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-600 px-4 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              {["User", "College / Department", "Status", "Joined", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <p>{u.college ?? "—"}</p>
                  <p className="text-xs text-slate-400">{u.department} {u.year ? `· Year ${u.year}` : ""}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[u.status]}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {format(new Date(u.created_at), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(u.id, u.status)}
                    disabled={loading[u.id]}
                    title={u.status === "active" ? "Suspend user" : "Restore user"}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors disabled:opacity-40
                      border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300
                      hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400"
                  >
                    {u.status === "active" ? <><ShieldOff className="h-3.5 w-3.5" />Suspend</> : <><Shield className="h-3.5 w-3.5" />Restore</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
