import { Copy } from "lucide-react";

export default function ApiReference({
  snippet,
  onCopy,
}: {
  snippet: string;
  onCopy: () => void;
}) {
  return (
    <div className="docs-grid">
      <div className="panel">
        <span className="method">POST</span> <code>/api/v1/send</code>
        <h2>One request. One PDF. Delivered.</h2>
        <p>
          Use a workspace API key and a saved template ID. Variables must match
          the fields defined in the template.
        </p>
        <div className="code-heading">
          <span>cURL example</span>
          <button aria-label="Copy API example" onClick={() => onCopy()}>
            <Copy size={14} />
          </button>
        </div>
        <pre>{snippet}</pre>
        <h3>Predictable by design</h3>
        <p>
          Supply a unique <code>Idempotency-Key</code> for each email. Repeating
          it returns the original request status. A different payload with the
          same key returns 409.
        </p>
        <p>
          Successful submissions return <code>202</code> with an ID and{" "}
          <code>accepted</code> status. Invalid variables return 400, invalid
          credentials 401, missing templates 404, and rate limits 429.
        </p>
      </div>
      <div className="panel setup">
        <h2>Connect your workspace</h2>
        <ol>
          <li>
            <strong>Create a PostgreSQL database</strong>
            <p>
              Run <code>database/schema.sql</code> using psql.
            </p>
          </li>
          <li>
            <strong>Add environment variables</strong>
            <p>
              Copy <code>.env.example</code> to <code>.env.local</code> and set
              the server-only DATABASE_URL.
            </p>
          </li>
          <li>
            <strong>Connect Resend</strong>
            <p>
              Add your API key and a verified <code>MAIL_FROM</code> address.
            </p>
          </li>
          <li>
            <strong>Track delivery</strong>
            <p>
              Point Resend email events to <code>/api/webhooks/resend</code> and
              set its signing secret.
            </p>
          </li>
          <li>
            <strong>Restart and sign in</strong>
            <p>Create a template and an API key. You’re ready to send.</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
