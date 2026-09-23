import { useState } from "react";
import { Send } from "lucide-react";

export default function TestSendForm({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (recipient: string) => void;
}) {
  const [recipient, setRecipient] = useState("");
  return (
    <form
      className="test-send panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(recipient);
      }}
    >
      <div>
        <h3>Try the full journey.</h3>
        <p>Save this template and email a PDF using the sample data.</p>
      </div>
      <input
        type="email"
        required
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="you@example.com"
        aria-label="Test recipient email"
      />
      <button className="primary" disabled={disabled}>
        <Send size={15} /> Send test email
      </button>
    </form>
  );
}
