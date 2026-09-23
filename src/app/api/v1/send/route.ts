import { z } from "zod";
import { Resend } from "resend";
import { admin, body, failure, hash, HttpError, userId } from "@/lib/server";
import { renderTemplate, templateSchema } from "@/lib/templates";
import { generatePdf } from "@/lib/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
const schema = z
  .object({
    template_id: z.string().uuid(),
    to: z.email(),
    variables: z.record(z.string(), z.unknown()),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const owner = await userId(request, true);
    if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM)
      throw new HttpError(503, "Email provider is not configured.");
    const input = schema.parse(await body(request));
    const idempotency = request.headers.get("idempotency-key");
    if (!idempotency || !/^[\w-]{8,128}$/.test(idempotency))
      throw new HttpError(
        400,
        "Provide an Idempotency-Key header (8–128 letters, numbers, underscores or hyphens).",
      );
    const db = admin();
    const result = await db.query<Record<string, unknown>>(
      "select id,name,html,variables,sample_data from templates where id = $1 and owner_id = $2",
      [input.template_id, owner],
    );
    const stored = result.rows[0];
    if (!stored) throw new HttpError(404, "Template not found.");
    const template = templateSchema.parse(stored);
    let html: string;
    try {
      html = renderTemplate(template, input.variables);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const reserved = await db.query<{
      reservation: {
        id: string;
        status: string;
        conflict?: boolean;
        limited?: boolean;
        existing?: boolean;
      };
    }>("select reserve_delivery($1,$2,$3,$4,$5,$6) as reservation", [
      owner,
      idempotency,
      hash(JSON.stringify(input)),
      template.id,
      template.name,
      input.to,
    ]);
    const reservation = reserved.rows[0]?.reservation;
    if (!reservation) throw new Error("Delivery reservation failed.");
    if (reservation.conflict)
      throw new HttpError(
        409,
        "This Idempotency-Key was already used with a different request.",
      );
    if (reservation.limited)
      throw new HttpError(
        429,
        "Limit reached: 20 sends per minute per workspace.",
      );
    if (reservation.existing)
      return Response.json({
        id: reservation.id,
        status: reservation.status,
        replay: true,
      });
    let accepted = false;
    try {
      const pdf = await generatePdf(html);
      const { data, error: sendError } = await new Resend(
        process.env.RESEND_API_KEY,
      ).emails.send(
        {
          from: process.env.MAIL_FROM,
          to: input.to,
          subject: template.name,
          text: "Your document is attached to this email.",
          attachments: [
            { filename: "document.pdf", content: Buffer.from(pdf) },
          ],
        },
        { idempotencyKey: `${owner}/${idempotency}` },
      );
      if (sendError || !data)
        throw new Error("Email provider did not confirm acceptance.");
      accepted = true;
      await db.query(
        "update deliveries set status = 'accepted', provider_id = $1 where id = $2 and owner_id = $3",
        [data.id, reservation.id, owner],
      );
      return Response.json(
        { id: reservation.id, status: "accepted" },
        { status: 202 },
      );
    } catch (e) {
      // Ambiguous provider failures must not cause automatic duplicate sends.
      try {
        await db.query(
          "update deliveries set status = $1, error = $2 where id = $3 and owner_id = $4",
          [
            accepted ? "accepted" : "failed",
            accepted
              ? "Provider accepted; delivery tracking needs reconciliation."
              : "Send was not confirmed. Check provider logs before submitting a new request.",
            reservation.id,
            owner,
          ],
        );
      } catch {
        console.error("Unable to update delivery status:", reservation.id);
      }
      throw e;
    }
  } catch (error) {
    return failure(error);
  }
}
