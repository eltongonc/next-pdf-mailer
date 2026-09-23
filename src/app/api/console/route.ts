import { randomBytes } from "node:crypto";
import { z } from "zod";
import { admin, body, failure, hash, HttpError, userId } from "@/lib/server";
import { renderTemplate, templateSchema } from "@/lib/templates";
export const runtime = "nodejs";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), template: templateSchema }),
  z.object({
    action: z.literal("create_key"),
    name: z.string().trim().min(1).max(60),
  }),
  z.object({ action: z.literal("revoke_key"), id: z.uuid() }),
]);
export async function GET(request: Request) {
  try {
    const owner = await userId(request);
    const db = admin();
    const [templates, keys, deliveries] = await Promise.all([
      db.query(
        "select id,name,html,variables,sample_data from templates where owner_id = $1 order by updated_at desc",
        [owner],
      ),
      db.query(
        "select id,name,prefix,created_at from api_keys where owner_id = $1 and revoked_at is null order by created_at desc",
        [owner],
      ),
      db.query(
        "select id,template_name,recipient,status,created_at,error from deliveries where owner_id = $1 order by created_at desc limit 100",
        [owner],
      ),
    ]);
    return Response.json(
      {
        templates: templates.rows,
        keys: keys.rows,
        deliveries: deliveries.rows,
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
    const payload = actionSchema.parse(await body(request));
    const db = admin();
    if (payload.action === "save") {
      const template = payload.template;
      try {
        renderTemplate(template, template.sample_data);
      } catch (error) {
        throw new HttpError(
          400,
          error instanceof Error ? error.message : "Invalid template.",
        );
      }
      const result = await db.query(
        `insert into templates(id, owner_id, name, html, variables, sample_data)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set name = excluded.name, html = excluded.html,
           variables = excluded.variables, sample_data = excluded.sample_data, updated_at = now()
         where templates.owner_id = $2 returning id`,
        [
          template.id,
          owner,
          template.name,
          template.html,
          JSON.stringify(template.variables),
          JSON.stringify(template.sample_data),
        ],
      );
      if (!result.rowCount) throw new HttpError(404, "Template not found.");
      return Response.json({ ok: true });
    }
    if (payload.action === "create_key") {
      const key = `pp_${randomBytes(32).toString("hex")}`;
      await db.query(
        "insert into api_keys(owner_id,name,hash,prefix) values ($1,$2,$3,$4)",
        [owner, payload.name, hash(key), key.slice(0, 11)],
      );
      return Response.json({ key });
    }
    await db.query(
      "update api_keys set revoked_at = now() where id = $1 and owner_id = $2",
      [payload.id, owner],
    );
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
