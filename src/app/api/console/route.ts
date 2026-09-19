import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  admin,
  body,
  check,
  failure,
  hash,
  HttpError,
  userId,
} from "@/lib/server";
import { renderTemplate, templateSchema } from "@/lib/templates";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const owner = await userId(request);
    const db = admin();
    const results = await Promise.all([
      db
        .from("templates")
        .select("id,name,html,variables,sample_data")
        .eq("owner_id", owner)
        .order("updated_at", { ascending: false }),
      db
        .from("api_keys")
        .select("id,name,prefix,created_at")
        .eq("owner_id", owner)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      db
        .from("deliveries")
        .select("id,template_name,recipient,status,created_at,error")
        .eq("owner_id", owner)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    results.forEach((r) => check(r.error));
    return Response.json(
      {
        templates: results[0].data,
        keys: results[1].data,
        deliveries: results[2].data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const owner = await userId(request);
    const payload = await body(request);
    const db = admin();
    if (payload.action === "save") {
      const template = templateSchema.parse(payload.template);
      try {
        renderTemplate(template, template.sample_data);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const existing = await db
        .from("templates")
        .select("owner_id")
        .eq("id", template.id)
        .maybeSingle();
      check(existing.error);
      if (existing.data && existing.data.owner_id !== owner)
        throw new HttpError(404, "Template not found.");
      const result = existing.data
        ? await db
            .from("templates")
            .update({ ...template, updated_at: new Date().toISOString() })
            .eq("id", template.id)
            .eq("owner_id", owner)
        : await db.from("templates").insert({ ...template, owner_id: owner });
      check(result.error);
      return Response.json({ ok: true });
    }
    if (payload.action === "create_key") {
      const name = z.string().trim().min(1).max(60).parse(payload.name);
      const key = `pp_${randomBytes(32).toString("hex")}`;
      const { error } = await db
        .from("api_keys")
        .insert({
          owner_id: owner,
          name,
          hash: hash(key),
          prefix: key.slice(0, 11),
        });
      check(error);
      return Response.json({ key });
    }
    if (payload.action === "revoke_key") {
      const id = z.string().uuid().parse(payload.id);
      const { error } = await db
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", owner);
      check(error);
      return Response.json({ ok: true });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (error) {
    return failure(error);
  }
}
