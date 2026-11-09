"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export default function HowItWorksPage() {
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />

      <main style={{ flex: 1, padding: "56px 0 96px" }}>
        <div className="container" style={{ maxWidth: "900px" }}>
          {/* Header */}
          <div className="animate-in" style={{ marginBottom: "40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--teal)",
                background: "var(--teal-subtle)",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              <span
                className="dot-pulse"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--teal)",
                  display: "inline-block",
                }}
              />
              HOW STUDYFORGE WORKS
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              The Science Behind Your Study Plan
            </h1>
            <p className="text-body" style={{ fontSize: "17px", lineHeight: "1.6" }}>
              Most calendar tools give you generic reminders. StudyForge analyzes the actual content
              and complexity of your syllabus, estimates realistic study hours, matches curated video
              lectures, and dynamically adapts whenever life throws your schedule off track.
            </p>
          </div>

          {/* 4 Pillars Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "28px", marginBottom: "44px" }}>
            {/* Pillar 1: Document & Syllabus Intake */}
            <Reveal dir="up">
              <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span className="badge badge-accent">STEP 1 • DOCUMENT INTAKE</span>
                </div>
                <h2 className="heading-md" style={{ marginBottom: "12px" }}>
                  From Raw Course Documents to Structured Units
                </h2>
                <p className="text-body" style={{ fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" }}>
                  Upload your syllabus as a PDF, Word document, text outline, or photo. StudyForge uses
                  intelligent document parsing and character recognition (OCR) to extract course modules,
                  unit titles, and specific subtopics.
                </p>
                <div
                  style={{
                    background: "var(--paper-sunken)",
                    padding: "16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                    color: "var(--ink-secondary)",
                  }}
                >
                  <strong style={{ color: "var(--ink)" }}>Honest Confidence Guarantee:</strong> If an
                  uploaded document is blurry, incomplete, or low-contrast, StudyForge gives you a clear
                  caution notice rather than inventing false course topics.
                </div>
              </div>
            </Reveal>

            {/* Pillar 2: Calibrated Study Time Estimation */}
            <Reveal dir="up" delay={60}>
              <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span className="badge badge-teal">STEP 2 • STUDY TIME ESTIMATES</span>
                </div>
                <h2 className="heading-md" style={{ marginBottom: "12px" }}>
                  Accurate Study Hours Instead of Arbitrary Timers
                </h2>
                <p className="text-body" style={{ fontSize: "15px", lineHeight: "1.6", marginBottom: "18px" }}>
                  A chapter with 10 math formulas requires vastly different effort than a 3-page history
                  reading. StudyForge evaluates each topic across key structural dimensions:
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ background: "var(--paper-sunken)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--ink)", marginBottom: "4px" }}>
                      📖 Topic Nature
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
                      Theory (conceptual reading), Numerical (calculation & problem solving), or Lab Heavy (hands-on).
                    </div>
                  </div>
                  <div style={{ background: "var(--paper-sunken)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--ink)", marginBottom: "4px" }}>
                      🔢 Subtopic Density
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
                      How many individual concepts, theorems, or skills are packed into the unit.
                    </div>
                  </div>
                  <div style={{ background: "var(--paper-sunken)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--ink)", marginBottom: "4px" }}>
                      ⏱ Empirical Benchmarks
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
                      Trained on thousands of academic topic workloads to predict realistic hours within ~13 minutes accuracy.
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Pillar 3: Curated Video Lectures */}
            <Reveal dir="up" delay={120}>
              <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span className="badge badge-accent">STEP 3 • VIDEO LECTURES</span>
                </div>
                <h2 className="heading-md" style={{ marginBottom: "12px" }}>
                  Curated Video Lectures for Every Topic
                </h2>
                <p className="text-body" style={{ fontSize: "15px", lineHeight: "1.6", marginBottom: "14px" }}>
                  Students waste countless hours searching YouTube for topic explanations and getting distracted
                  by unrelated videos. StudyForge automatically searches and filters relevant, embeddable lectures
                  directly matched to your syllabus topics.
                </p>
                <div style={{ fontSize: "13.5px", color: "var(--ink-secondary)" }}>
                  • Play lectures directly inside StudyForge in a focused, distraction-free environment.<br />
                  • Topic-specific fallback links if you ever want to explore broader channels.
                </div>
              </div>
            </Reveal>

            {/* Pillar 4: Adaptive Rebalancing */}
            <Reveal dir="up" delay={180}>
              <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span className="badge badge-teal">STEP 4 • ADAPTIVE SCHEDULING</span>
                </div>
                <h2 className="heading-md" style={{ marginBottom: "12px" }}>
                  Burnout-Free Weekly Rebalancing
                </h2>
                <p className="text-body" style={{ fontSize: "15px", lineHeight: "1.6", marginBottom: "16px" }}>
                  Rigid calendars break the moment an unexpected event occurs — illness, family commitments, or
                  competing assignment deadlines. When you miss a day, StudyForge doesn't cram everything into the
                  next morning or ruin your weekend.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div style={{ background: "var(--paper-sunken)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--teal)", marginBottom: "4px" }}>
                      ✓ Smooth Workload Redistribution
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
                      Distributes missed hours into modest +20 to +40 minute increments across remaining days so sessions stay manageable.
                    </div>
                  </div>
                  <div style={{ background: "var(--paper-sunken)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--accent)", marginBottom: "4px" }}>
                      ✓ Zero Syllabus Material Skipped
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
                      Every topic is accounted for so you arrive at exams completely prepared without frantic all-nighters.
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Technical Specifications Accordion / Toggle */}
          <div className="card" style={{ marginBottom: "48px", background: "var(--paper-raised)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div className="label" style={{ marginBottom: "4px" }}>TECHNICAL ARCHITECTURE</div>
                <h3 className="heading-sm" style={{ marginBottom: 0 }}>
                  For Educators, Evaluators & Engineers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTechnicalSpecs(!showTechnicalSpecs)}
                className="btn btn-ghost btn-sm press"
              >
                {showTechnicalSpecs ? "Hide Technical Details ▲" : "View Model Architecture & Benchmarks ▼"}
              </button>
            </div>

            {showTechnicalSpecs && (
              <div className="animate-in" style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
                <p className="text-body" style={{ fontSize: "14px", marginBottom: "16px" }}>
                  StudyForge uses a multi-layer perceptron (MLP) trained to minimize Mean Squared Error (MSE)
                  on curriculum effort datasets, with CPU-optimized ONNX runtime execution for sub-5ms inference.
                </p>

                {/* Architecture code box */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12.5px",
                    background: "var(--paper-sunken)",
                    padding: "16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    lineHeight: "1.7",
                    marginBottom: "20px",
                  }}
                >
                  <div><strong>Layers:</strong> Linear(5, 16) → ReLU → Linear(16, 8) → ReLU → Linear(8, 1)</div>
                  <div><strong>Inputs:</strong> subtopic_count, is_theory, is_numerical, is_lab_heavy, desc_word_count</div>
                  <div><strong>Runtime:</strong> ONNX Runtime CPU (ultra-lightweight, zero GPU dependency)</div>
                  <div style={{ color: "var(--teal)", marginTop: "4px" }}>
                    <strong>Validation Accuracy:</strong> Mean Absolute Error (MAE) = 0.2229 hrs (~13 minutes)
                  </div>
                </div>

                {/* Benchmark table */}
                <div style={{ overflowX: "auto" }}>
                  <table className="table-refined">
                    <thead>
                      <tr>
                        <th>Activation</th>
                        <th>Train MSE</th>
                        <th>Val MSE</th>
                        <th>Validation MAE</th>
                        <th>Best Epoch</th>
                        <th>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: "rgba(13, 148, 136, 0.05)" }}>
                        <td style={{ fontWeight: 700, color: "var(--teal)" }}>ReLU (Selected)</td>
                        <td>0.0417</td>
                        <td>0.0644</td>
                        <td style={{ fontWeight: 700 }}>0.2229 hrs (~13 min)</td>
                        <td>90</td>
                        <td><span className="badge badge-teal">Optimal</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>LeakyReLU</td>
                        <td>0.0245</td>
                        <td>0.0650</td>
                        <td>0.2339 hrs (~14 min)</td>
                        <td>69</td>
                        <td>Comparable</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Tanh</td>
                        <td>0.0277</td>
                        <td>0.1569</td>
                        <td>0.3239 hrs (~19 min)</td>
                        <td>300</td>
                        <td>Overfit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/scanner" className="btn btn-accent btn-lg">
              Scan Your Syllabus →
            </Link>
            <Link href="/predictor" className="btn btn-primary btn-lg">
              Try Study Time Estimator
            </Link>
            <Link href="/dashboard" className="btn btn-ghost btn-lg">
              Open Dashboard
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
