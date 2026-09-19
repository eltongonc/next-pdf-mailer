import { body, configured, failure, HttpError, userId } from "@/lib/server";
import { renderTemplate, templateSchema } from "@/lib/templates";
import { generatePdf } from "@/lib/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (configured()) await userId(request);
    else if (process.env.NODE_ENV === "production")
      throw new HttpError(
        503,
        "Configure Supabase before enabling previews in production.",
      );
    const input = await body(request);
    const template = templateSchema.parse(input.template);
    let html: string;
    try {
      html = renderTemplate(template, template.sample_data);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const pdf = await generatePdf(html);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="preview.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
