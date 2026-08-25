import type { Metadata } from "next";
import "./globals.css";
import "./cloud-sync.css";
import "./task-animation.css";
import CloudSync from "@/components/cloud-sync";

export const metadata: Metadata = {
  title: "Worklog — Daily Reporting",
  description: "A lightweight daily worklog and manager reporting workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><CloudSync>{children}</CloudSync></body>
    </html>
  );
}
