import { Plus } from "lucide-react";
import { Button } from "@mantine/core";
import type { View } from "./navigation";

export default function PageHeading({
  view,
  account,
  busy,
  onCreate,
  onRefresh,
}: {
  view: View;
  account: string;
  busy: boolean;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  return (
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
        <Button variant="filled" className="primary" onClick={onCreate} leftSection={<Plus size={17} />}>
          Create template
        </Button>
      )}
      {view === "deliveries" && account && (
        <Button disabled={busy} onClick={() => onRefresh()}>
          Refresh history
        </Button>
      )}
    </div>
  );
}
