import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coach Dashboard · Performance OS",
  description:
    "S&C-style oversight for teams without a full-time S&C coach. Know who is ready, who is overloaded, and what to do next.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
