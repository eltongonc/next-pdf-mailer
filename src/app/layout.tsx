import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.layer.css";
import UiProvider from "@/components/ui-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Paperpost — Documents, delivered.",
  description:
    "Create PDF templates, define your data, and deliver documents with one API call.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" {...mantineHtmlProps} className={`${inter.variable} ${plexMono.variable}`}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body><UiProvider>{children}</UiProvider></body>
    </html>
  );
}
