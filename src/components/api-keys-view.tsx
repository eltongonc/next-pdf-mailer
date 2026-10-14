import { Copy, KeyRound, Plus } from "lucide-react";
import { Alert, Button, Paper, TextInput } from "@mantine/core";
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
    <Paper className="panel" withBorder>
      <h2>Create an API key</h2>
      <p>
        Keys can send documents from this workspace. The full key is shown only
        once.
      </p>
      <div className="inline-form">
        <TextInput className="key-name-field"
          aria-label="Key name"
          value={keyName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Key name"
        />
        <Button variant="filled" leftSection={<Plus size={16} />}
          className="primary"
          disabled={!account || busy || !keyName.trim()}
          onClick={() => onCreate()}
        >
          Create key
        </Button>
      </div>
      {!account && (
        <Alert color="yellow" className="notice-inline">
          Connect PostgreSQL and sign in to create real API keys.
        </Alert>
      )}
      {newKey && (
        <div className="key-reveal">
          <strong>Copy this key now. It won’t be shown again.</strong>
          <code>{newKey}</code>
          <Button onClick={() => onCopy()} leftSection={<Copy size={14} />}>
            Copy key
          </Button>
          <Button onClick={() => onDismiss()}>Dismiss</Button>
        </div>
      )}
      {keys.map((k) => (
        <div className="list-row" key={k.id}>
          <KeyRound size={18} />
          <strong>{k.name}</strong>
          <code>{k.prefix}…</code>
          <Button onClick={() => onRevoke(k.id)} disabled={busy}>
            Revoke
          </Button>
        </div>
      ))}
    </Paper>
  );
}
