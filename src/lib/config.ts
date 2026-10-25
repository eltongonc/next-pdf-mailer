import { z } from "zod";

const productionConfig = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return (
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        Boolean(url.hostname) &&
        url.pathname.length > 1
      );
    }),
  APP_ORIGIN: z
    .string()
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return url.protocol === "https:" && url.origin === value;
    }),
});

// Report variable names only: configuration errors must never reveal secrets.
export function validateProductionConfig(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== "production") return;
  const result = productionConfig.safeParse(env);
  const invalid = new Set<string>();
  if (!result.success) {
    for (const issue of result.error.issues) invalid.add(String(issue.path[0]));
  }
  const emailEnabled = [
    env.RESEND_API_KEY,
    env.MAIL_FROM,
    env.RESEND_WEBHOOK_SECRET,
  ].some(Boolean);
  if (emailEnabled) {
    if (!env.RESEND_API_KEY?.startsWith("re_")) invalid.add("RESEND_API_KEY");
    const sender = env.MAIL_FROM?.match(/<([^<>]+)>$/)?.[1] ?? env.MAIL_FROM;
    if (!z.email().safeParse(sender).success) invalid.add("MAIL_FROM");
    if (!env.RESEND_WEBHOOK_SECRET?.startsWith("whsec_"))
      invalid.add("RESEND_WEBHOOK_SECRET");
  }
  if (invalid.size) {
    throw new Error(
      `Invalid production configuration: ${[...invalid].join(", ")}. Set DATABASE_URL and an exact HTTPS APP_ORIGIN; email requires RESEND_API_KEY, MAIL_FROM and RESEND_WEBHOOK_SECRET together.`,
    );
  }
}
