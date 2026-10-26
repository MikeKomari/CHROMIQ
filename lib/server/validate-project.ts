/** Guards against a runaway client pushing an unbounded blob into the row. */
const MAX_PROJECT_BYTES = 512 * 1024;
export const MAX_PROJECTS_PER_USER = 200;

type ProjectResult =
  | { error: string; name?: undefined; data?: undefined }
  | { error?: undefined; name: string; data: object };

export function validateProjectPayload(body: unknown): ProjectResult {
  if (typeof body !== "object" || body === null) {
    return { error: "Send a JSON body with a name and data." };
  }
  const { name, data } = body as { name?: unknown; data?: unknown };
  if (typeof name !== "string" || !name.trim() || name.length > 120) {
    return { error: "Give the project a name of 120 characters or fewer." };
  }
  if (typeof data !== "object" || data === null) {
    return { error: "The project data must be an object." };
  }
  if (JSON.stringify(data).length > MAX_PROJECT_BYTES) {
    return { error: "That project is too large to sync." };
  }
  return { name: name.trim(), data };
}
