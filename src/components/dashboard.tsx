"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Sparkles, X } from "lucide-react";
import {
  starter,
  renderTemplate,
  templateSchema,
  type Template,
  type ApiKey,
  type Delivery,
} from "@/lib/templates";
import type { View } from "./navigation";
import AuthForm from "./auth-form";
import Sidebar from "./sidebar";
import DashboardHeader from "./dashboard-header";
import PageHeading from "./page-heading";
import TemplatesView from "./templates-view";
import ApiKeysView from "./api-keys-view";
import DeliveriesView from "./deliveries-view";
import ApiReference from "./api-reference";
import TemplateEditor from "./template-editor";

const consoleSchema = z.object({
  templates: z.array(templateSchema),
  keys: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      prefix: z.string(),
      created_at: z.string(),
    }),
  ),
  deliveries: z.array(
    z.object({
      id: z.string(),
      template_name: z.string(),
      recipient: z.string(),
      status: z.string(),
      created_at: z.string(),
      error: z.string().nullable(),
    }),
  ),
});
const errorSchema = z.object({ error: z.string().optional() });
export default function Dashboard() {
  const [configured, setConfigured] = useState(false);
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
    const response = await fetch(path, {
      method: payload ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    if (!response.ok) {
      const data = errorSchema.parse(await response.json());
      throw new Error(data.error || "Request failed.");
    }
    return response;
  }
  async function refresh() {
    const data = consoleSchema.parse(await (await api("/api/console")).json());
    setTemplates(data.templates);
    setKeys(data.keys);
    setDeliveries(data.deliveries);
  }
  useEffect(() => {
    let active = true;
    async function init() {
      const data = z
        .object({ configured: z.boolean(), email: z.string() })
        .parse(await (await api("/api/auth")).json());
      if (active) setConfigured(data.configured);
      if (!data.configured) {
        try {
          const saved = localStorage.getItem("paperpost.templates");
          if (saved && active)
            setTemplates(z.array(templateSchema).parse(JSON.parse(saved)));
        } catch {
          /* Start with the example if local data is outdated. */
        }
        if (active) setLoaded(true);
        return;
      }
      if (active) {
        setTemplates([]);
        setAccount(data.email);
        setLoaded(true);
      }
    }
    void init().catch((error: unknown) => {
      if (active)
        setNotice(
          error instanceof Error ? error.message : "Unable to load account.",
        );
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!account) return;
    let active = true;
    async function load() {
      try {
        const data = consoleSchema.parse(
          await (await api("/api/console")).json(),
        );
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
    const data = z.object({ email: z.string() }).parse(
      await (
        await api("/api/auth", {
          action: signup ? "signup" : "signin",
          email,
          password,
        })
      ).json(),
    );
    setAccount(data.email);
    setPassword("");
  }
  async function signOut() {
    const response = await fetch("/api/auth", { method: "DELETE" });
    if (!response.ok) throw new Error("Unable to sign out.");
    setAccount("");
    setTemplates([]);
    setKeys([]);
    setDeliveries([]);
    setSelected(null);
  }

  async function save(template: Template) {
    templateSchema.parse(template);
    renderTemplate(template, template.sample_data);
    if (configured) {
      await api("/api/console", { action: "save", template });
      await refresh();
    } else {
      const next = [template, ...templates.filter((t) => t.id !== template.id)];
      localStorage.setItem("paperpost.templates", JSON.stringify(next));
      setTemplates(next);
    }
    setNotice(
      configured
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
  function navigate(nextView: View) {
    setView(nextView);
    setSelected(null);
    if (nextView === "deliveries" && account) void perform(refresh);
  }
  async function createKey() {
    const result = z
      .object({ key: z.string() })
      .parse(
        await (
          await api("/api/console", { action: "create_key", name: keyName })
        ).json(),
      );
    setNewKey(result.key);
    await refresh();
  }
  async function revokeKey(id: string) {
    await api("/api/console", { action: "revoke_key", id });
    await refresh();
    setNotice("API key revoked.");
  }
  const example = templates[0] || starter;
  const snippet = `curl -X POST 'http://localhost:3000/api/v1/send' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Idempotency-Key: invoice-2026-001' \\\n  -d '${JSON.stringify({ template_id: example.id, to: "customer@example.com", variables: example.sample_data }, null, 2)}'`;

  if (!loaded)
    return (
      <main className="auth">
        <p role="status">{notice || "Loading your workspace…"}</p>
      </main>
    );
  if (configured && !account)
    return (
      <AuthForm
        email={email}
        password={password}
        busy={busy}
        notice={notice}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onAuthenticate={(signup) => void perform(() => authenticate(signup))}
      />
    );
  return (
    <div className="app-shell">
      <Sidebar
        account={account}
        configured={configured}
        view={view}
        templateCount={templates.length}
        onNavigate={navigate}
        onSignOut={() => void perform(signOut)}
      />
      <div className="main-shell">
        <DashboardHeader
          view={view}
          selected={selected}
          configured={configured}
        />
        <main className="main-content">
          {!configured && (
            <div className="demo-banner">
              <Sparkles size={15} />
              <span>
                You’re in the playground. Templates stay in this browser.
                Connect PostgreSQL and Resend to send emails.
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
          {selected ? (
            <TemplateEditor
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
                  const response = await fetch("/api/v1/send", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Idempotency-Key": crypto.randomUUID(),
                    },
                    body: JSON.stringify({
                      template_id: t.id,
                      to,
                      variables: t.sample_data,
                    }),
                  });
                  const result = errorSchema.parse(await response.json());
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
              <PageHeading
                view={view}
                account={account}
                busy={busy}
                onCreate={createTemplate}
                onRefresh={() => void perform(refresh)}
              />
              {view === "templates" && (
                <TemplatesView
                  templates={templates}
                  deliveryCount={deliveries.length}
                  keyCount={keys.length}
                  onSelect={(template) =>
                    setSelected(structuredClone(template))
                  }
                  onCreate={createTemplate}
                  onDocs={() => setView("docs")}
                />
              )}
              {view === "keys" && (
                <ApiKeysView
                  keys={keys}
                  account={account}
                  busy={busy}
                  keyName={keyName}
                  newKey={newKey}
                  onNameChange={setKeyName}
                  onCreate={() => void perform(createKey)}
                  onRevoke={(id) => void perform(() => revokeKey(id))}
                  onCopy={() => void perform(() => copy(newKey))}
                  onDismiss={() => setNewKey("")}
                />
              )}
              {view === "deliveries" && (
                <DeliveriesView
                  deliveries={deliveries}
                  onDocs={() => setView("docs")}
                />
              )}
              {view === "docs" && (
                <ApiReference
                  snippet={snippet}
                  onCopy={() => void perform(() => copy(snippet))}
                />
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
