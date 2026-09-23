import { Pool } from "pg";
import { createHash } from "node:crypto";
import { z } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const configured = () => Boolean(process.env.DATABASE_URL);
const globalDb = globalThis as typeof globalThis & { databasePool?: Pool };
export function admin() {
  if (!configured())
    throw new HttpError(
      503,
      "Connect PostgreSQL to enable accounts, saving and email sending.",
    );
  if (!globalDb.databasePool) {
    globalDb.databasePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    globalDb.databasePool.on("error", (error) => {
      console.error("Idle PostgreSQL connection failed:", error.message);
    });
  }
  return globalDb.databasePool;
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const sessionCookie = "paperpost_session";
export function sessionToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== expected)
    throw new HttpError(403, "Invalid request origin.");
}
export async function userId(request: Request, allowKey = false) {
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    if (!allowKey || !bearer.startsWith("pp_"))
      throw new HttpError(401, "Invalid API key.");
    const result = await admin().query<{ owner_id: string }>(
      "select owner_id from api_keys where hash = $1 and revoked_at is null",
      [hash(bearer)],
    );
    const key = result.rows[0];
    if (!key) throw new HttpError(401, "Invalid or revoked API key.");
    return key.owner_id;
  }
  const token = sessionToken(request);
  if (!token) throw new HttpError(401, "Authentication required.");
  if (!["GET", "HEAD"].includes(request.method)) sameOrigin(request);
  const result = await admin().query<{ owner_id: string }>(
    "select owner_id from sessions where hash = $1 and expires_at > now()",
    [hash(token)],
  );
  const session = result.rows[0];
  if (!session) throw new HttpError(401, "Sign in again to continue.");
  return session.owner_id;
}
export async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A JSON body is required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 1024 * 1024) {
      await reader.cancel();
      throw new HttpError(413, "Request exceeds 1 MB.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
