import { ArrowRight } from "lucide-react";
import { Alert, Button, Paper, PasswordInput, TextInput } from "@mantine/core";
import Brand from "./brand";

export default function AuthForm({
  email,
  password,
  busy,
  notice,
  onEmailChange,
  onPasswordChange,
  onAuthenticate,
}: {
  email: string;
  password: string;
  busy: boolean;
  notice: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onAuthenticate: (signup: boolean) => void;
}) {
  return (
    <main className="auth">
      <Paper className="auth-card" withBorder>
        <Brand />
        <div className="eyebrow">DOCUMENTS, DELIVERED.</div>
        <h1>A little less paperwork.</h1>
        <p>Create beautiful PDFs. Deliver them with a single API call.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAuthenticate(false);
          }}
        >
            <TextInput
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@company.com"
            />
            <PasswordInput
              label="Password"
              minLength={12}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="At least 12 characters"
            />
          <Button type="submit" variant="filled" className="primary" disabled={busy} rightSection={<ArrowRight size={16} />}>
            Sign in
          </Button>
          <Button
            type="button"
            disabled={busy || !email || password.length < 12}
            onClick={() => onAuthenticate(true)}
          >
            Create an account
          </Button>
        </form>
        {notice && (
          <Alert role="status" color="yellow" className="notice-inline">
            {notice}
          </Alert>
        )}
      </Paper>
    </main>
  );
}
