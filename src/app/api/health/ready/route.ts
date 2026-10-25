import { admin } from "@/lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Check required columns and function resolution without reading customer data.
    await admin().query({
      text: `select u.id, u.email, u.password_hash, s.hash, s.expires_at,
        t.html, t.variables, t.sample_data, k.hash, k.revoked_at,
        d.provider_id, d.idempotency_key, d.request_hash, a.email_hash,
        'public.reserve_delivery(uuid,text,text,uuid,text,text)'::regprocedure
        from public.users u, public.sessions s, public.templates t,
        public.api_keys k, public.deliveries d, public.auth_attempts a
        where false`,
    });
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
