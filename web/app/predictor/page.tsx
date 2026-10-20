"use client";

import React, { useState, useEffect } from "react";
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

const ACTIVATIONS = [
  { name: "★ ReLU (Deployed)", train: "0.0417", valMse: "0.0644", maeH: "0.2229 hrs", maeM: "~13m 22s", epoch: "90", deployed: true },
  { name: "LeakyReLU", train: "0.0245", valMse: "0.0650", maeH: "0.2339 hrs", maeM: "~14m 02s", epoch: "69", deployed: false },
  { name: "Tanh", train: "0.0277", valMse: "0.1569", maeH: "0.3239 hrs", maeM: "~19m 26s", epoch: "300", deployed: false },
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
      const msg = err instanceof Error ? err.message : "Inference request failed";
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              MODULE 1: TOPIC EFFORT PREDICTOR
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              <span className="line-mask">
                <span>Calibrated Study</span>
              </span>
              <span className="line-mask">
                <span style={{ "--line-delay": "0.12s" } as React.CSSProperties}>Effort Engine.</span>
              </span>
            </h1>
            <p className="text-body animate-in stagger-3" style={{ fontSize: "17px" }}>
              Our 3-layer PyTorch Multilayer Perceptron evaluates subtopic density, pedagogical category,
              and syllabus description depth to predict the precise study hours required to master any academic concept.
            </p>
          </div>

          {/* Quick Presets */}
          <Reveal dir="up">
            <div style={{ marginBottom: "32px" }}>
              <div className="label" style={{ marginBottom: "12px" }}>
                Quick-Load Academic Presets
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
                    {preset.topic_name.split("&")[0].trim()}
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
                  Topic Parameters
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
                      <label className="label">Subtopic Count</label>
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
                      Pedagogical Category
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
                      <label className="label">Syllabus Excerpt</label>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "var(--ink-muted)",
                        }}
                      >
                        Feature [x₅]: <AnimatedNumber value={wordCount} /> words
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Paste the syllabus description or subtopic listing..."
                      className="input-field"
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  {/* Calculate Trigger */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-accent btn-lg"
                    style={{ width: "100%" }}
                  >
                    {loading ? "Running PyTorch MLP..." : "Calculate Required Effort →"}
                  </button>
                </form>
              </div>
            </Reveal>

            {/* Prediction Output Display */}
            <Reveal dir="right" delay={100}>
              {loading && (
                <div className="progress-indeterminate" style={{ marginBottom: "16px" }} />
              )}
              {currentResult ? (
                <div
                  key={currentResult.id}
                  className="card-brutal animate-pop"
                  style={{
                    background: "var(--paper-raised)",
                    borderColor: "var(--ink)",
                    position: "sticky",
                    top: "90px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "20px",
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: "16px",
                    }}
                  >
                    <span className="badge badge-teal">
                      <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} />
                      ML INFERENCE COMPLETE
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                      }}
                    >
                      Record #{currentResult.id}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.8rem",
                      lineHeight: "1.2",
                      marginBottom: "20px",
                    }}
                  >
                    {currentResult.topic_name}
                  </h3>

                  {/* Primary Metric: Formatted Time */}
                  <div
                    style={{
                      background: "var(--paper-sunken)",
                      border: "2px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "24px",
                      textAlign: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <div className="label" style={{ marginBottom: "6px" }}>
                      Estimated Study Requirement
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "3.2rem",
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        color: "var(--ink)",
                        lineHeight: "1",
                        marginBottom: "8px",
                      }}
                    >
                      {currentResult.formatted_time}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--ink-secondary)" }}>
                      Exact computation:{" "}
                      <strong>{currentResult.predicted_hours.toFixed(2)} decimal hours</strong>
                    </div>
                  </div>

                  {/* Difficulty & Confidence */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px",
                        background: "var(--paper-sunken)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="label" style={{ marginBottom: "4px" }}>
                        Difficulty Tier
                      </div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color:
                            currentResult.difficulty_tier === "Deep Dive" ||
                            currentResult.difficulty_tier === "Intensive"
                              ? "var(--accent)"
                              : "var(--teal)",
                        }}
                      >
                        {currentResult.difficulty_tier}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "16px",
                        background: "var(--paper-sunken)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="label" style={{ marginBottom: "4px" }}>
                        Model Confidence
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700 }} className="tnum">
                        <AnimatedNumber
                          value={currentResult.confidence_score * 100}
                          format={(v) => `${v.toFixed(1)}%`}
                        />
                      </div>
                      {/* Confidence bar */}
                      <div style={{ marginTop: "8px", height: "6px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${currentResult.confidence_score * 100}%`,
                            background: "var(--teal)",
                            borderRadius: "999px",
                            transition: "width 0.6s var(--ease-expo)",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Vector Transparency */}
                  <div
                    style={{
                      padding: "14px",
                      background: "var(--paper-sunken)",
                      borderRadius: "var(--radius-md)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--ink-secondary)",
                      lineHeight: "1.6",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "4px", color: "var(--ink)" }}>
                      Normalized Input Vector:
                    </div>
                    <div>• x₁ (subtopics): {currentResult.subtopic_count}</div>
                    <div>• x₂-x₄ (type flag): [{currentResult.topic_type}]</div>
                    <div>• x₅ (description word length): {currentResult.desc_word_count} words</div>
                  </div>

                  {/* YouTube Educational Lecture Recommendations */}
                  <RelatedLectures topic={currentResult.topic_name} />
                </div>
              ) : (
                <div
                  className="card animate-float"
                  style={{
                    borderStyle: "dashed",
                    padding: "48px 24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "420px",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "var(--paper-sunken)",
                      border: "1px solid var(--border)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "24px",
                      marginBottom: "16px",
                    }}
                  >
                    ⚡
                  </div>
                  <h3 className="heading-sm" style={{ marginBottom: "8px" }}>
                    Awaiting Input
                  </h3>
                  <p className="text-body" style={{ maxWidth: "300px", fontSize: "14px" }}>
                    Select a preset or enter your syllabus topic and click &ldquo;Calculate Required Effort&rdquo; to execute the PyTorch MLP inference.
                  </p>
                </div>
              )}
            </Reveal>
          </div>

          {/* Benchmark Transparency: ReLU vs LeakyReLU vs Tanh */}
          <Reveal dir="up">
            <div className="card" style={{ marginBottom: "64px" }}>
              <div className="label" style={{ marginBottom: "8px" }}>
                Empirical Validation
              </div>
              <h2 className="heading-md" style={{ marginBottom: "16px" }}>
                Activation Function Comparison Experiment
              </h2>
              <p className="text-body" style={{ marginBottom: "24px", maxWidth: "760px" }}>
                To ensure our predictions are robust against overfitting, the model weights were trained across
                identical academic splits using ReLU, LeakyReLU, and Tanh activation functions. ReLU produced the lowest
                validation Mean Absolute Error (~13 minutes).
              </p>

              <div style={{ overflowX: "auto" }}>
                <table className="table-refined" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th>Activation</th>
                      <th>Train MSE</th>
                      <th>Validation MSE</th>
                      <th>Val MAE (Hours)</th>
                      <th>Val MAE (Minutes)</th>
                      <th>Optimal Epoch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ACTIVATIONS.map((a) => (
                      <tr
                        key={a.name}
                        style={a.deployed ? { background: "var(--teal-subtle)", fontWeight: 700 } : undefined}
                      >
                        <td>{a.name}</td>
                        <td className="tnum">{a.train}</td>
                        <td className="tnum">{a.valMse}</td>
                        <td className="tnum">{a.maeH}</td>
                        <td className="tnum" style={a.deployed ? { color: "var(--teal)" } : undefined}>{a.maeM}</td>
                        <td className="tnum">{a.epoch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* SQLite Predictions History */}
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
                  Persistent Database
                </div>
                <h2 className="heading-md">Recent Prediction Logs</h2>
              </div>
              <button onClick={loadHistory} className="btn btn-ghost btn-sm">
                Refresh Logs
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
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                      }}
                    >
                      <span className="badge badge-accent" style={{ fontSize: "10px" }}>
                        {item.topic_type}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--teal)",
                        }}
                      >
                        {item.formatted_time}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                      {item.topic_name}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        color: "var(--ink-muted)",
                      }}
                    >
                      <span>{item.subtopic_count} subtopics</span>
                      <span>{item.difficulty_tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-small">No predictions recorded yet in SQLite database.</p>
            )}
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}
