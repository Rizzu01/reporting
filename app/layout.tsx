import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Worklog — Daily Reporting",
  description: "A lightweight daily worklog and manager reporting workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
