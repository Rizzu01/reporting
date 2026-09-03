import type { Metadata } from "next";
import "./globals.css";
import "./cloud-sync.css";
import "./task-animation.css";
import "./week-navigation-fix.css";
import "./reference-ui.css";
import CloudSync from "@/components/cloud-sync";
import AutoCorrect from "@/components/autocorrect";

export const metadata: Metadata = {
  title: "Worklog — Daily Reporting",
  description: "A lightweight daily worklog and manager reporting workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AutoCorrect /><CloudSync>{children}</CloudSync></body>
    </html>
  );
}
