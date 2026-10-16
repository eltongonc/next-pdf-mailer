import VariablesEditor from "./variables-editor";
import DocumentPreview from "./document-preview";
import TestSendForm from "./test-send-form";
import { useMemo, useState } from "react";
import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Alert, Button, Tabs, TextInput, Textarea } from "@mantine/core";
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
      <Button
        variant="subtle"
        className="back"
        onClick={onBack}
        leftSection={<ArrowLeft size={14} />}
      >
        All templates
      </Button>
      <div className="editor-heading">
        <div>
          <TextInput
            variant="unstyled"
            className="title-field"
            classNames={{ input: "title-input" }}
            aria-label="Template name"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          />
          <div className="template-id">
            Template ID <code>{template.id}</code>
          </div>
        </div>
        <div className="button-group">
          <Button
            leftSection={<ArrowDownToLine size={16} />}
            disabled={busy || !!preview.error}
            onClick={() => void action(onPdf)}
          >
            Download PDF
          </Button>
          <Button
            variant="filled"
            leftSection={
              busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Check size={16} />
              )
            }
            className="primary"
            disabled={busy || !!preview.error}
            onClick={() => void action(onSave)}
          >
            Save template
          </Button>
        </div>
      </div>
      <div className="editor-grid">
        <Tabs
          component="section"
          className="editor-panel"
          value={tab}
          onChange={(value) => {
            if (value === "html" || value === "variables" || value === "data")
              setTab(value);
          }}
        >
          <Tabs.List className="editor-tabs" aria-label="Template editor">
            {(["html", "variables", "data"] as const).map((t) => (
              <Tabs.Tab
                value={t}
                leftSection={
                  t === "html" ? <Code2 size={15} /> : <Braces size={15} />
                }
                key={t}
                className={tab === t ? "selected" : ""}
              >
                {t === "html"
                  ? "HTML & CSS"
                  : t === "variables"
                    ? `Variables (${template.variables.length})`
                    : "Sample data"}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value={tab} key={tab}>
            {tab === "html" ? (
              <>
                <div className="editor-help">
                  Use <code>{"{{variable}}"}</code> and{" "}
                  <code>{"{{#each items}}…{{/each}}"}</code>. Styles go in a
                  &lt;style&gt; tag.
                </div>
                <CodeMirror
                  className="code-editor"
                  height="570px"
                  extensions={[
                    html(),
                    EditorView.contentAttributes.of({
                      "aria-label": "Template HTML and CSS",
                      "aria-multiline": "true",
                      spellcheck: "false",
                    }),
                  ]}
                  value={template.html}
                  onChange={(html) => setTemplate({ ...template, html })}
                />
              </>
            ) : tab === "data" ? (
              <>
                <div className="editor-help">
                  Use sample JSON to see how your real document will look.
                </div>
                <Textarea
                  className="code-editor-field"
                  classNames={{ input: "code-editor" }}
                  spellCheck={false}
                  aria-label="Sample JSON data"
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                />
              </>
            ) : (
              <VariablesEditor
                variables={template.variables}
                onChange={(variables) =>
                  setTemplate({ ...template, variables })
                }
              />
            )}
          </Tabs.Panel>
        </Tabs>
        <DocumentPreview html={preview.html} error={preview.error} />
      </div>
      {error && (
        <Alert role="alert" color="red" className="notice-inline error-notice">
          {error}
        </Alert>
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
