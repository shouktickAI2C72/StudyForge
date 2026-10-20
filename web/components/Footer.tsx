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
              Intelligent syllabus-to-study-plan platform. Powered by a 3-layer PyTorch MLP,
              mini-batch gradient descent schedule rebalancing, and transfer-learning document extraction.
            </p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-muted)" }}>
              TorchScript • ONNX • FastAPI • SQLite
            </div>
          </Reveal>

          {/* Column 2: Core ML Modules */}
          <Reveal dir="up" delay={80}>
            <div className="label" style={{ marginBottom: "16px" }}>
              Machine Learning Modules
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <Link href="/predictor" className="footer-link">
                  Module 1: Topic Effort Predictor
                </Link>
              </li>
              <li>
                <Link href="/reoptimizer" className="footer-link">
                  Module 2: Schedule Re-Optimizer
                </Link>
              </li>
              <li>
                <Link href="/scanner" className="footer-link">
                  Module 3: Syllabus & Notes Scanner
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="footer-link">
                  Next Best Action Dashboard
                </Link>
              </li>
            </ul>
          </Reveal>

          {/* Column 3: Technical Specifications */}
          <Reveal dir="up" delay={160}>
            <div className="label" style={{ marginBottom: "16px" }}>
              Model Architecture
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12.5px",
                lineHeight: "1.7",
                color: "var(--ink-secondary)",
                background: "var(--paper-raised)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              <div>Input Vector: [x₁..x₅] (Dim 5)</div>
              <div>Hidden L1: Linear(5, 16) + ReLU</div>
              <div>Hidden L2: Linear(16, 8) + ReLU</div>
              <div>Output: Linear(8, 1) -&gt; Hours</div>
              <div style={{ marginTop: "8px", color: "var(--teal)" }}>
                ✓ Val MAE: 0.2229 hrs (~13 min)
              </div>
            </div>
          </Reveal>

          {/* Column 4: System Access */}
          <Reveal dir="up" delay={240}>
            <div className="label" style={{ marginBottom: "16px" }}>
              Authentication & Security
            </div>
            <p className="text-body" style={{ fontSize: "13.5px", marginBottom: "16px" }}>
              Protected by Volty the Robot Guardian. Supports email + PBKDF2 hashed credentials and
              direct Google Identity Services token verification.
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