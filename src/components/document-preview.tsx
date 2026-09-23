import { Braces } from "lucide-react";

export default function DocumentPreview({
  html,
  error,
}: {
  html: string;
  error: string;
}) {
  return (
    <section className="preview-panel">
      <div className="preview-heading">
        <span>
          <span className="live-dot" /> Live preview
        </span>
        <small>A4 · HTML preview</small>
      </div>
      {error ? (
        <div className="preview-error">
          <Braces size={24} />
          <h3>Let’s check your data</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="preview-scroll">
          <iframe title="Live document preview" sandbox="" srcDoc={html} />
        </div>
      )}
      <div className="preview-note">
        Download the PDF to check final pagination and print layout.
      </div>
    </section>
  );
}
