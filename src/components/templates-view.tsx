import {
  ArrowRight,
  Code2,
  KeyRound,
  LayoutTemplate,
  Plus,
  Send,
} from "lucide-react";
import type { Template } from "@/lib/templates";
import TemplateCard from "./template-card";
import Stat from "./stat";

export default function TemplatesView({
  templates,
  deliveryCount,
  keyCount,
  onSelect,
  onCreate,
  onDocs,
}: {
  templates: Template[];
  deliveryCount: number;
  keyCount: number;
  onSelect: (template: Template) => void;
  onCreate: () => void;
  onDocs: () => void;
}) {
  return (
    <>
      <div className="stats">
        <Stat
          label="Templates"
          value={String(templates.length).padStart(2, "0")}
          sub="Ready for your next idea"
          icon={<LayoutTemplate size={19} />}
        />
        <Stat
          label="Documents submitted"
          value={String(deliveryCount).padStart(2, "0")}
          sub={
            deliveryCount
              ? "In your recent history"
              : "Your first send is one call away"
          }
          icon={<Send size={19} />}
        />
        <Stat
          label="Active API keys"
          value={String(keyCount).padStart(2, "0")}
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
          <TemplateCard key={t.id} template={t} onSelect={() => onSelect(t)} />
        ))}
        <button className="create-card" onClick={onCreate}>
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
          <span className="eyebrow">SMALL REQUEST. BIG POSSIBILITIES.</span>
          <h2>Your next PDF is an API call away.</h2>
          <p>
            Pass in your variables. We’ll take care of the PDF and the email.
          </p>
        </div>
        <button onClick={() => onDocs()}>
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
  );
}
