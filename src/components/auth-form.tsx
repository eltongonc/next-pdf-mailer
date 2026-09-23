import { ArrowRight } from "lucide-react";
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
      <div className="auth-card">
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
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={12}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="At least 12 characters"
            />
          </label>
          <button className="primary" disabled={busy}>
            Sign in <ArrowRight size={16} />
          </button>
          <button
            type="button"
            disabled={busy || !email || password.length < 12}
            onClick={() => onAuthenticate(true)}
          >
            Create an account
          </button>
        </form>
        {notice && (
          <p role="status" className="notice-inline">
            {notice}
          </p>
        )}
      </div>
    </main>
  );
}
