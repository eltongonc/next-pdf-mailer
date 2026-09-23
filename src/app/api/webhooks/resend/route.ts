import { Resend } from "resend";
import { admin, failure, HttpError } from "@/lib/server";
export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_WEBHOOK_SECRET)
      throw new HttpError(503, "Webhook is not configured.");
    const payload = await request.text();
    if (payload.length > 100000) throw new HttpError(413, "Payload too large.");
    let event;
    try {
      event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
        payload,
        headers: {
          id: request.headers.get("svix-id") || "",
          timestamp: request.headers.get("svix-timestamp") || "",
          signature: request.headers.get("svix-signature") || "",
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      });
    } catch {
      throw new HttpError(401, "Invalid webhook signature.");
    }
    const status = (
      {
        "email.delivered": "delivered",
        "email.bounced": "bounced",
        "email.failed": "failed",
      } as Record<string, string>
    )[event.type];
    if (status && "email_id" in event.data) {
      const db = admin();
      const found = await db.query<{ id: string }>(
        "select id from deliveries where provider_id = $1",
        [event.data.email_id],
      );
      // A webhook can race the send response. Ask the provider to retry after the record is linked.
      if (!found.rows[0])
        throw new HttpError(
          503,
          "Delivery record not yet available. Retry this event.",
        );
      await db.query(
        "update deliveries set status = $1 where id = $2 and status in ('accepted','processing')",
        [status, found.rows[0].id],
      );
    }
    return Response.json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
