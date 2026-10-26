import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import { getSessionUser } from "@/lib/server/sessions";
import { jsonError, readJsonBody } from "@/lib/server/http";
import {
  MAX_PROJECTS_PER_USER,
  validateProjectPayload,
} from "@/lib/server/validate-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured()) return jsonError("Cloud sync is not enabled.", 503);
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to see your synced projects.", 401);

  const result = await query(
    `SELECT id, name, data, revision, created_at, updated_at
       FROM projects
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY updated_at DESC`,
    [user.id],
  );
  return NextResponse.json({ projects: result.rows });
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured()) return jsonError("Cloud sync is not enabled.", 503);
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to sync projects.", 401);

  const parsed = validateProjectPayload(await readJsonBody(request));
  if (parsed.error !== undefined) return jsonError(parsed.error, 400);

  const count = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM projects WHERE user_id = $1 AND deleted_at IS NULL`,
    [user.id],
  );
  if (Number(count.rows[0].count) >= MAX_PROJECTS_PER_USER) {
    return jsonError(
      `You have reached the limit of ${MAX_PROJECTS_PER_USER} synced projects.`,
      409,
    );
  }

  const result = await query(
    `INSERT INTO projects (user_id, name, data)
     VALUES ($1, $2, $3)
     RETURNING id, name, data, revision, created_at, updated_at`,
    [user.id, parsed.name, parsed.data],
  );
  return NextResponse.json({ project: result.rows[0] }, { status: 201 });
}
