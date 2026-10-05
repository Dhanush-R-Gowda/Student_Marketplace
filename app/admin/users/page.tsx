import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAllUsers } from "@/lib/db/queries/users";
import { AdminUsersClient } from "./AdminUsersClient";

export const metadata: Metadata = { title: "Manage Users" };
export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ status?: string; search?: string; page?: string }> }

export default async function AdminUsersPage({ searchParams }: Props) {
  try { await requireAdmin(); } catch { redirect("/login"); }
  const sp = await searchParams;
  const { users, total } = await getAllUsers({
    status: sp.status,
    search: sp.search,
    page:   Math.max(1, parseInt(sp.page ?? "1")),
    limit:  20,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
        <p className="text-sm text-slate-500 mt-1">{total} student accounts</p>
      </div>
      <AdminUsersClient users={users} total={total} currentFilters={sp} />
    </div>
  );
}
