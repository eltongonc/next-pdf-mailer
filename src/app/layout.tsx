import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Paperpost — Documents, delivered.",
  description:
    "Create PDF templates, define your data, and deliver documents with one API call.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
