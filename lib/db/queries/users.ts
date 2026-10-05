import { query, queryOne } from "@/lib/db";
import type { User } from "@/types";

// ---------------------------------------------------------------------------
// User queries
// ---------------------------------------------------------------------------

/** Find a user by email (used during login) */
export async function getUserByEmail(
  email: string
): Promise<(User & { password_hash: string }) | null> {
  return queryOne<User & { password_hash: string }>(
    `SELECT u.*, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );
}

/** Find a user by id (used for session hydration) */
export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT u.*, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
}

/** Create a new student user */
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  college?: string;
  department?: string;
  year?: number;
}): Promise<User & { role_name: string }> {
  const rows = await query<User & { role_name: string }>(
    `INSERT INTO users (role_id, name, email, password_hash, college, department, year)
     VALUES ((SELECT id FROM roles WHERE name = 'student'), $1, $2, $3, $4, $5, $6)
     RETURNING *, 'student' AS role_name`,
    [data.name, data.email, data.passwordHash, data.college ?? null, data.department ?? null, data.year ?? null]
  );
  return rows[0];
}

/** Get all users (admin only) */
export async function getAllUsers(params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: User[]; total: number }> {
  const { status, search, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = ["r.name = 'student'"];
  const values: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`u.status = $${idx++}`);
    values.push(status);
  }
  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     ${where}`,
    values
  );

  const users = await query<User>(
    `SELECT u.*, r.name AS role_name
     FROM users u
     INNER JOIN roles r ON u.role_id = r.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );

  return { users, total: parseInt(countRow?.count ?? "0") };
}

/** Update user status (admin action) */
export async function updateUserStatus(
  userId: string,
  status: "active" | "suspended" | "deactivated"
): Promise<User | null> {
  const rows = await query<User>(
    `UPDATE users SET status = $1 WHERE id = $2 RETURNING *`,
    [status, userId]
  );
  return rows[0] ?? null;
}

/** Update user profile */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; college?: string; department?: string; year?: number }
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined)       { fields.push(`name = $${idx++}`);       values.push(data.name); }
  if (data.college !== undefined)    { fields.push(`college = $${idx++}`);    values.push(data.college); }
  if (data.department !== undefined) { fields.push(`department = $${idx++}`); values.push(data.department); }
  if (data.year !== undefined)       { fields.push(`year = $${idx++}`);       values.push(data.year); }

  if (fields.length === 0) return getUserById(userId);

  values.push(userId);

  const rows = await query<User>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}
