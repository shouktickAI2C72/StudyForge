"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  reoptimizeSchedule,
  type ReoptimizeResponse,
  type TopicAdjustment,
} from "@/lib/api";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function ReoptimizerPage() {
  const [selectedSkippedDay, setSelectedSkippedDay] = useState("MON");
  const [epochs, setEpochs] = useState(120);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReoptimizeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Trigger initial re-optimization on mount so page is rich and alive immediately
  useEffect(() => {
    handleReoptimize();
  }, []);

  const handleReoptimize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await reoptimizeSchedule({
        skipped_day: selectedSkippedDay,
        force_retrain: true,
        epochs: epochs,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Re-optimization failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Slider fill percentage for the epochs range input
  const epochsFill = ((epochs - 20) / (300 - 20)) * 100;

  // Loss bars: relative share of total loss so the two optimizers read at a glance
  const adamLoss = data?.optimizer_comparison.adam_loss ?? 0;
  const rmsLoss = data?.optimizer_comparison.rmsprop_loss ?? 0;
  const adamShare = adamLoss + rmsLoss > 0 ? (adamLoss / (adamLoss + rmsLoss)) * 100 : 50;

  const xavierVar = data?.init_comparison.xavier_loss_variance ?? 0;
  const heVar = data?.init_comparison.he_loss_variance ?? 0;
  const xavierShare = xavierVar + heVar > 0 ? (xavierVar / (xavierVar + heVar)) * 100 : 50;

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
                color: "var(--teal)",
                background: "var(--teal-subtle)",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} />
              MODULE 2: ADAPTIVE SCHEDULE RE-OPTIMIZER
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              Resilient Weekly Rebalancing.
            </h1>
            <p className="text-body" style={{ fontSize: "17px" }}>
              Life happens — illnesses, family emergencies, or unexpected exam conflicts. When you miss a
              study day, StudyForge doesn&rsquo;t let unfinished topics pile up into burnout. Our mini-batch
              retraining algorithm rebalances your weekly workload while comparing Adam vs RMSprop convergence.
            </p>
          </div>

          {/* Trigger Control Strip */}
          <Reveal dir="up" delay={80}>
            <div className="card-brutal" style={{ marginBottom: "40px", background: "var(--paper-raised)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <h2 className="heading-sm" style={{ marginBottom: 0 }}>
                  Simulate Day Disruption
                </h2>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--ink-muted)",
                    background: "var(--paper-sunken)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                  }}
                >
                  gradient-descent rebalance
                </span>
              </div>

              <form
                onSubmit={handleReoptimize}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "24px",
                  alignItems: "end",
                }}
              >
                {/* Day Selection */}
                <div>
                  <label className="label" style={{ display: "block", marginBottom: "8px" }}>
                    Skipped / Interrupted Day
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {DAYS.map((d) => {
                      const active = selectedSkippedDay === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedSkippedDay(d)}
                          className="press"
                          style={{
                            padding: "8px 14px",
                            borderRadius: "var(--radius-sm)",
                            border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                            background: active ? "var(--accent-subtle)" : "var(--paper-raised)",
                            color: active ? "var(--accent)" : "var(--ink)",
                            fontWeight: active ? 800 : 600,
                            fontFamily: "var(--font-mono)",
                            fontSize: "12.5px",
                            cursor: "pointer",
                            transform: active ? "translateY(-1px)" : "none",
                            boxShadow: active ? "2px 3px 0 var(--accent)" : "none",
                            transition: "all 0.18s var(--ease-out)",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Epochs Range */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <label className="label">Mini-Batch Epochs</label>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: "13px",
                        color: "var(--teal)",
                      }}
                    >
                      {epochs} epochs
                    </span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="20"
                    max="300"
                    step="10"
                    value={epochs}
                    onChange={(e) => setEpochs(parseInt(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", "--fill": `${epochsFill}%` } as React.CSSProperties}
                  />
                </div>

                {/* Rebalance Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-accent btn-lg"
                    style={{ width: "100%" }}
                  >
                    {loading ? "Retraining & Rebalancing..." : `Re-Optimize (${selectedSkippedDay} Skipped) →`}
                  </button>
                </div>
              </form>
            </div>
          </Reveal>

          {loading && (
            <div
              className="card animate-in"
              style={{
                padding: "28px 32px",
                marginBottom: "32px",
                background: "var(--paper-raised)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                <span className="dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} />
                RETRAINING SCHEDULE MODEL — RUNNING MINI-BATCH GRADIENT DESCENT...
              </div>
              <div className="progress-indeterminate" style={{ marginBottom: "12px" }} />
              <p className="text-small" style={{ marginBottom: 0 }}>
                Zeroing the skipped day&rsquo;s load, redistributing surplus across remaining sessions, and
                racing Adam against RMSprop to lock in the best convergence curve.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              className="animate-in"
              style={{
                padding: "16px",
                background: "var(--red-subtle)",
                color: "var(--accent)",
                borderRadius: "var(--radius-md)",
                border: "2px solid var(--accent)",
                marginBottom: "32px",
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </div>
          )}

          {data && (
            <div className="animate-in">
              {/* Executive Status Banner */}
              <div
                className="animate-pop"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  borderRadius: "var(--radius-lg)",
                  padding: "24px 32px",
                  marginBottom: "40px",
                  boxShadow: "var(--shadow-brutal)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--amber)",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    SYSTEM REBALANCE EVENT #{data.id || "LIVE"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.8rem",
                      lineHeight: "1.2",
                    }}
                  >
                    {data.reopt_banner_text}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "32px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Original Total
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.5rem", fontWeight: 700 }}>
                      <AnimatedNumber value={data.total_original_hours} format={(v) => `${v.toFixed(1)} hrs`} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Re-Optimized Total
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "var(--teal)",
                      }}
                    >
                      <AnimatedNumber value={data.total_optimized_hours} format={(v) => `${v.toFixed(1)} hrs`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimizer & Weight Init Competitions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "24px",
                  marginBottom: "40px",
                }}
              >
                {/* Adam vs RMSprop */}
                <Reveal dir="up">
                  <div className="card" style={{ height: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}
                    >
                      <div className="label">Convergence Optimization</div>
                      <span className="badge badge-teal">
                        WINNER: {data.optimizer_comparison.winner}
                      </span>
                    </div>
                    <h3 className="heading-sm" style={{ marginBottom: "12px" }}>
                      Adam vs RMSprop Tournament
                    </h3>
                    <p className="text-body" style={{ fontSize: "13.5px", marginBottom: "20px" }}>
                      {data.optimizer_comparison.summary}
                    </p>

                    {/* Loss race bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--ink-secondary)" }}>ADAM</span>
                          <span style={{ fontWeight: 700, color: data.optimizer_comparison.winner === "Adam" ? "var(--teal)" : "var(--ink)" }}>
                            <AnimatedNumber value={adamLoss} format={(v) => v.toFixed(4)} duration={700} />
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "var(--paper-sunken)", borderRadius: "4px", border: "1px solid var(--border)", overflow: "hidden" }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${adamShare}%`,
                              height: "100%",
                              background: data.optimizer_comparison.winner === "Adam" ? "var(--teal)" : "var(--ink-muted)",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--ink-secondary)" }}>RMSPROP</span>
                          <span style={{ fontWeight: 700, color: data.optimizer_comparison.winner === "RMSprop" ? "var(--teal)" : "var(--ink)" }}>
                            <AnimatedNumber value={rmsLoss} format={(v) => v.toFixed(4)} duration={700} />
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "var(--paper-sunken)", borderRadius: "4px", border: "1px solid var(--border)", overflow: "hidden" }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${100 - adamShare}%`,
                              height: "100%",
                              background: data.optimizer_comparison.winner === "RMSprop" ? "var(--teal)" : "var(--ink-muted)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${data.optimizer_comparison.winner === "Adam" ? "var(--teal)" : "var(--border)"}`,
                        }}
                      >
                        <div className="text-small">Adam MSE Loss</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color:
                              data.optimizer_comparison.winner === "Adam"
                                ? "var(--teal)"
                                : "var(--ink)",
                          }}
                        >
                          {adamLoss.toFixed(4)}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${data.optimizer_comparison.winner === "RMSprop" ? "var(--teal)" : "var(--border)"}`,
                        }}
                      >
                        <div className="text-small">RMSprop MSE Loss</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color:
                              data.optimizer_comparison.winner === "RMSprop"
                                ? "var(--teal)"
                                : "var(--ink)",
                          }}
                        >
                          {rmsLoss.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Xavier vs He Initialization */}
                <Reveal dir="up" delay={100}>
                  <div className="card" style={{ height: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}
                    >
                      <div className="label">Weight Initialization</div>
                      <span className="badge badge-teal">
                        WINNER: {data.init_comparison.winner}
                      </span>
                    </div>
                    <h3 className="heading-sm" style={{ marginBottom: "12px" }}>
                      Xavier Glorot vs Kaiming He
                    </h3>
                    <p className="text-body" style={{ fontSize: "13.5px", marginBottom: "20px" }}>
                      {data.init_comparison.summary}
                    </p>

                    {/* Variance race bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--ink-secondary)" }}>XAVIER</span>
                          <span style={{ fontWeight: 700, color: data.init_comparison.winner.includes("Xavier") ? "var(--teal)" : "var(--ink)" }}>
                            <AnimatedNumber value={xavierVar} format={(v) => v.toFixed(5)} duration={700} />
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "var(--paper-sunken)", borderRadius: "4px", border: "1px solid var(--border)", overflow: "hidden" }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${xavierShare}%`,
                              height: "100%",
                              background: data.init_comparison.winner.includes("Xavier") ? "var(--amber)" : "var(--ink-muted)",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--ink-secondary)" }}>HE</span>
                          <span style={{ fontWeight: 700, color: data.init_comparison.winner.includes("He") ? "var(--teal)" : "var(--ink)" }}>
                            <AnimatedNumber value={heVar} format={(v) => v.toFixed(5)} duration={700} />
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "var(--paper-sunken)", borderRadius: "4px", border: "1px solid var(--border)", overflow: "hidden" }}>
                          <div
                            className="bar-fill"
                            style={{
                              width: `${100 - xavierShare}%`,
                              height: "100%",
                              background: data.init_comparison.winner.includes("He") ? "var(--amber)" : "var(--ink-muted)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${data.init_comparison.winner.includes("Xavier") ? "var(--amber)" : "var(--border)"}`,
                        }}
                      >
                        <div className="text-small">Xavier Variance</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color:
                              data.init_comparison.winner.includes("Xavier")
                                ? "var(--teal)"
                                : "var(--ink)",
                          }}
                        >
                          {xavierVar.toFixed(5)}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "12px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${data.init_comparison.winner.includes("He") ? "var(--amber)" : "var(--border)"}`,
                        }}
                      >
                        <div className="text-small">He Variance</div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color:
                              data.init_comparison.winner.includes("He")
                                ? "var(--teal)"
                                : "var(--ink)",
                          }}
                        >
                          {heVar.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Workload Redistribution Cards across the Week */}
              <div style={{ marginBottom: "48px" }}>
                <Reveal dir="up">
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Workload Rebalancing Schedule
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    Surplus Distribution Across The Week
                  </h2>
                </Reveal>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {DAYS.map((day, i) => {
                    const isSkipped = day === selectedSkippedDay;
                    const addedMins = data.redistribution.redistributed[day] || 0;
                    return (
                      <Reveal key={day} dir="up" delay={i * 60}>
                        <div
                          className={isSkipped ? "" : "card-interactive"}
                          style={{
                            padding: "16px",
                            borderRadius: "var(--radius-md)",
                            border: isSkipped
                              ? "2px dashed var(--accent)"
                              : "2px solid var(--border)",
                            background: isSkipped
                              ? "var(--accent-subtle)"
                              : "var(--paper-raised)",
                            textAlign: "center",
                            height: "100%",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                              fontSize: "16px",
                              marginBottom: "6px",
                              color: isSkipped ? "var(--accent)" : "var(--ink)",
                            }}
                          >
                            {day}
                          </div>

                          {isSkipped ? (
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "var(--accent)",
                              }}
                            >
                              SKIPPED DAY
                              <div style={{ fontSize: "11px", fontWeight: 400, marginTop: "2px" }}>
                                Work absorbed
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "18px",
                                  fontWeight: 700,
                                  color: addedMins > 0 ? "var(--teal)" : "var(--ink-secondary)",
                                }}
                              >
                                +<AnimatedNumber value={addedMins} duration={600} />m
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--ink-muted)" }}>
                                reallocated
                              </div>
                            </div>
                          )}
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>

              {/* Topic Adjustments Breakdown Table */}
              <Reveal dir="up">
                <div className="card">
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Topic-Level Adjustment Records
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    Granular Curriculum Timeline
                  </h2>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table-refined">
                      <thead>
                        <tr>
                          <th>Subject / Topic</th>
                          <th>Day</th>
                          <th>Category</th>
                          <th>Subtopics</th>
                          <th>Original Time</th>
                          <th>Re-Optimized</th>
                          <th>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topic_adjustments.map((t: TopicAdjustment, idx: number) => {
                          const isPositiveDelta = t.delta_minutes > 0;
                          return (
                            <tr
                              key={idx}
                              style={{
                                background:
                                  t.day === selectedSkippedDay ? "var(--paper-sunken)" : "transparent",
                              }}
                            >
                              <td style={{ fontWeight: 600 }}>{t.name}</td>
                              <td style={{ fontFamily: "var(--font-mono)" }}>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "var(--paper-sunken)",
                                    border: "1px solid var(--border)",
                                  }}
                                >
                                  {t.day}
                                </span>
                              </td>
                              <td style={{ textTransform: "capitalize" }}>{t.topic_type}</td>
                              <td>{t.subtopics} subtopics</td>
                              <td style={{ fontFamily: "var(--font-mono)" }}>
                                {t.original_hours.toFixed(1)} hrs ({t.original_minutes}m)
                              </td>
                              <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                {t.optimized_hours.toFixed(1)} hrs ({t.optimized_minutes}m)
                              </td>
                              <td
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 700,
                                  color: isPositiveDelta
                                    ? "var(--accent)"
                                    : t.delta_minutes < 0
                                    ? "var(--teal)"
                                    : "var(--ink-muted)",
                                }}
                              >
                                {isPositiveDelta ? `+${t.delta_minutes}m` : `${t.delta_minutes}m`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
