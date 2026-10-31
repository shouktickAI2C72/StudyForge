"use client";

import React from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />

      <main style={{ flex: 1, padding: "56px 0 96px" }}>
        <div className="container" style={{ maxWidth: "900px" }}>
          <div className="label" style={{ marginBottom: "8px" }}>
            EVALUATOR & ACADEMIC DOCUMENTATION
          </div>
          <h1 className="heading-xl" style={{ marginBottom: "20px" }}>
            Machine Learning Architecture & Benchmarks
          </h1>
          <p className="text-body" style={{ fontSize: "17px", lineHeight: "1.6", marginBottom: "40px" }}>
            StudyForge replaces static estimates with an empirical machine learning pipeline tuned
            specifically for curriculum structures, syllabus density, and adaptive calendar rebalancing.
          </p>

          {/* Section 1: Effort Predictor MLP */}
          <div className="card-brutal" style={{ background: "var(--paper-raised)", marginBottom: "36px" }}>
            <span className="badge badge-accent" style={{ marginBottom: "12px" }}>
              EFFORT PREDICTOR MLP
            </span>
            <h2 className="heading-md" style={{ marginBottom: "12px" }}>
              Input Feature Normalization & Feedforward Layers
            </h2>
            <p className="text-body" style={{ fontSize: "14.5px", marginBottom: "20px" }}>
              The model standardizes 5 input dimensions derived from syllabus structure:
            </p>
            <ul style={{ paddingLeft: "20px", marginBottom: "24px", lineHeight: "1.8", fontSize: "14px" }}>
              <li><strong>subtopic_count</strong>: Standardized (Mean: 5.14, Std: 1.28)</li>
              <li><strong>is_theory</strong>: One-hot categorical flag</li>
              <li><strong>is_numerical</strong>: One-hot categorical flag</li>
              <li><strong>is_lab_heavy</strong>: One-hot categorical flag</li>
              <li><strong>desc_word_count</strong>: Standardized syllabus word length (Mean: 58.2, Std: 16.5)</li>
            </ul>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                background: "var(--paper-sunken)",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                lineHeight: "1.7",
              }}
            >
              <div>Architecture: Linear(5, 16) → ReLU → Linear(16, 8) → ReLU → Linear(8, 1)</div>
              <div>Loss Function: Mean Squared Error (MSE) with L2 Weight Decay (1e-4)</div>
              <div style={{ color: "var(--teal)", marginTop: "6px" }}>
                ✓ Production Export: ONNX Runtime (CPU-optimized, zero multi-GB CUDA dependencies)
              </div>
            </div>
          </div>

          {/* Section 2: Activation Function Comparison Table */}
          <div className="card-brutal" style={{ background: "var(--paper-raised)", marginBottom: "36px" }}>
            <span className="badge badge-teal" style={{ marginBottom: "12px" }}>
              EMPIRICAL BENCHMARKS
            </span>
            <h2 className="heading-md" style={{ marginBottom: "16px" }}>
              Activation Function Comparison on Validation Set
            </h2>
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
                    <td style={{ fontWeight: 700, color: "var(--teal)" }}>ReLU</td>
                    <td>0.0417</td>
                    <td>0.0644</td>
                    <td style={{ fontWeight: 700 }}>0.2229 hrs (~13 min)</td>
                    <td>90</td>
                    <td><span className="badge badge-teal">Recommended</span></td>
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

          {/* Section 3: Schedule Rebalancing & Optimization */}
          <div className="card-brutal" style={{ background: "var(--paper-raised)", marginBottom: "36px" }}>
            <span className="badge badge-accent" style={{ marginBottom: "12px" }}>
              ADAPTIVE REBALANCING
            </span>
            <h2 className="heading-md" style={{ marginBottom: "12px" }}>
              Missed-Day Redistribution Algorithm
            </h2>
            <p className="text-body" style={{ fontSize: "14.5px", marginBottom: "16px" }}>
              When an academic day is missed (e.g., student illness or university event), the rebalancing
              subsystem redistributes unfinished cognitive load across remaining active study days.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "var(--paper-sunken)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                <div className="label" style={{ marginBottom: "6px" }}>Mini-Batch Gradient Descent</div>
                <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                  Mini-batch gradient descent simulates student velocity to prevent weekend compression and burnout.
                </div>
              </div>
              <div style={{ background: "var(--paper-sunken)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                <div className="label" style={{ marginBottom: "6px" }}>Convergence Verification</div>
                <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                  Conducts optimization tournaments comparing Adam vs. RMSprop and Xavier vs. He variance bounds.
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Document & OCR Extraction */}
          <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
            <span className="badge badge-teal" style={{ marginBottom: "12px" }}>
              DOCUMENT EXTRACTION
            </span>
            <h2 className="heading-md" style={{ marginBottom: "12px" }}>
              Universal Text Extraction & Honest Confidence Boundaries
            </h2>
            <p className="text-body" style={{ fontSize: "14.5px", marginBottom: "16px" }}>
              Direct programmatic streams for PDFs (pypdf/PyMuPDF) and Office documents (python-docx, openpyxl, python-pptx).
              For handwriting and scanned documents, Tesseract OCR extracts ink characters. If OCR confidence is low
              or handwriting is noisy, the system returns an honest caution banner rather than hallucinating course topics.
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                ← Return to Dashboard
              </Link>
              <Link href="/scanner" className="btn btn-ghost btn-sm">
                Open Syllabus Scanner
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
