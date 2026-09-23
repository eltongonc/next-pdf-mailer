import { Plus, Trash2, X } from "lucide-react";
import type { Variable } from "@/lib/templates";

export default function VariablesEditor({
  variables,
  onChange,
}: {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}) {
  function updateVariable(index: number, field: Variable) {
    onChange(variables.map((variable, i) => (i === index ? field : variable)));
  }
  return (
    <div className="variables-editor">
      <p>
        Only fields defined here can be passed through the API. Images use
        embedded PNG, JPEG or WebP data URLs.
      </p>
      {variables.map((v, i) => (
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
              onClick={() => onChange(variables.filter((_, j) => j !== i))}
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
          onChange([
            ...variables,
            {
              name: `variable_${variables.length + 1}`,
              type: "text",
              required: true,
            },
          ])
        }
      >
        <Plus size={15} /> Add variable
      </button>
    </div>
  );
}
