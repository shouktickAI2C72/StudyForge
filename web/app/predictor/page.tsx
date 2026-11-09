"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { predictEffort, getPredictions, type PredictResponse } from "@/lib/api";
import { RelatedLectures } from "@/components/RelatedLectures";

interface Preset {
  topic_name: string;
  subtopic_count: number;
  topic_type: "theory" | "numerical" | "lab_heavy";
  desc: string;
}

const PRESETS: Preset[] = [
  {
    topic_name: "Dynamic Programming & DAG Shortest Paths",
    subtopic_count: 7,
    topic_type: "numerical",
    desc: "Optimal substructure, overlapping subproblems, memoization tables, bottom-up tabulations, and Bellman-Ford algorithms.",
  },
  {
    topic_name: "Maxwell's Equations & Boundary Values",
    subtopic_count: 8,
    topic_type: "numerical",
    desc: "Differential and integral forms of Gauss's Law, Ampere's Law with Maxwell correction, Poynting vectors, and plane wave propagation.",
  },
  {
    topic_name: "Cellular Respiration & Krebs Cycle",
    subtopic_count: 5,
    topic_type: "theory",
    desc: "Glycolysis, pyruvate oxidation, citric acid cycle, electron transport chain, oxidative phosphorylation, and ATP synthase kinetics.",
  },
  {
    topic_name: "Microbial Culture Staining & Gram Identification",
    subtopic_count: 4,
    topic_type: "lab_heavy",
    desc: "Aseptic inoculation, crystal violet and safranin counter-staining, immersion microscopy calibration, and peptidoglycan layer diagnostic assays.",
  },
];

export default function PredictorPage() {
  const [topicName, setTopicName] = useState("Dynamic Programming & DAG Shortest Paths");
  const [subtopics, setSubtopics] = useState(7);
  const [topicType, setTopicType] = useState<"theory" | "numerical" | "lab_heavy">("numerical");
  const [description, setDescription] = useState(
    "Optimal substructure, overlapping subproblems, memoization tables, bottom-up tabulations, and Bellman-Ford algorithms."
  );

  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<PredictResponse | null>(null);
  const [history, setHistory] = useState<PredictResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  // Load recent history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getPredictions(12);
      setHistory(res.predictions);
    } catch {
      // Backend might be offline; grace period
    }
  };

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicName.trim()) {
      setErrorMessage("Please enter a topic title.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await predictEffort({
        topic_name: topicName.trim(),
        subtopic_count: subtopics,
        topic_type: topicType,
        desc_word_count: wordCount,
      });
      setCurrentResult(res);
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to estimate study time. Please try again.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: Preset) => {
    setTopicName(preset.topic_name);
    setSubtopics(preset.subtopic_count);
    setTopicType(preset.topic_type);
    setDescription(preset.desc);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />

      <main style={{ flex: 1, padding: "48px 0 80px" }}>
        <div className="container">
          {/* Header */}
          <div className="animate-in" style={{ marginBottom: "40px", maxWidth: "800px" }}>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              <span className="line-mask">
                <span>Estimate Your Study</span>
              </span>
              <span className="line-mask">
                <span style={{ "--line-delay": "0.12s" } as React.CSSProperties}>Time Per Topic.</span>
              </span>
            </h1>
            <p className="text-body animate-in stagger-3" style={{ fontSize: "17px" }}>
              Enter a topic from your syllabus and StudyForge will estimate how many hours you'll need
              to study it, based on how many subtopics it covers and what kind of material it is.
            </p>
          </div>

          {/* Quick Presets */}
          <Reveal dir="up">
            <div style={{ marginBottom: "32px" }}>
              <div className="label" style={{ marginBottom: "12px" }}>
                Quick Examples
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`btn btn-sm press ${topicName === preset.topic_name ? "btn-primary" : "btn-ghost"}`}
                    style={{ fontSize: "13px", background: topicName === preset.topic_name ? "var(--ink)" : "var(--paper-raised)" }}
                  >
                    {preset.topic_name.split("&")[0].trim()} • {preset.topic_type === "numerical" ? "Math/CS" : preset.topic_type === "theory" ? "Theory" : "Lab"}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Main Grid: Form + Live Prediction */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "32px",
              marginBottom: "64px",
              alignItems: "start",
            }}
          >
            {/* Input Form Card */}
            <Reveal dir="left">
              <div className="card-brutal">
                <h2 className="heading-sm" style={{ marginBottom: "24px" }}>
                  Topic Details
                </h2>

                {errorMessage && (
                  <div
                    className="animate-pop"
                    style={{
                      padding: "10px 14px",
                      background: "var(--red-subtle)",
                      color: "var(--accent)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13.5px",
                      marginBottom: "20px",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handlePredict}>
                  {/* Topic Name */}
                  <div style={{ marginBottom: "20px" }}>
                    <label className="label" style={{ display: "block", marginBottom: "8px" }}>
                      Topic Title
                    </label>
                    <input
                      type="text"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      placeholder="e.g. Asymptotic Notation and Master Theorem"
                      className="input-field"
                      required
                    />
                  </div>

                  {/* Subtopic Count Slider */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <label className="label">Number of Subtopics</label>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: "14px",
                          background: "var(--paper-sunken)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <AnimatedNumber value={subtopics} /> subtopics
                      </span>
                    </div>
                    <input
                      type="range"
                      className="slider"
                      min="1"
                      max="20"
                      value={subtopics}
                      onChange={(e) => setSubtopics(parseInt(e.target.value))}
                      style={{ "--fill": `${((subtopics - 1) / 19) * 100}%` } as React.CSSProperties}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        color: "var(--ink-muted)",
                        marginTop: "6px",
                      }}
                    >
                      <span>1 (Narrow)</span>
                      <span>10 (Comprehensive)</span>
                      <span>20 (Full Unit)</span>
                    </div>
                  </div>

                  {/* Topic Type Selector */}
                  <div style={{ marginBottom: "24px" }}>
                    <label className="label" style={{ display: "block", marginBottom: "10px" }}>
                      Topic Type
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      {[
                        { id: "theory", label: "Theory", icon: "📖", desc: "Conceptual" },
                        { id: "numerical", label: "Numerical", icon: "📐", desc: "Math/Problem" },
                        { id: "lab_heavy", label: "Lab Heavy", icon: "🔬", desc: "Hands-on" },
                      ].map((item) => {
                        const selected = topicType === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setTopicType(item.id as "theory" | "numerical" | "lab_heavy")}
                            className="press"
                            style={{
                              padding: "12px 10px",
                              border: `2px solid ${selected ? "var(--ink)" : "var(--border)"}`,
                              background: selected ? "var(--paper-raised)" : "var(--paper-sunken)",
                              borderRadius: "var(--radius-md)",
                              cursor: "pointer",
                              textAlign: "center",
                              boxShadow: selected ? "3px 3px 0 var(--ink)" : "none",
                            }}
                          >
                            <div style={{ fontSize: "20px", marginBottom: "4px" }}>{item.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.label}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--ink-muted)" }}>{item.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description & Word Count */}
                  <div style={{ marginBottom: "24px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <label className="label">Syllabus Excerpt (optional)</label>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "var(--ink-muted)",
                        }}
                      >
                        {wordCount} words
                      </span>
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Paste the syllabus description for this topic..."
                      className="input-field"
                      rows={4}
                      style={{ resize: "vertical", fontFamily: "var(--font-body)" }}
                    />
                  </div>

                  <button type="submit" className="btn btn-accent btn-lg" style={{ width: "100%" }} disabled={loading}>
                    {loading ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <span className="dot-pulse" /> Estimating...
                      </span>
                    ) : (
                      "Estimate Study Time →"
                    )}
                  </button>
                </form>
              </div>
            </Reveal>

            {/* Live Prediction Output */}
            <Reveal dir="right">
              <div className="card-brutal" style={{ background: "var(--paper-raised)" }}>
                {currentResult ? (
                  <div className="animate-pop">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "24px",
                      }}
                    >
                      <span className="badge badge-teal">ESTIMATE READY</span>
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                      <div className="label" style={{ marginBottom: "6px" }}>Topic</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", lineHeight: 1.25 }}>
                        {currentResult.topic_name}
                      </div>
                    </div>

                    {/* The Big Number */}
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 16px",
                        background: "var(--paper-sunken)",
                        borderRadius: "var(--radius-md)",
                        border: "2px solid var(--border)",
                        margin: "20px 0",
                      }}
                    >
                      <div className="label" style={{ marginBottom: "8px" }}>
                        Estimated Study Time
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "3.2rem",
                          fontWeight: 800,
                          lineHeight: 1,
                          color: "var(--teal)",
                          marginBottom: "4px",
                        }}
                      >
                        {currentResult.predicted_hours.toFixed(2)}
                      </div>
                      <div style={{ fontSize: "14px", color: "var(--ink-secondary)" }}>
                        hours ({currentResult.formatted_time})
                      </div>
                    </div>

                    {/* Difficulty & Breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "18px" }}>
                      <div style={{ padding: "12px", background: "var(--paper-sunken)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <div className="label" style={{ fontSize: "10px", marginBottom: "4px" }}>Difficulty Rating</div>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)", textTransform: "capitalize" }}>
                          {currentResult.difficulty_tier} ({currentResult.topic_type === "numerical" ? "Math / Problem Solving" : currentResult.topic_type === "lab_heavy" ? "Hands-On / Lab" : "Conceptual Theory"})
                        </div>
                      </div>
                    </div>

                    {/* Actionable Study Strategy */}
                    <div
                      style={{
                        padding: "14px",
                        background: "var(--paper-sunken)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        fontSize: "13px",
                        lineHeight: "1.55",
                        color: "var(--ink-secondary)",
                        marginBottom: "24px",
                      }}
                    >
                      <strong style={{ color: "var(--ink)", display: "block", marginBottom: "4px" }}>
                        💡 Recommended Study Strategy:
                      </strong>
                      {currentResult.topic_type === "numerical"
                        ? "Problem-solving focus: Spend 30% of your time understanding formulas and 70% actively solving exercises without looking at solution keys."
                        : currentResult.topic_type === "lab_heavy"
                        ? "Hands-on implementation: Set up your tools, compilers, or test environment beforehand so session time is spent executing tasks."
                        : "Conceptual mastery: Use the Pomodoro technique (25 min study, 5 min break) with active recall and self-testing instead of passive re-reading."}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "64px 24px",
                      color: "var(--ink-muted)",
                    }}
                  >
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        background: "var(--paper-sunken)",
                        border: "2px dashed var(--border)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "28px",
                        margin: "0 auto 16px",
                      }}
                    >
                      ⏱
                    </div>
                    <p style={{ fontSize: "14px", maxWidth: "320px", margin: "0 auto" }}>
                      Enter the topic details and click "Estimate Study Time" to see your result here.
                    </p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>

          {/* Related YouTube Lectures */}
          {currentResult && (
            <Reveal dir="up">
              <div style={{ marginBottom: "64px" }}>
                <RelatedLectures topic={currentResult.topic_name} />
              </div>
            </Reveal>
          )}

          {/* How it works teaser */}
          <Reveal dir="up">
            <div className="card" style={{ marginBottom: "64px", textAlign: "center", padding: "32px" }}>
              <p className="text-body" style={{ marginBottom: "16px" }}>
                Curious how StudyForge estimates study time? Learn how topic structure, density, and neural models calculate your hours.
              </p>
              <Link href="/how-it-works" className="btn btn-ghost btn-sm">
                How It Works & Science →
              </Link>
            </div>
          </Reveal>

          {/* Recent Predictions */}
          <Reveal dir="up">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div>
                <div className="label" style={{ marginBottom: "4px" }}>
                  Your Estimates
                </div>
                <h2 className="heading-md">Recent Predictions</h2>
              </div>
              <button onClick={loadHistory} className="btn btn-ghost btn-sm">
                Refresh
              </button>
            </div>

            {history.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {history.map((item, i) => (
                  <div
                    key={item.id}
                    className="card card-interactive animate-in"
                    style={{
                      padding: "16px",
                      cursor: "pointer",
                      animationDelay: `${Math.min(i, 8) * 0.05}s`,
                    }}
                    onClick={() => setCurrentResult(item)}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "13px", lineHeight: 1.3, flex: 1, paddingRight: "8px" }}>
                        {item.topic_name}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          fontSize: "14px",
                          color: "var(--teal)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.predicted_hours.toFixed(2)}h
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        fontSize: "11px",
                        color: "var(--ink-muted)",
                      }}
                    >
                      <span style={{ textTransform: "capitalize" }}>{item.topic_type.replace("_", " ")}</span>
                      <span>•</span>
                      <span>{item.subtopic_count} subtopics</span>
                      <span>•</span>
                      <span style={{ textTransform: "capitalize", color: "var(--accent)", fontWeight: 600 }}>{item.difficulty_tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="card"
                style={{ textAlign: "center", padding: "40px", color: "var(--ink-muted)", borderStyle: "dashed" }}
              >
                <p style={{ fontSize: "14px" }}>No predictions yet. Run your first estimate above.</p>
              </div>
            )}
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}