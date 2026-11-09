import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function Footer() {
  return (
    <footer
      className="grain"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--paper-sunken)",
        padding: "64px 0 40px",
        marginTop: "80px",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "48px",
            marginBottom: "48px",
          }}
        >
          {/* Column 1: Platform Overview */}
          <Reveal dir="up">
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.8rem",
                fontWeight: 700,
                marginBottom: "12px",
                color: "var(--ink)",
              }}
            >
              StudyForge
            </div>
            <p className="text-body" style={{ fontSize: "14px", marginBottom: "16px" }}>
              Intelligent syllabus-to-study-plan platform. Turn dense course outlines into calibrated
              study times, curated video lectures, and adaptive weekly schedules.
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-muted)" }}>
              Syllabus Intake • Smart Scheduling • YouTube Lectures
            </div>
          </Reveal>

          {/* Column 2: Student Pages */}
          <Reveal dir="up" delay={80}>
            <div className="label" style={{ marginBottom: "16px" }}>
              Student Flow
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <Link href="/dashboard" className="footer-link">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="footer-link">
                  Scan Syllabus
                </Link>
              </li>
              <li>
                <Link href="/predictor" className="footer-link">
                  Study Time
                </Link>
              </li>
              <li>
                <Link href="/reoptimizer" className="footer-link">
                  Weekly Plan
                </Link>
              </li>
            </ul>
          </Reveal>

          {/* Column 3: How StudyForge Works */}
          <Reveal dir="up" delay={160}>
            <div className="label" style={{ marginBottom: "16px" }}>
              How StudyForge Works
            </div>
            <p className="text-body" style={{ fontSize: "13.5px", marginBottom: "14px" }}>
              Learn how StudyForge analyzes course structures, calculates realistic study hours, and adapts your schedule.
            </p>
            <Link
              href="/how-it-works"
              className="btn btn-ghost btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>✦</span>
              <span>How It Works & Science</span>
            </Link>
          </Reveal>

          {/* Column 4: Account */}
          <Reveal dir="up" delay={240}>
            <div className="label" style={{ marginBottom: "16px" }}>
              Account & Sessions
            </div>
            <p className="text-body" style={{ fontSize: "13.5px", marginBottom: "16px" }}>
              Protected by Volty the Robot Guardian. Supports email and Google authentication.
            </p>
            <Link href="/auth" className="btn btn-primary btn-sm">
              Sign In / Switch Account
            </Link>
          </Reveal>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            fontSize: "12px",
            color: "var(--ink-muted)",
          }}
        >
          <div>StudyForge Academic Intelligence System. Handcrafted for serious students and educators.</div>
          <div style={{ fontFamily: "var(--font-mono)" }}>No telemetry trackers • Zero third-party analytics</div>
        </div>
      </div>
    </footer>
  );
}