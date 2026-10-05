import { query, queryOne } from "@/lib/db";
import type { Report } from "@/types";

// ---------------------------------------------------------------------------
// Report queries
// ---------------------------------------------------------------------------

/** Create a new report */
export async function createReport(data: {
  reporterId: string;
  listingId: string;
  reason: string;
  description?: string;
}): Promise<Report> {
  const rows = await query<Report>(`
    INSERT INTO reports (reporter_id, listing_id, reason, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.reporterId, data.listingId, data.reason, data.description ?? null]);
  return rows[0];
}

/** Get all reports (admin view) */
export async function getAllReports(params: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ reports: Report[]; total: number }> {
  const { status, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`r.status = $${idx++}`);
    values.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports r ${where}`,
    values
  );

  const reports = await query<Report>(`
    SELECT
      r.*,
      ru.name  AS reporter_name,
      l.title  AS listing_title,
      rv.name  AS reviewer_name
    FROM reports r
    INNER JOIN users    ru ON r.reporter_id = ru.id
    INNER JOIN listings  l ON r.listing_id  = l.id
    LEFT JOIN  users    rv ON r.reviewed_by = rv.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT $${idx++} OFFSET $${idx}
  `, [...values, limit, offset]);

  return { reports, total: parseInt(countRow?.count ?? "0") };
}

/** Update report status (admin action) */
export async function updateReportStatus(
  reportId: string,
  status: "Reviewing" | "Resolved" | "Dismissed",
  reviewedBy: string
): Promise<Report | null> {
  const rows = await query<Report>(`
    UPDATE reports
    SET status = $1, reviewed_by = $2, reviewed_at = NOW()
    WHERE id = $3
    RETURNING *
  `, [status, reviewedBy, reportId]);
  return rows[0] ?? null;
}
