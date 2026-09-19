"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Copy,
  FileText,
  KeyRound,
  LayoutTemplate,
  LoaderCircle,
  LogOut,
  Mail,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  starter,
  renderTemplate,
  templateSchema,
  type Template,
  type Variable,
  type ApiKey,
  type Delivery,
} from "@/lib/templates";

const configured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const supabase = configured
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  : null;
type View = "templates" | "deliveries" | "keys" | "docs";
const navigation = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "deliveries", label: "Delivery history", icon: Send },
  { id: "keys", label: "API keys", icon: KeyRound },
  { id: "docs", label: "API reference", icon: Code2 },
] as const;

export default function Dashboard() {
  const [view, setView] = useState<View>("templates");
  const [templates, setTemplates] = useState<Template[]>([starter]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [newKey, setNewKey] = useState("");
  const [keyName, setKeyName] = useState("Production");
  async function api(path: string, payload?: unknown) {
    const session = await supabase?.auth.getSession();
    const response = await fetch(path, {
      method: payload ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(session?.data.session
          ? { Authorization: `Bearer ${session.data.session.access_token}` }
          : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Request failed.");
    }
    return response;
  }
  async function refresh() {
    const data = await (await api("/api/console")).json();
    setTemplates(data.templates);
    setKeys(data.keys);
    setDeliveries(data.deliveries);
  }
  useEffect(() => {
    let active = true;
    async function init() {
      if (!supabase) {
        try {
          const saved = localStorage.getItem("paperpost.templates");
          if (saved && active)
            setTemplates(
              JSON.parse(saved).map((t: unknown) => templateSchema.parse(t)),
            );
        } catch {
          /* Start with the example if local data is outdated. */
        }
        if (active) setLoaded(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (active) {
        setAccount(data.session?.user.email || "");
        setLoaded(true);
      }
    }
    void init();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setAccount(session?.user.email || "");
      if (!session) {
        setTemplates([]);
        setKeys([]);
        setDeliveries([]);
        setSelected(null);
      }
    });
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!account) return;
    let active = true;
    async function load() {
      try {
        const data = await (await api("/api/console")).json();
        if (active) {
          setTemplates(data.templates);
          setKeys(data.keys);
          setDeliveries(data.deliveries);
        }
      } catch (e) {
        if (active) setNotice((e as Error).message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [account]);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function authenticate(signup: boolean) {
    if (!supabase) return;
    const { error } = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (signup)
      setNotice(
        "Account created. Check your email to confirm your account, then sign in.",
      );
  }
  async function save(template: Template) {
    templateSchema.parse(template);
    renderTemplate(template, template.sample_data);
    if (supabase) {
      await api("/api/console", { action: "save", template });
      await refresh();
    } else {
      const next = [template, ...templates.filter((t) => t.id !== template.id)];
      localStorage.setItem("paperpost.templates", JSON.stringify(next));
      setTemplates(next);
    }
    setNotice(
      supabase
        ? "Template saved. It is ready for the API."
        : "Template saved in this browser.",
    );
  }
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice("Copied to clipboard.");
  }
  function createTemplate() {
    setSelected({
      ...structuredClone(starter),
      id: crypto.randomUUID(),
      name: "Untitled template",
    });
  }
  const example = templates[0] || starter;
  const snippet = `curl -X POST 'http://localhost:3000/api/v1/send' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Idempotency-Key: invoice-2026-001' \\\n  -d '${JSON.stringify({ template_id: example.id, to: "customer@example.com", variables: example.sample_data }, null, 2)}'`;

  if (loaded && configured && !account)
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
              void perform(() => authenticate(false));
            }}
          >
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            <button className="primary" disabled={busy}>
              Sign in <ArrowRight size={16} />
            </button>
            <button
              type="button"
              disabled={busy || !email || password.length < 8}
              onClick={() => void perform(() => authenticate(true))}
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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <span className="workspace-avatar">
            {account ? account[0].toUpperCase() : "P"}
          </span>
          <div>
            <strong>{account ? "My workspace" : "Personal workspace"}</strong>
            <small>{configured ? "Developer workspace" : "Local demo"}</small>
          </div>
          <Settings2 size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(id);
                setSelected(null);
                if (id === "deliveries" && account) void perform(refresh);
              }}
            >
              <Icon size={18} />
              {label}
              {id === "templates" && (
                <span className="nav-count">{templates.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <span className="tip-icon">
              <Braces size={19} />
            </span>
            <strong>From template to inbox.</strong>
            <p>
              Your documents, your data.
              <br />
              One simple API call.
            </p>
            <button
              onClick={() => {
                setView("docs");
                setSelected(null);
              }}
            >
              Explore the API <ArrowUpRight />
            </button>
          </div>
          <div className="profile">
            <span className="profile-avatar">
              {account ? account[0].toUpperCase() : "D"}
            </span>
            <div>
              <strong>{account || "Demo workspace"}</strong>
              <small>{account ? "Account owner" : "No account required"}</small>
            </div>
            {account && (
              <button
                title="Sign out"
                aria-label="Sign out"
                onClick={() => void supabase?.auth.signOut()}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={13} />
            <span>{navigation.find((n) => n.id === view)?.label}</span>
            {selected && (
              <>
                <ChevronRight size={13} />
                <span>{selected.name}</span>
              </>
            )}
          </div>
          <span className="environment">
            <i />
            {configured ? "Connected workspace" : "Demo mode"}
          </span>
        </header>
        <main className="main-content">
          {!configured && (
            <div className="demo-banner">
              <Sparkles size={15} />
              <span>
                You’re in the playground. Templates stay in this browser.
                Connect Supabase and Resend to send emails.
              </span>
              <button
                onClick={() => {
                  setView("docs");
                  setSelected(null);
                }}
              >
                Setup guide <ArrowRight size={14} />
              </button>
            </div>
          )}
          {!loaded ? (
            <div className="empty">
              <LoaderCircle className="spin" />
              Loading your workspace…
            </div>
          ) : selected ? (
            <Editor
              key={selected.id}
              initial={selected}
              busy={busy}
              onBack={() => setSelected(null)}
              onSave={(t) => perform(() => save(t))}
              onPdf={(t) =>
                perform(async () => {
                  const response = await api("/api/preview", { template: t });
                  const url = URL.createObjectURL(await response.blob());
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "preview.pdf";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                })
              }
              onSend={(t, to) =>
                perform(async () => {
                  await save(t);
                  const session = await supabase?.auth.getSession();
                  const response = await fetch("/api/v1/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session?.data.session?.access_token}`,
                      "Idempotency-Key": crypto.randomUUID(),
                    },
                    body: JSON.stringify({
                      template_id: t.id,
                      to,
                      variables: t.sample_data,
                    }),
                  });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);
                  setNotice(
                    "Email accepted by the provider. See delivery history for updates.",
                  );
                  await refresh();
                })
              }
              canSend={!!account}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR DOCUMENT WORKFLOW</div>
                  <h1>
                    {view === "templates"
                      ? "Templates"
                      : view === "deliveries"
                        ? "Delivery history"
                        : view === "keys"
                          ? "API keys"
                          : "Built for your workflow."}
                  </h1>
                  <p>
                    {view === "templates"
                      ? "Good documents start with a great template."
                      : view === "deliveries"
                        ? "Follow every document from your API to their inbox."
                        : view === "keys"
                          ? "A secure connection between your app and your documents."
                          : "Create once. Personalize with data. Deliver with one request."}
                  </p>
                </div>
                {view === "templates" && (
                  <button className="primary" onClick={createTemplate}>
                    <Plus size={17} /> Create template
                  </button>
                )}
                {view === "deliveries" && account && (
                  <button disabled={busy} onClick={() => void perform(refresh)}>
                    Refresh history
                  </button>
                )}
              </div>
              {view === "templates" && (
                <>
                  <div className="stats">
                    <Stat
                      label="YOUR TEMPLATES"
                      value={String(templates.length).padStart(2, "0")}
                      sub="Ready for your next idea"
                      icon={<LayoutTemplate size={19} />}
                    />
                    <Stat
                      label="DOCUMENTS SUBMITTED"
                      value={String(deliveries.length).padStart(2, "0")}
                      sub={
                        deliveries.length
                          ? "In your recent history"
                          : "Your first send is one call away"
                      }
                      icon={<Send size={19} />}
                    />
                    <Stat
                      label="ACTIVE API KEYS"
                      value={String(keys.length).padStart(2, "0")}
                      sub="Built to connect with your app"
                      icon={<KeyRound size={19} />}
                    />
                  </div>
                  <div className="section-heading">
                    <h2>
                      All templates <span>{templates.length}</span>
                    </h2>
                    <span>Make something worth sending.</span>
                  </div>
                  <div className="template-grid">
                    {templates.map((t) => (
                      <button
                        className="template-card"
                        key={t.id}
                        onClick={() => setSelected(structuredClone(t))}
                      >
                        <div className="template-art">
                          <div className="mini-paper">
                            <div className="mini-brand">
                              ◒{" "}
                              {t.name.toLowerCase().includes("invoice")
                                ? "acme studio"
                                : "your document"}
                            </div>
                            <div className="mini-title">
                              {t.name.toLowerCase().includes("invoice")
                                ? "Invoice"
                                : t.name}
                            </div>
                            <div className="mini-line short" />
                            <div className="mini-columns">
                              <div className="mini-line" />
                              <div className="mini-line" />
                            </div>
                            <div className="mini-table">
                              {[1, 2, 3].map((i) => (
                                <div key={i}>
                                  <span />
                                  <span />
                                </div>
                              ))}
                            </div>
                            <div className="mini-total" />
                            <div className="mini-footer" />
                          </div>
                          <span className="preview-chip">A4 · PDF</span>
                        </div>
                        <div className="template-info">
                          <div>
                            <h3>{t.name}</h3>
                            <p>
                              <Braces size={13} />
                              {t.variables.length} variables <span>·</span> HTML
                              template
                            </p>
                          </div>
                          <ArrowRight size={18} />
                        </div>
                      </button>
                    ))}
                    <button className="create-card" onClick={createTemplate}>
                      <span>
                        <Plus size={24} />
                      </span>
                      <h3>A fresh start</h3>
                      <p>
                        Turn your next document
                        <br />
                        into a reusable template.
                      </p>
                      <strong>
                        Create a template <ArrowRight size={14} />
                      </strong>
                    </button>
                  </div>
                  <div className="getting-started">
                    <div className="getting-icon">
                      <Code2 size={26} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        SMALL REQUEST. BIG POSSIBILITIES.
                      </span>
                      <h2>Your next PDF is an API call away.</h2>
                      <p>
                        Pass in your variables. We’ll take care of the PDF and
                        the email.
                      </p>
                    </div>
                    <button onClick={() => setView("docs")}>
                      View API reference <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="workflow">
                    <span>
                      <span>01</span> Design your template
                    </span>
                    <ArrowRight size={15} />
                    <span>
                      <span>02</span> Define your variables
                    </span>
                    <ArrowRight size={15} />
                    <span>
                      <span>03</span> Send with the API
                    </span>
                  </div>
                </>
              )}
              {view === "keys" && (
                <div className="panel">
                  <h2>Create an API key</h2>
                  <p>
                    Keys can send documents from this workspace. The full key is
                    shown only once.
                  </p>
                  <div className="inline-form">
                    <input
                      aria-label="Key name"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Key name"
                    />
                    <button
                      className="primary"
                      disabled={!account || busy || !keyName.trim()}
                      onClick={() =>
                        void perform(async () => {
                          const result = await (
                            await api("/api/console", {
                              action: "create_key",
                              name: keyName,
                            })
                          ).json();
                          setNewKey(result.key);
                          await refresh();
                        })
                      }
                    >
                      <Plus size={16} />
                      Create key
                    </button>
                  </div>
                  {!account && (
                    <p className="notice-inline">
                      Connect Supabase and sign in to create real API keys.
                    </p>
                  )}
                  {newKey && (
                    <div className="key-reveal">
                      <strong>
                        Copy this key now. It won’t be shown again.
                      </strong>
                      <code>{newKey}</code>
                      <button onClick={() => void perform(() => copy(newKey))}>
                        <Copy size={14} />
                        Copy key
                      </button>
                      <button onClick={() => setNewKey("")}>Dismiss</button>
                    </div>
                  )}
                  {keys.map((k) => (
                    <div className="list-row" key={k.id}>
                      <KeyRound size={18} />
                      <strong>{k.name}</strong>
                      <code>{k.prefix}…</code>
                      <button
                        onClick={() =>
                          void perform(async () => {
                            await api("/api/console", {
                              action: "revoke_key",
                              id: k.id,
                            });
                            await refresh();
                            setNotice("API key revoked.");
                          })
                        }
                        disabled={busy}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {view === "deliveries" && (
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
                                <span className={`status ${d.status}`}>
                                  {d.status}
                                </span>
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
                      <button onClick={() => setView("docs")}>
                        Explore the API <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <p className="muted-note">
                    Accepted means the email provider received the request.
                    Delivered and bounced statuses require the Resend webhook.
                    Showing the latest 100 requests.
                  </p>
                </div>
              )}
              {view === "docs" && (
                <div className="docs-grid">
                  <div className="panel">
                    <span className="method">POST</span>{" "}
                    <code>/api/v1/send</code>
                    <h2>One request. One PDF. Delivered.</h2>
                    <p>
                      Use a workspace API key and a saved template ID. Variables
                      must match the fields defined in the template.
                    </p>
                    <div className="code-heading">
                      <span>cURL example</span>
                      <button
                        aria-label="Copy API example"
                        onClick={() => void perform(() => copy(snippet))}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <pre>{snippet}</pre>
                    <h3>Predictable by design</h3>
                    <p>
                      Supply a unique <code>Idempotency-Key</code> for each
                      email. Repeating it returns the original request status. A
                      different payload with the same key returns 409.
                    </p>
                    <p>
                      Successful submissions return <code>202</code> with an ID
                      and <code>accepted</code> status. Invalid variables return
                      400, invalid credentials 401, missing templates 404, and
                      rate limits 429.
                    </p>
                  </div>
                  <div className="panel setup">
                    <h2>Connect your workspace</h2>
                    <ol>
                      <li>
                        <strong>Create a Supabase project</strong>
                        <p>
                          Run <code>supabase/schema.sql</code> in its SQL
                          editor.
                        </p>
                      </li>
                      <li>
                        <strong>Add environment variables</strong>
                        <p>
                          Copy <code>.env.example</code> to{" "}
                          <code>.env.local</code> and add the Supabase URL, anon
                          key, and service role key.
                        </p>
                      </li>
                      <li>
                        <strong>Connect Resend</strong>
                        <p>
                          Add your API key and a verified <code>MAIL_FROM</code>{" "}
                          address.
                        </p>
                      </li>
                      <li>
                        <strong>Track delivery</strong>
                        <p>
                          Point Resend email events to{" "}
                          <code>/api/webhooks/resend</code> and set its signing
                          secret.
                        </p>
                      </li>
                      <li>
                        <strong>Restart and sign in</strong>
                        <p>
                          Create a template and an API key. You’re ready to
                          send.
                        </p>
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </>
          )}
          <footer>
            Made for the things that deserve a document.
            <span>
              <span className="footer-dot" /> Paperpost
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function ArrowUpRight() {
  return <ArrowRight size={14} style={{ transform: "rotate(-35deg)" }} />;
}
function Brand() {
  return (
    <div className="brand">
      <span>
        <FileText size={22} strokeWidth={1.8} />
      </span>
      paperpost<span className="brand-period">.</span>
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}

function Editor({
  initial,
  busy,
  onBack,
  onSave,
  onPdf,
  onSend,
  canSend,
}: {
  initial: Template;
  busy: boolean;
  onBack: () => void;
  onSave: (t: Template) => Promise<void>;
  onPdf: (t: Template) => Promise<void>;
  onSend: (t: Template, to: string) => Promise<void>;
  canSend: boolean;
}) {
  const [template, setTemplate] = useState(initial);
  const [tab, setTab] = useState<"html" | "variables" | "data">("html");
  const [sample, setSample] = useState(
    JSON.stringify(initial.sample_data, null, 2),
  );
  const [recipient, setRecipient] = useState("");
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    try {
      const data = JSON.parse(sample);
      return { html: renderTemplate(template, data), error: "" };
    } catch (e) {
      return { html: "", error: (e as Error).message };
    }
  }, [template, sample]);
  function current() {
    return { ...template, sample_data: JSON.parse(sample) };
  }
  async function action(fn: (t: Template) => Promise<void>) {
    try {
      setError("");
      await fn(current());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function updateVariable(index: number, field: Variable) {
    setTemplate({
      ...template,
      variables: template.variables.map((v, i) => (i === index ? field : v)),
    });
  }
  return (
    <>
      <button className="back" onClick={onBack}>
        <ArrowLeft size={14} /> All templates
      </button>
      <div className="editor-heading">
        <div>
          <input
            className="title-input"
            aria-label="Template name"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          />
          <div className="template-id">
            Template ID <code>{template.id}</code>
          </div>
        </div>
        <div className="button-group">
          <button
            disabled={busy || !!preview.error}
            onClick={() => void action(onPdf)}
          >
            <ArrowDownToLine size={16} /> Download PDF
          </button>
          <button
            className="primary"
            disabled={busy || !!preview.error}
            onClick={() => void action(onSave)}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Check size={16} />
            )}{" "}
            Save template
          </button>
        </div>
      </div>
      <div className="editor-grid">
        <section className="editor-panel">
          <div className="editor-tabs">
            {(["html", "variables", "data"] as const).map((t) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {t === "html" ? <Code2 size={15} /> : <Braces size={15} />}{" "}
                {t === "html"
                  ? "HTML & CSS"
                  : t === "variables"
                    ? `Variables (${template.variables.length})`
                    : "Sample data"}
              </button>
            ))}
          </div>
          {tab === "html" ? (
            <>
              <div className="editor-help">
                Use <code>{"{{variable}}"}</code> and{" "}
                <code>{"{{#each items}}…{{/each}}"}</code>. Styles go in a
                &lt;style&gt; tag.
              </div>
              <textarea
                className="code-editor"
                spellCheck={false}
                aria-label="Template HTML and CSS"
                value={template.html}
                onChange={(e) =>
                  setTemplate({ ...template, html: e.target.value })
                }
              />
            </>
          ) : tab === "data" ? (
            <>
              <div className="editor-help">
                Use sample JSON to see how your real document will look.
              </div>
              <textarea
                className="code-editor"
                spellCheck={false}
                aria-label="Sample JSON data"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
              />
            </>
          ) : (
            <div className="variables-editor">
              <p>
                Only fields defined here can be passed through the API. Images
                use embedded PNG, JPEG or WebP data URLs.
              </p>
              {template.variables.map((v, i) => (
                <div className="variable" key={i}>
                  <div className="variable-row">
                    <input
                      aria-label={`Variable ${i + 1} name`}
                      value={v.name}
                      onChange={(e) =>
                        updateVariable(i, { ...v, name: e.target.value })
                      }
                      placeholder="variable_name"
                    />
                    <select
                      aria-label={`Type for ${v.name}`}
                      value={v.type}
                      onChange={(e) => {
                        const type = e.target.value as Variable["type"];
                        updateVariable(
                          i,
                          type === "list"
                            ? {
                                name: v.name,
                                type,
                                required: v.required,
                                fields: [
                                  {
                                    name: "description",
                                    type: "text",
                                    required: true,
                                  },
                                ],
                              }
                            : { name: v.name, type, required: v.required },
                        );
                      }}
                    >
                      {["text", "number", "date", "image", "list"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      aria-label={`Remove ${v.name}`}
                      onClick={() =>
                        setTemplate({
                          ...template,
                          variables: template.variables.filter(
                            (_, j) => j !== i,
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={v.required}
                      onChange={(e) =>
                        updateVariable(i, { ...v, required: e.target.checked })
                      }
                    />
                    Required
                  </label>
                  {v.type !== "list" ? (
                    <input
                      aria-label={`Default for ${v.name}`}
                      placeholder="Default value (optional)"
                      value={v.default ?? ""}
                      onChange={(e) => {
                        const updated = { ...v };
                        if (e.target.value === "") delete updated.default;
                        else
                          updated.default =
                            v.type === "number"
                              ? Number(e.target.value)
                              : e.target.value;
                        updateVariable(i, updated);
                      }}
                    />
                  ) : (
                    <div className="list-fields">
                      <small>Row fields</small>
                      {v.fields.map((f, j) => (
                        <div className="variable-row" key={j}>
                          <input
                            aria-label={`Row field ${j + 1} name`}
                            value={f.name}
                            onChange={(e) =>
                              updateVariable(i, {
                                ...v,
                                fields: v.fields.map((x, k) =>
                                  k === j ? { ...x, name: e.target.value } : x,
                                ),
                              })
                            }
                          />
                          <select
                            aria-label={`Type for row field ${f.name}`}
                            value={f.type}
                            onChange={(e) =>
                              updateVariable(i, {
                                ...v,
                                fields: v.fields.map((x, k) =>
                                  k === j
                                    ? {
                                        ...x,
                                        type: e.target.value as typeof f.type,
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            {["text", "number", "date", "image"].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                          <button
                            aria-label={`Remove row field ${f.name}`}
                            onClick={() =>
                              updateVariable(i, {
                                ...v,
                                fields: v.fields.filter((_, k) => k !== j),
                              })
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          updateVariable(i, {
                            ...v,
                            fields: [
                              ...v.fields,
                              {
                                name: `field_${v.fields.length + 1}`,
                                type: "text",
                                required: true,
                              },
                            ],
                          })
                        }
                      >
                        <Plus size={13} /> Add row field
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setTemplate({
                    ...template,
                    variables: [
                      ...template.variables,
                      {
                        name: `variable_${template.variables.length + 1}`,
                        type: "text",
                        required: true,
                      },
                    ],
                  })
                }
              >
                <Plus size={15} /> Add variable
              </button>
            </div>
          )}
        </section>
        <section className="preview-panel">
          <div className="preview-heading">
            <span>
              <span className="live-dot" /> Live preview
            </span>
            <small>A4 · HTML preview</small>
          </div>
          {preview.error ? (
            <div className="preview-error">
              <Braces size={24} />
              <h3>Let’s check your data</h3>
              <p>{preview.error}</p>
            </div>
          ) : (
            <div className="preview-scroll">
              <iframe
                title="Live document preview"
                sandbox=""
                srcDoc={preview.html}
              />
            </div>
          )}
          <div className="preview-note">
            Download the PDF to check final pagination and print layout.
          </div>
        </section>
      </div>
      {error && (
        <p role="alert" className="notice-inline">
          {error}
        </p>
      )}
      <form
        className="test-send panel"
        onSubmit={(e) => {
          e.preventDefault();
          void action((t) => onSend(t, recipient));
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
        <button
          className="primary"
          disabled={!canSend || busy || !!preview.error}
        >
          <Send size={15} /> Send test email
        </button>
      </form>
    </>
  );
}
