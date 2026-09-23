import { LayoutTemplate, Send, KeyRound, Code2 } from "lucide-react";
export type View = "templates" | "deliveries" | "keys" | "docs";
export const navigation = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "deliveries", label: "Delivery history", icon: Send },
  { id: "keys", label: "API keys", icon: KeyRound },
  { id: "docs", label: "API reference", icon: Code2 },
] as const;
