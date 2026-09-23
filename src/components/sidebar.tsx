import { Braces, Settings2, LogOut, ArrowRight } from "lucide-react";
import Brand from "./brand";
import { navigation, type View } from "./navigation";

export default function Sidebar({
  account,
  configured,
  view,
  templateCount,
  onNavigate,
  onSignOut,
}: {
  account: string;
  configured: boolean;
  view: View;
  templateCount: number;
  onNavigate: (view: View) => void;
  onSignOut: () => void;
}) {
  return (
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
              onNavigate(id);
            }}
          >
            <Icon size={18} />
            {label}
            {id === "templates" && (
              <span className="nav-count">{templateCount}</span>
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
              onNavigate("docs");
            }}
          >
            Explore the API{" "}
            <ArrowRight size={14} style={{ transform: "rotate(-35deg)" }} />
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
              onClick={() => onSignOut()}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
