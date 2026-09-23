import { Copy, KeyRound, Plus } from "lucide-react";
import type { ApiKey } from "@/lib/templates";

export default function ApiKeysView({
  keys,
  account,
  busy,
  keyName,
  newKey,
  onNameChange,
  onCreate,
  onRevoke,
  onCopy,
  onDismiss,
}: {
  keys: ApiKey[];
  account: string;
  busy: boolean;
  keyName: string;
  newKey: string;
  onNameChange: (name: string) => void;
  onCreate: () => void;
  onRevoke: (id: string) => void;
  onCopy: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="panel">
      <h2>Create an API key</h2>
      <p>
        Keys can send documents from this workspace. The full key is shown only
        once.
      </p>
      <div className="inline-form">
        <input
          aria-label="Key name"
          value={keyName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Key name"
        />
        <button
          className="primary"
          disabled={!account || busy || !keyName.trim()}
          onClick={() => onCreate()}
        >
          <Plus size={16} />
          Create key
        </button>
      </div>
      {!account && (
        <p className="notice-inline">
          Connect PostgreSQL and sign in to create real API keys.
        </p>
      )}
      {newKey && (
        <div className="key-reveal">
          <strong>Copy this key now. It won’t be shown again.</strong>
          <code>{newKey}</code>
          <button onClick={() => onCopy()}>
            <Copy size={14} />
            Copy key
          </button>
          <button onClick={() => onDismiss()}>Dismiss</button>
        </div>
      )}
      {keys.map((k) => (
        <div className="list-row" key={k.id}>
          <KeyRound size={18} />
          <strong>{k.name}</strong>
          <code>{k.prefix}…</code>
          <button onClick={() => onRevoke(k.id)} disabled={busy}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}
