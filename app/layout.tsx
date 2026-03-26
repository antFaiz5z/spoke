import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "spoke",
  description: "Scenario-based English speaking practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
