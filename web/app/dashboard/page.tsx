"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { useAuth } from "@/lib/auth-context";
import { getPredictions, type PredictResponse } from "@/lib/api";


export default function DashboardPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictResponse[]>([]);

  const [activeTopic, setActiveTopic] = useState("Dynamic Programming & DAG Shortest Paths");

  useEffect(() => {
    getPredictions(5)
      .then((res) => {
        setPredictions(res.predictions);
        if (res.predictions.length > 0) {
          setActiveTopic(res.predictions[0].topic_name);
        }
      })
      .catch(() => {});
  }, []);





  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navigation />

      <main style={{ flex: 1, padding: "48px 0 80px" }}>
        <div className="container">
          {/* Welcome row */}
          <div
            className="animate-in"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              marginBottom: "40px",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "24px",
            }}
          >
            <div>
              <div className="label" style={{ marginBottom: "6px" }}>
                STUDYFORGE COMMAND CENTER
              </div>
              <h1 className="heading-lg">
                Welcome back, {user ? user.email.split("@")[0] : "Scholar"}.
              </h1>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link href="/predictor" className="btn btn-accent btn-sm">
                + Predict New Topic
              </Link>
              <Link href="/scanner" className="btn btn-ghost btn-sm">
                Scan Syllabus
              </Link>
            </div>
          </div>

          {/* Top row: Next Best Action & Focus Timer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "32px",
              marginBottom: "48px",
            }}
          >
            {/* Next Best Action Card */}
            <Reveal dir="up" delay={50}>
              <div className="card-brutal animate-in stagger-1" style={{ background: "var(--paper-raised)", height: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <span className="badge badge-accent">NEXT BEST ACTION</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-muted)" }}>
                    Priority: High
                  </span>
                </div>

                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2rem",
                    lineHeight: "1.15",
                    marginBottom: "12px",
                  }}
                >
                  {activeTopic}
                </h2>

                <p className="text-body" style={{ fontSize: "14px", marginBottom: "24px" }}>
                  Identified by PyTorch MLP as today&rsquo;s highest-leverage topic based on prerequisite depth
                  and weekly schedule distribution.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    background: "var(--paper-sunken)",
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    marginBottom: "24px",
                  }}
                >
                  <div>
                    <div className="label" style={{ fontSize: "10px", marginBottom: "4px" }}>
                      CALIBRATED EFFORT
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 700 }}>
                      3h 15m
                    </div>
                  </div>
                  <div>
                    <div className="label" style={{ fontSize: "10px", marginBottom: "4px" }}>
                      DIFFICULTY TIER
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)" }}>
                      Deep Dive
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <Link href="/predictor" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                    ⚡ View Full Estimate
                  </Link>
                  <Link href="/reoptimizer" className="btn btn-ghost btn-sm">
                    Reschedule Topic
                  </Link>
                </div>
              </div>
            </Reveal>


          </div>

          {/* Module Direct Jump Cards */}
          <div style={{ marginBottom: "56px" }}>
            <Reveal dir="up">
              <div className="label" style={{ marginBottom: "16px" }}>
                ACADEMIC INTELLIGENCE SUITE
              </div>
            </Reveal>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {[
                { href: "/predictor", icon: "⚡", title: "Module 1: Effort Predictor", body: "PyTorch MLP estimates study hours from syllabus depth, category, and word count.", cta: "Open Predictor", color: "var(--accent)", delay: 0 },
                { href: "/reoptimizer", icon: "🔄", title: "Module 2: Schedule Re-Optimizer", body: "Missed Monday? Rebalance your weekly plan dynamically using Adam vs RMSprop convergence.", cta: "Open Re-Optimizer", color: "var(--teal)", delay: 100 },
                { href: "/scanner", icon: "📷", title: "Module 3: Syllabus Scanner", body: "Upload PDFs or handwritten notes to segment topics and chain through ML prediction.", cta: "Open Scanner", color: "var(--ink)", delay: 200 },
              ].map((m) => (
                <Reveal key={m.href} dir="up" delay={m.delay}>
                  <Link href={m.href} className="card card-interactive" style={{ display: "block", height: "100%" }}>
                    <span className="icon-tile" style={{ background: "var(--paper-sunken)", marginBottom: "14px" }}>
                      {m.icon}
                    </span>
                    <h3 className="heading-sm" style={{ marginBottom: "6px" }}>
                      {m.title}
                    </h3>
                    <p className="text-small" style={{ marginBottom: "16px" }}>
                      {m.body}
                    </p>
                    <span className="link-arrow" style={{ fontSize: "13px", color: m.color }}>
                      {m.cta}
                      <span className="arrow">→</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Recent Database Activity Log */}
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
                  DATABASE RECORDS
                </div>
                <h2 className="heading-md">Recent Study Records</h2>
              </div>
              <Link href="/predictor" className="btn btn-ghost btn-sm">
                View All Records
              </Link>
            </div>

            {predictions.length > 0 ? (
              <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="table-refined">
                    <thead>
                      <tr>
                        <th>Topic Title</th>
                        <th>Category</th>
                        <th>Subtopics</th>
                        <th>Predicted Duration</th>
                        <th>Difficulty Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.topic_name}</td>
                          <td style={{ textTransform: "capitalize" }}>{p.topic_type}</td>
                          <td>{p.subtopic_count}</td>
                          <td
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: "var(--teal)",
                            }}
                          >
                            {p.formatted_time}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                p.difficulty_tier === "Deep Dive" || p.difficulty_tier === "Intensive"
                                  ? "badge-accent"
                                  : "badge-teal"
                              }`}
                            >
                              {p.difficulty_tier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-small">No predictions recorded yet. Run your first topic in the Predictor!</p>
            )}
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}