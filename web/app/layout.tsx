import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "StudyForge — Intelligent Syllabus-to-Study-Plan Platform",
  description:
    "Upload your syllabus, get accurate study time estimates per topic, find the best video lectures, and build a weekly plan that adapts when life happens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
