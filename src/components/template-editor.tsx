import VariablesEditor from "./variables-editor";
import DocumentPreview from "./document-preview";
import TestSendForm from "./test-send-form";
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  Braces,
  Check,
  Code2,
  LoaderCircle,
} from "lucide-react";
import { renderTemplate, templateSchema, type Template } from "@/lib/templates";
export default function TemplateEditor({
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
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    try {
      const data: unknown = JSON.parse(sample);
      return { html: renderTemplate(template, data), error: "" };
    } catch (e) {
      return { html: "", error: (e as Error).message };
    }
  }, [template, sample]);
  function current() {
    return templateSchema.parse({
      ...template,
      sample_data: JSON.parse(sample) as unknown,
    });
  }
  async function action(fn: (t: Template) => Promise<void>) {
    try {
      setError("");
      await fn(current());
    } catch (e) {
      setError((e as Error).message);
    }
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
            <VariablesEditor
              variables={template.variables}
              onChange={(variables) => setTemplate({ ...template, variables })}
            />
          )}
        </section>
        <DocumentPreview html={preview.html} error={preview.error} />
      </div>
      {error && (
        <p role="alert" className="notice-inline">
          {error}
        </p>
      )}
      <TestSendForm
        disabled={!canSend || busy || !!preview.error}
        onSend={(recipient) =>
          void action((template) => onSend(template, recipient))
        }
      />
    </>
  );
}
