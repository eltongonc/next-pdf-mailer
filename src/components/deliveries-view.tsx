import { ArrowRight, Mail } from "lucide-react";
import type { Delivery } from "@/lib/templates";

export default function DeliveriesView({
  deliveries,
  onDocs,
}: {
  deliveries: Delivery[];
  onDocs: () => void;
}) {
  return (
    <div className="panel">
      {deliveries.length ? (
        <div className="table-scroll">
          <table className="delivery-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.template_name}</strong>
                    {d.error && <small>{d.error}</small>}
                  </td>
                  <td>{d.recipient}</td>
                  <td>
                    <span className={`status ${d.status}`}>{d.status}</span>
                  </td>
                  <td>{new Date(d.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <Mail size={30} />
          </span>
          <h2>Your first delivery starts here.</h2>
          <p>
            Send a saved template from the editor or call the API.
            <br />
            Its progress will appear here.
          </p>
          <button onClick={() => onDocs()}>
            Explore the API <ArrowRight size={15} />
          </button>
        </div>
      )}
      <p className="muted-note">
        Accepted means the email provider received the request. Delivered and
        bounced statuses require the Resend webhook. Showing the latest 100
        requests.
      </p>
    </div>
  );
}
