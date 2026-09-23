import { ChevronRight } from "lucide-react";
import { navigation, type View } from "./navigation";
import type { Template } from "@/lib/templates";

export default function DashboardHeader({
  view,
  selected,
  configured,
}: {
  view: View;
  selected: Template | null;
  configured: boolean;
}) {
  return (
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
  );
}
