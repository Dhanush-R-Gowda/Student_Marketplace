import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAllReports } from "@/lib/db/queries/reports";
import { AdminReportsClient } from "./AdminReportsClient";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ status?: string; page?: string }> }

export default async function AdminReportsPage({ searchParams }: Props) {
  try { await requireAdmin(); } catch { redirect("/login"); }
  const sp = await searchParams;
  const { reports, total } = await getAllReports({
    status: sp.status,
    page:   Math.max(1, parseInt(sp.page ?? "1")),
    limit:  20,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Review and moderate reported listings</p>
      </div>
      <AdminReportsClient reports={reports} total={total} currentStatus={sp.status ?? "all"} />
    </div>
  );
}
