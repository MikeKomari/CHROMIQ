import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { accountsEnabled } from "@/lib/server/features";
import { getSessionUser } from "@/lib/server/sessions";
import { jsonError, readJsonBody } from "@/lib/server/http";
import { validateProjectPayload } from "@/lib/server/validate-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  if (!accountsEnabled()) return jsonError("Cloud sync is not enabled.", 503);
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to see this project.", 401);

  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Not found.", 404);

  // Ownership is part of the WHERE clause, so another user's id reads as a 404
  // rather than revealing that the project exists.
  const project = await queryOne(
    `SELECT id, name, data, revision, created_at, updated_at
       FROM projects
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, user.id],
  );
  if (!project) return jsonError("Not found.", 404);
  return NextResponse.json({ project });
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!accountsEnabled()) return jsonError("Cloud sync is not enabled.", 503);
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to sync projects.", 401);

  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Not found.", 404);

  const body = await readJsonBody(request);
  const parsed = validateProjectPayload(body);
  if (parsed.error !== undefined) return jsonError(parsed.error, 400);

  const { revision } = (body as { revision?: unknown }) ?? {};
  if (!Number.isInteger(revision)) {
    return jsonError("Include the revision you are updating from.", 400);
  }

  // Optimistic concurrency: the write only lands if nobody else has saved since
  // this client last read the project.
  const updated = await queryOne(
    `UPDATE projects
        SET name = $1, data = $2, revision = revision + 1, updated_at = now()
      WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL AND revision = $5
      RETURNING id, name, data, revision, created_at, updated_at`,
    [parsed.name, parsed.data, id, user.id, revision],
  );

  if (!updated) {
    const current = await queryOne<{ revision: number }>(
      `SELECT revision FROM projects
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, user.id],
    );
    if (!current) return jsonError("Not found.", 404);
    return NextResponse.json(
      {
        error:
          "This project changed in another tab or device. Reload it before saving again.",
        revision: current.revision,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ project: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!accountsEnabled()) return jsonError("Cloud sync is not enabled.", 503);
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to delete projects.", 401);

  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Not found.", 404);

  // Soft delete, so an accidental removal on one device is recoverable.
  const result = await query(
    `UPDATE projects SET deleted_at = now()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, user.id],
  );
  if (!result.rowCount) return jsonError("Not found.", 404);
  return NextResponse.json({ ok: true });
}
