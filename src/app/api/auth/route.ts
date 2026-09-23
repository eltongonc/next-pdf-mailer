import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  admin,
  body,
  configured,
  failure,
  hash,
  HttpError,
  sameOrigin,
  sessionCookie,
  sessionToken,
  userId,
} from "@/lib/server";
import { passwordHash, verifyPassword } from "@/lib/password";
export const runtime = "nodejs";
const credentials = z
  .object({
    action: z.enum(["signin", "signup"]),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    password: z.string().min(12).max(128),
  })
  .strict();
function cookie(token: string, maxAge: number) {
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export async function GET(request: Request) {
  try {
    if (!configured()) return Response.json({ configured: false, email: "" });
    if (!sessionToken(request))
      return Response.json({ configured: true, email: "" });
    let owner: string;
    try {
      owner = await userId(request);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401)
        return Response.json({ configured: true, email: "" });
      throw error;
    }
    const result = await admin().query<{ email: string }>(
      "select email from users where id = $1",
      [owner],
    );
    return Response.json(
      { configured: true, email: result.rows[0]?.email ?? "" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = credentials.parse(await body(request));
    const db = admin();
    const attempts = await db.query<{ attempts: number }>(
      `insert into auth_attempts(email_hash, attempts, window_start) values ($1, 1, now())
       on conflict (email_hash) do update set
         attempts = case when auth_attempts.window_start < now() - interval '15 minutes' then 1 else auth_attempts.attempts + 1 end,
         window_start = case when auth_attempts.window_start < now() - interval '15 minutes' then now() else auth_attempts.window_start end
       returning attempts`,
      [hash(input.email)],
    );
    if ((attempts.rows[0]?.attempts ?? 11) > 10)
      throw new HttpError(
        429,
        "Too many authentication attempts. Try again in 15 minutes.",
      );
    let owner: string;
    if (input.action === "signup") {
      const result = await db.query<{ id: string }>(
        "insert into users(email, password_hash) values ($1, $2) on conflict (email) do nothing returning id",
        [input.email, await passwordHash(input.password)],
      );
      const user = result.rows[0];
      if (!user)
        throw new HttpError(
          409,
          "Unable to create account with these credentials.",
        );
      owner = user.id;
    } else {
      const result = await db.query<{ id: string; password_hash: string }>(
        "select id, password_hash from users where email = $1",
        [input.email],
      );
      const user = result.rows[0];
      // Perform the same password derivation even when the account does not exist.
      const valid = await verifyPassword(
        input.password,
        user?.password_hash ?? `${"0".repeat(32)}:${"0".repeat(128)}`,
      );
      if (!user || !valid)
        throw new HttpError(401, "Invalid email or password.");
      owner = user.id;
    }
    const token = randomBytes(32).toString("hex");
    await db.query(
      "delete from sessions where expires_at <= now() or hash = $1",
      [hash(sessionToken(request) ?? "")],
    );
    await db.query(
      "insert into sessions(hash, owner_id, expires_at) values ($1, $2, now() + interval '7 days')",
      [hash(token), owner],
    );
    return Response.json(
      { email: input.email },
      {
        headers: {
          "Set-Cookie": cookie(token, 604800),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const token = sessionToken(request);
    if (token)
      await admin().query("delete from sessions where hash = $1", [
        hash(token),
      ]);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": cookie("", 0) } },
    );
  } catch (error) {
    return failure(error);
  }
}
