import { ArrowRight, Braces } from "lucide-react";
import type { Template } from "@/lib/templates";

export default function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  return (
    <button className="template-card" onClick={() => onSelect()}>
      <div className="template-art">
        <div className="mini-paper">
          <div className="mini-brand">
            ◒{" "}
            {template.name.toLowerCase().includes("invoice")
              ? "acme studio"
              : "your document"}
          </div>
          <div className="mini-title">
            {template.name.toLowerCase().includes("invoice")
              ? "Invoice"
              : template.name}
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
          <h3>{template.name}</h3>
          <p>
            <Braces size={13} />
            {template.variables.length} variables <span>·</span> HTML template
          </p>
        </div>
        <ArrowRight size={18} />
      </div>
    </button>
  );
}
