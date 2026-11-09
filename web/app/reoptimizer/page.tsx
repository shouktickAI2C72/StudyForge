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
        force_retrain: false,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Re-optimization failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
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
                color: "var(--teal)",
                background: "var(--teal-subtle)",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} />
              WEEKLY PLAN
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              Missed a day? Rebalance my week.
            </h1>
            <p className="text-body" style={{ fontSize: "17px" }}>
              Life happens — illnesses, family emergencies, or unexpected exam conflicts. When you miss a
              study day, StudyForge redistributes your workload across the remaining days so nothing piles up.
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
                  Which day did you miss?
                </h2>
              </div>

              <form
                onSubmit={handleReoptimize}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  alignItems: "end",
                }}
              >
                {/* Day Selection */}
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ display: "block", marginBottom: "8px" }}>
                    Skipped Day
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

                {/* Rebalance Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-accent btn-lg"
                  >
                    {loading ? "Rebalancing..." : `Rebalance my week →`}
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
                REBALANCING YOUR WEEK...
              </div>
              <div className="progress-indeterminate" style={{ marginBottom: "12px" }} />
              <p className="text-small" style={{ marginBottom: 0 }}>
                Redistributing the skipped day&rsquo;s study load across your remaining sessions.
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
              {/* Status Banner */}
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
                    WEEK REBALANCED
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.8rem",
                      lineHeight: "1.2",
                      marginBottom: "6px",
                    }}
                  >
                    {data.reopt_banner_text}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--paper-sunken)", opacity: 0.9 }}>
                    Zero study time lost: Your workload is smoothed across remaining days so you never fall behind.
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
                      Rebalanced Total
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

              {/* Workload Redistribution Cards across the Week */}
              <div style={{ marginBottom: "48px" }}>
                <Reveal dir="up">
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Your Rebalanced Week
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    How your study time was redistributed
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
                              MISSED
                              <div style={{ fontSize: "11px", fontWeight: 400, marginTop: "2px" }}>
                                Work redistributed
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
                                extra study time
                              </div>
                            </div>
                          )}
                        </div>
                      </Reveal>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 18px",
                    background: "var(--paper-sunken)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    color: "var(--ink-secondary)",
                    lineHeight: "1.5",
                  }}
                >
                  <strong style={{ color: "var(--ink)" }}>💡 Why this prevents burnout:</strong> Rather than forcing you to double your study time tomorrow, StudyForge adds modest focus intervals (+20 to +40 mins) across the rest of the week, preserving your rest day buffer.
                </div>
              </div>

              {/* Topic Adjustments Breakdown Table */}
              <Reveal dir="up">
                <div className="card">
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Topic Schedule
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    Updated study times per topic
                  </h2>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table-refined">
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Day</th>
                          <th>Type</th>
                          <th>Subtopics</th>
                          <th>Original Time</th>
                          <th>Rebalanced</th>
                          <th>Change</th>
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
                                {t.original_hours.toFixed(1)} hrs
                              </td>
                              <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                {t.optimized_hours.toFixed(1)} hrs
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