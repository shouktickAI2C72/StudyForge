"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";

/** Format decimal hours as "3h 15m" */
const formatHM = (v: number) => {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  return m === 60 ? `${h + 1}h 0m` : `${h}h ${m}m`;
};

const marqueeItems = [
  "PYTORCH MLP",
  "ADAM OPTIMIZER",
  "RMSprop TOURNAMENT",
  "XAVIER / HE INIT",
  "VAL MAE ±13 MIN",
  "MINI-BATCH GD",
  "ONNX EXPORT",
  "FASTAPI INFERENCE",
  "DOCUMENT OCR",
  "DAG SHORTEST PATHS",
];

export default function HomePage() {
  const [syllabusView, setSyllabusView] = useState<"raw" | "blueprint">("blueprint");
  const [mondaySkipped, setMondaySkipped] = useState(false);

  // Live mini-predictor state on homepage
  const [miniSubtopics, setMiniSubtopics] = useState(6);
  const [miniType, setMiniType] = useState<"theory" | "numerical" | "lab_heavy">("numerical");

  // Calibrate an instant estimate based on model formula
  const baseHours =
    miniSubtopics * 0.45 +
    (miniType === "numerical" ? 0.8 : miniType === "lab_heavy" ? 0.6 : 0.3);

  const weekDays = [
    { day: "MON", base: 180, topic: "Graph Theory" },
    { day: "TUE", base: 120, topic: "Algorithms" },
    { day: "WED", base: 150, topic: "Computer Architecture" },
    { day: "THU", base: 90, topic: "Database Systems" },
    { day: "FRI", base: 120, topic: "Operating Systems" },
    { day: "SAT", base: 60, topic: "Weekly Review" },
    { day: "SUN", base: 0, topic: "Rest & Buffer" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />

      <main style={{ flex: 1 }}>
        {/* ─── Hero Section ─── */}
        <section
          className="bg-blueprint grain"
          style={{
            padding: "88px 0 64px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="container">
            <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
              {/* Engineering Tag */}
              <div
                className="animate-in"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--paper-sunken)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--ink-secondary)",
                  marginBottom: "28px",
                }}
              >
                <span className="dot-pulse" style={{ color: "var(--teal)", width: 7, height: 7, borderRadius: "50%", background: "var(--teal)" }} />
                PYTORCH MULTILAYER PERCEPTRON • ADAPTIVE RE-OPTIMIZATION
              </div>

              {/* Main Headline — line-mask rise */}
              <h1 className="heading-xl" style={{ marginBottom: "24px" }}>
                <span className="line-mask">
                  <span style={{ "--line-delay": "0.05s" } as React.CSSProperties}>
                    Turn raw syllabi into
                  </span>
                </span>
                <span className="line-mask">
                  <span style={{ "--line-delay": "0.18s" } as React.CSSProperties}>
                    calibrated study blueprints.
                  </span>
                </span>
              </h1>

              {/* Editorial Copy */}
              <p
                className="text-body animate-in stagger-3"
                style={{
                  fontSize: "19px",
                  lineHeight: "1.6",
                  marginBottom: "36px",
                  color: "var(--ink-secondary)",
                }}
              >
                University course outlines are dense bullet points with zero temporal calibration.
                StudyForge uses trained neural networks to quantify study effort, dynamically rebalance missed
                deadlines, and extract structured modules from syllabus documents.
              </p>

              {/* Call to Actions */}
              <div
                className="animate-in stagger-4"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  marginBottom: "56px",
                }}
              >
                <Link href="/predictor" className="btn btn-accent btn-lg">
                  Launch Effort Predictor →
                </Link>
                <Link
                  href="/auth"
                  className="btn btn-ghost btn-lg"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>🤖</span>
                  <span>Sign In with Volty</span>
                </Link>
              </div>
            </div>

            {/* ─── Interactive Hero Showcase Widget ─── */}
            <Reveal dir="scale" delay={150}>
              <div
                className="card-brutal"
                style={{
                  maxWidth: "960px",
                  margin: "0 auto",
                  padding: "0",
                  overflow: "hidden",
                  background: "var(--paper-raised)",
                }}
              >
                {/* Showcase Bar Header */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    background: "var(--paper-sunken)",
                    borderBottom: "2px solid var(--ink)",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      CS 301: Algorithms & Data Structures
                    </span>
                  </div>

                  {/* View Mode Toggle */}
                  <div
                    style={{
                      display: "flex",
                      background: "var(--paper-raised)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      padding: "2px",
                    }}
                  >
                    {(["raw", "blueprint"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSyllabusView(mode)}
                        className="press"
                        style={{
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "var(--radius-sm)",
                          background: syllabusView === mode ? "var(--ink)" : "transparent",
                          color: syllabusView === mode ? "var(--paper)" : "var(--ink)",
                          cursor: "pointer",
                        }}
                      >
                        {mode === "raw" ? "Raw Syllabus" : "Calibrated Blueprint"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Showcase Content */}
                <div style={{ padding: "32px 28px" }} key={syllabusView}>
                  {syllabusView === "raw" ? (
                    <div
                      className="animate-in"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        lineHeight: "1.8",
                        color: "var(--ink-secondary)",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
                        WEEK 04 SYLLABUS LISTING:
                      </div>
                      <div>• Graph Traversal: Depth-First Search (DFS) & Breadth-First Search (BFS)</div>
                      <div>• Topological Sorting in Directed Acyclic Graphs (DAGs)</div>
                      <div>• Single-Source Shortest Paths: Dijkstra&rsquo;s Algorithm with Min-Priority Heaps</div>
                      <div>• Negative Edge Weights & Cycle Detection: Bellman-Ford Dynamic Programming</div>
                      <div>• All-Pairs Shortest Paths: Floyd-Warshall Formulation</div>
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "8px 12px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          color: "var(--ink-muted)",
                        }}
                      >
                        Status: Unquantified. Student has no data on whether this requires 2 hours or 8 hours of focused effort.
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "16px",
                        }}
                      >
                        <div className="label">PYTORCH CALIBRATED TIMELINE</div>
                        <span className="badge badge-teal">VALIDATION ERROR: &plusmn;13 MIN</span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "16px",
                        }}
                      >
                        {[
                          { slot: "MODULE 1 (MON)", name: "BFS & DFS Traversals", time: "1h 35m", color: "var(--teal)", meta: "Foundational • 4 subtopics" },
                          { slot: "MODULE 2 (WED)", name: "Dijkstra & Heaps", time: "3h 15m", color: "var(--accent)", meta: "Deep Dive • 7 subtopics" },
                          { slot: "MODULE 3 (FRI)", name: "Bellman-Ford & DP", time: "2h 20m", color: "var(--teal)", meta: "Intensive • 5 subtopics" },
                        ].map((m, i) => (
                          <div
                            key={m.slot}
                            className={`animate-in stagger-${i + 1}`}
                            style={{
                              padding: "16px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--paper-sunken)",
                              border: "1px solid var(--border)",
                              transition: "transform 0.3s var(--ease-expo), box-shadow 0.3s",
                            }}
                          >
                            <div className="label" style={{ fontSize: "10px", marginBottom: "4px" }}>
                              {m.slot}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>
                              {m.name}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "18px",
                                fontWeight: 800,
                                color: m.color,
                              }}
                            >
                              {m.time}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                              {m.meta}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Marquee strip ─── */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "40px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "1px",
                  color: "var(--ink-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {item}
                <span style={{ color: "var(--accent)", fontSize: "8px" }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* ─── Live Mini-Calculator Section ─── */}
        <section style={{ padding: "96px 0", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: "48px",
                alignItems: "center",
              }}
            >
              <Reveal dir="left">
                <div className="label" style={{ marginBottom: "8px" }}>
                  INTERACTIVE DEMO
                </div>
                <h2 className="heading-lg" style={{ marginBottom: "16px" }}>
                  Test the PyTorch inference directly in your browser.
                </h2>
                <p className="text-body" style={{ fontSize: "16px", marginBottom: "24px" }}>
                  Adjust the parameters below to see how our standardized feature representations scale the
                  expected cognitive workload. For the full experience with database logging, open Module 1.
                </p>
                <Link href="/predictor" className="btn btn-primary">
                  Open Full Predictor Interface →
                </Link>
              </Reveal>

              {/* Interactive Widget */}
              <Reveal dir="right" delay={100}>
                <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                    >
                      <label className="label">Subtopic Density</label>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        <AnimatedNumber value={miniSubtopics} /> subtopics
                      </span>
                    </div>
                    <input
                      type="range"
                      className="slider"
                      min="1"
                      max="15"
                      value={miniSubtopics}
                      onChange={(e) => setMiniSubtopics(parseInt(e.target.value))}
                      style={{ "--fill": `${((miniSubtopics - 1) / 14) * 100}%` } as React.CSSProperties}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label className="label" style={{ display: "block", marginBottom: "8px" }}>
                      Topic Category
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {[
                        { id: "theory", label: "Theory" },
                        { id: "numerical", label: "Numerical" },
                        { id: "lab_heavy", label: "Lab Heavy" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setMiniType(t.id as "theory" | "numerical" | "lab_heavy")}
                          className="press"
                          style={{
                            padding: "10px",
                            borderRadius: "var(--radius-sm)",
                            border: `2px solid ${miniType === t.id ? "var(--ink)" : "var(--border)"}`,
                            background: miniType === t.id ? "var(--paper-sunken)" : "var(--paper-raised)",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--paper-sunken)",
                      borderRadius: "var(--radius-md)",
                      padding: "20px",
                      textAlign: "center",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="label" style={{ marginBottom: "4px" }}>
                      PREDICTED STUDY DURATION
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "2.8rem",
                        fontWeight: 800,
                        color: "var(--ink)",
                        lineHeight: 1.1,
                      }}
                    >
                      <AnimatedNumber value={baseHours} format={formatHM} />
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "4px" }}>
                      Calibrated against academic benchmark dataset
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─── Stat strip ─── */}
        <section style={{ padding: "0 0 96px" }}>
          <div className="container">
            <Reveal dir="up">
              <div className="stat-strip">
                {[
                  { value: "±13 min", label: "Validation MAE" },
                  { value: "5", label: "Input Features" },
                  { value: "3", label: "MLP Layers" },
                  { value: "2", label: "Optimizer Tournaments" },
                  { value: "0", label: "Third-party Trackers" },
                ].map((s) => (
                  <div className="stat-cell" key={s.label}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.6rem",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        marginBottom: "2px",
                      }}
                    >
                      {s.value}
                    </div>
                    <div className="label" style={{ fontSize: "10px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── 3 Machine Learning Modules Section ─── */}
        <section
          style={{
            padding: "96px 0",
            background: "var(--paper-sunken)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="container">
            <Reveal dir="up">
              <div style={{ maxWidth: "700px", marginBottom: "56px" }}>
                <div className="label" style={{ marginBottom: "8px" }}>
                  CORE ARCHITECTURE
                </div>
                <h2 className="heading-lg" style={{ marginBottom: "16px" }}>
                  Engineered for genuine academic utility.
                </h2>
                <p className="text-body" style={{ fontSize: "16.5px" }}>
                  No vague buzzwords or marketing fluff. StudyForge is built on rigorous ML architectures
                  specifically tuned to syllabus modeling, loss optimization, and visual text extraction.
                </p>
              </div>
            </Reveal>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "32px",
              }}
            >
              {[
                {
                  tag: "MODULE 01",
                  color: "var(--accent)",
                  icon: "⚡",
                  title: "PyTorch Effort Predictor",
                  body: "Standardizes 5 input features (subtopic count, categorical one-hot flags for theory, numerical, and lab, plus syllabus word length) into a 3-layer MLP yielding a Mean Absolute Error of ~13 minutes.",
                  spec: "Linear(5, 16) → ReLU → Linear(16, 8) → Linear(8, 1)",
                  href: "/predictor",
                  cta: "Explore Effort Predictor →",
                },
                {
                  tag: "MODULE 02",
                  color: "var(--teal)",
                  icon: "🔄",
                  title: "Adaptive Schedule Re-Optimizer",
                  body: "When students miss an academic day, the rebalancing algorithm incorporates simulated feedback via mini-batch gradient descent. It conducts Adam vs RMSprop convergence tournaments and re-allocates missed hours across the remaining week.",
                  spec: "Adam vs RMSprop • Xavier vs He Variance Check",
                  href: "/reoptimizer",
                  cta: "Explore Schedule Re-Optimizer →",
                },
                {
                  tag: "MODULE 03",
                  color: "var(--amber)",
                  icon: "📷",
                  title: "Notes & Syllabus Scanner",
                  body: "Accepts PDFs, plaintext syllabi, and photograph scans of handwritten notes. The document extractor segments candidate topics and pipes them directly through Module 1 for unified curriculum scheduling.",
                  spec: "PDF Text Stream • OCR Fallback • Candidate Segmentation",
                  href: "/scanner",
                  cta: "Explore Document Scanner →",
                },
              ].map((m, i) => (
                <Reveal key={m.tag} dir="up" delay={i * 120}>
                  <Link href={m.href} className="card card-interactive" style={{ display: "block", height: "100%", background: "var(--paper-raised)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <span className="icon-tile" style={{ background: "var(--paper-sunken)" }}>{m.icon}</span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: m.color,
                        }}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <h3 className="heading-md" style={{ marginBottom: "12px" }}>
                      {m.title}
                    </h3>
                    <p className="text-body" style={{ fontSize: "14px", marginBottom: "20px" }}>
                      {m.body}
                    </p>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        background: "var(--paper-sunken)",
                        padding: "10px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        marginBottom: "20px",
                      }}
                    >
                      {m.spec}
                    </div>
                    <span className="link-arrow" style={{ fontSize: "13.5px", color: m.color }}>
                      {m.cta.replace(" →", "")}
                      <span className="arrow">→</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Monday Skipped Interactive Simulator ─── */}
        <section style={{ padding: "96px 0", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <Reveal dir="up">
              <div style={{ maxWidth: "760px", marginBottom: "40px" }}>
                <div className="label" style={{ marginBottom: "8px" }}>
                  DYNAMIC REBALANCING DEMO
                </div>
                <h2 className="heading-lg" style={{ marginBottom: "16px" }}>
                  What happens when you miss Monday?
                </h2>
                <p className="text-body" style={{ fontSize: "16.5px" }}>
                  Click the toggle below to witness how StudyForge absorbs a missed Monday of study without
                  causing weekend burnout.
                </p>
              </div>
            </Reveal>

            <Reveal dir="up" delay={100}>
              <div style={{ marginBottom: "24px" }}>
                <button
                  type="button"
                  onClick={() => setMondaySkipped(!mondaySkipped)}
                  className={`btn press ${mondaySkipped ? "btn-accent" : "btn-primary"}`}
                >
                  {mondaySkipped
                    ? "✓ Monday Skipped (Rebalanced)"
                    : "Simulate: Monday Missed (Sick / Event)"}
                </button>
              </div>

              {/* 7-Day Schedule Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                }}
              >
                {weekDays.map((item) => {
                  const isMon = item.day === "MON";
                  const addedMinutes = mondaySkipped && !isMon ? 36 : 0;
                  const finalMinutes = mondaySkipped && isMon ? 0 : item.base + addedMinutes;
                  const grew = mondaySkipped && !isMon && addedMinutes > 0;

                  return (
                    <div
                      key={item.day}
                      style={{
                        padding: "16px",
                        borderRadius: "var(--radius-md)",
                        border:
                          mondaySkipped && isMon
                            ? "2px dashed var(--accent)"
                            : "2px solid var(--border)",
                        background:
                          mondaySkipped && isMon
                            ? "var(--accent-subtle)"
                            : "var(--paper-raised)",
                        textAlign: "center",
                        transition: "all 0.45s var(--ease-expo)",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          fontSize: "14px",
                          marginBottom: "10px",
                          color: mondaySkipped && isMon ? "var(--accent)" : "var(--ink)",
                        }}
                      >
                        {item.day}
                      </div>

                      {/* Load bar */}
                      <div
                        style={{
                          height: "72px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          className="bar-fill"
                          style={{
                            width: "26px",
                            height: `${Math.max(4, finalMinutes * 0.32)}px`,
                            background: mondaySkipped && isMon
                              ? "var(--ink-faint)"
                              : grew
                              ? "var(--teal)"
                              : "var(--ink)",
                            opacity: mondaySkipped && isMon ? 0.5 : 1,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "20px",
                          fontWeight: 800,
                          color: grew ? "var(--teal)" : "var(--ink)",
                          marginBottom: "4px",
                        }}
                      >
                        <AnimatedNumber value={finalMinutes} format={(v) => `${Math.round(v)}m`} />
                      </div>

                      <div style={{ fontSize: "11px", color: "var(--ink-secondary)" }}>
                        {mondaySkipped && isMon ? "Skipped" : item.topic}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section
          className="bg-blueprint"
          style={{
            padding: "110px 0",
            textAlign: "center",
          }}
        >
          <div className="container">
            <Reveal dir="up">
              <h2 className="heading-lg" style={{ marginBottom: "20px" }}>
                Experience StudyForge today.
              </h2>
            </Reveal>
            <Reveal dir="up" delay={100}>
              <p
                className="text-body"
                style={{
                  fontSize: "18px",
                  maxWidth: "600px",
                  margin: "0 auto 36px",
                  color: "var(--ink-secondary)",
                }}
              >
                Sign in with Volty the robot guardian, calibrate your first syllabus topic, and turn academic stress
                into a clear, mathematically sound schedule.
              </p>
            </Reveal>
            <Reveal dir="up" delay={200}>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
                <Link href="/auth" className="btn btn-accent btn-lg">
                  Enter The Forge with Volty →
                </Link>
                <Link href="/dashboard" className="btn btn-ghost btn-lg">
                  Open Command Dashboard
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}