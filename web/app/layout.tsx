import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "StudyForge — Intelligent Syllabus-to-Study-Plan Platform",
  description:
    "Turn syllabus content into personalized, adaptive study plans powered by PyTorch ML. Predict effort, re-optimize schedules, and scan handwritten notes.",
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
