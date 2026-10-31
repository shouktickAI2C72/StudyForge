"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { useAuth } from "@/lib/auth-context";
import { getDashboard, rebalanceMissedDay, type DashboardResponse } from "@/lib/api";

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [rebalanceDate, setRebalanceDate] = useState("");
  const [rebalanceMsg, setRebalanceMsg] = useState("");

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const loadDashboard = () => {
    getDashboard(token)
      .then((res) => {
        setDashboard(res);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard";
        setErrorMessage(msg);
      })
      .finally(() => setLoading(false));
  };

  const handleRebalance = async () => {
    if (!dashboard || !rebalanceDate) return;
    try {
      const res = await rebalanceMissedDay(1, rebalanceDate);
      setRebalanceMsg(res.explanation);
      loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rebalance failed";
      setErrorMessage(msg);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navigation />
        <main style={{ flex: 1, padding: "48px 0 80px" }}>
          <div className="container">
            <div className="progress-indeterminate" style={{ marginBottom: "24px" }} />
            <p className="text-small">Loading your dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                STUDYFORGE DASHBOARD
              </div>
              <h1 className="heading-lg">
                Welcome back, {user ? user.email.split("@")[0] : "Scholar"}.
              </h1>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link href="/scanner" className="btn btn-accent btn-sm">
                Scan Syllabus
              </Link>
              <Link href="/predictor" className="btn btn-ghost btn-sm">
                Study Time
              </Link>
            </div>
          </div>

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

          {/* Empty state: no plan */}
          {!dashboard || !dashboard.has_plan ? (
            <Reveal dir="up">
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "64px 32px",
                  borderStyle: "dashed",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "var(--paper-sunken)",
                    border: "2px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "28px",
                    margin: "0 auto 20px",
                  }}
                >
                  📋
                </div>
                <h2 className="heading-md" style={{ marginBottom: "12px" }}>
                  No study plan yet
                </h2>
                <p className="text-body" style={{ marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                  Upload your syllabus to get started. StudyForge will identify topics, estimate study time,
                  find video lectures, and build a weekly plan.
                </p>
                <Link href="/scanner" className="btn btn-accent btn-lg">
                  Upload Your Syllabus →
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="animate-in">
              {/* Progress Overview */}
              <Reveal dir="up">
                <div
                  className="card-brutal"
                  style={{
                    background: "var(--paper-raised)",
                    marginBottom: "32px",
                    padding: "24px 32px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "24px",
                    }}
                  >
                    <div>
                      <div className="label" style={{ marginBottom: "6px" }}>
                        {dashboard.course_name || "Your Course"}
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>
                        Study Progress
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "32px" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
                          Progress
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 800, color: "var(--teal)" }}>
                          {dashboard.progress_percent}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
                          Topics Done
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 800, color: "var(--amber)" }}>
                          {dashboard.completed_topics}/{dashboard.total_topics}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
                          Time Studied
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 800 }}>
                          {formatMinutes(dashboard.completed_minutes)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: "16px", height: "8px", background: "var(--paper-sunken)", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${dashboard.progress_percent}%`,
                        background: "var(--teal)",
                        borderRadius: "999px",
                        transition: "width 0.6s var(--ease-expo)",
                      }}
                    />
                  </div>
                </div>
              </Reveal>

              {/* Next Topic Card */}
              {dashboard.next_topic && (
                <Reveal dir="up" delay={50}>
                  <div className="card-brutal animate-in" style={{ background: "var(--paper-raised)", marginBottom: "32px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "16px",
                      }}
                    >
                      <span className="badge badge-accent">NEXT TOPIC</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink-muted)" }}>
                        {dashboard.next_topic.date}
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
                      {dashboard.next_topic.title}
                    </h2>

                    <p className="text-body" style={{ fontSize: "14px", marginBottom: "24px" }}>
                      {dashboard.next_topic.reason}
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
                          ESTIMATED STUDY TIME
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", fontWeight: 700 }}>
                          {dashboard.next_topic.formatted_time}
                        </div>
                      </div>
                      <div>
                        <div className="label" style={{ fontSize: "10px", marginBottom: "4px" }}>
                          DIFFICULTY
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)", textTransform: "capitalize" }}>
                          {dashboard.next_topic.difficulty}
                        </div>
                      </div>
                    </div>

                    {/* Top video preview */}
                    {dashboard.next_topic.top_video && (
                      <div style={{ marginBottom: "24px" }}>
                        <div className="label" style={{ marginBottom: "8px" }}>
                          Recommended Lecture
                        </div>
                        <a
                          href={dashboard.next_topic.top_video.watch_url || dashboard.next_topic.top_video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", gap: "14px", alignItems: "center", textDecoration: "none" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={dashboard.next_topic.top_video.thumbnail_url}
                            alt={dashboard.next_topic.top_video.title}
                            style={{ width: "112px", height: "64px", objectFit: "cover", borderRadius: "var(--radius-sm)" }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)" }}>
                              {dashboard.next_topic.top_video.title}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                              {dashboard.next_topic.top_video.channel_name} • {dashboard.next_topic.top_video.duration}
                            </div>
                          </div>
                        </a>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "10px" }}>
                      <Link href="/scanner" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        View Syllabus
                      </Link>
                      <Link href="/reoptimizer" className="btn btn-ghost btn-sm">
                        Weekly Plan
                      </Link>
                    </div>
                  </div>
                </Reveal>
              )}

              {/* Today's Tasks */}
              {dashboard.today_tasks && dashboard.today_tasks.length > 0 && (
                <Reveal dir="up" delay={100}>
                  <div className="card" style={{ marginBottom: "32px" }}>
                    <div className="label" style={{ marginBottom: "8px" }}>
                      Today's Tasks
                    </div>
                    <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                      What to Study Today
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {dashboard.today_tasks.map((task) => (
                        <div
                          key={task.id}
                          className="card-interactive"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            padding: "16px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border)",
                            background: task.done ? "var(--teal-subtle)" : "var(--paper-sunken)",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                              {task.topic_title || "Weekly Review & Consolidation"}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                              {task.date} • {task.day_of_week} • {formatMinutes(task.minutes)}
                            </div>
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--teal)" }}>
                            {formatMinutes(task.minutes)}
                          </div>
                          <span
                            className={`badge ${task.done ? "badge-teal" : "badge-accent"}`}
                            style={{ fontSize: "11px" }}
                          >
                            {task.done ? "Done" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              {/* Missed Day Rebalance */}
              <Reveal dir="up" delay={150}>
                <div className="card" style={{ marginBottom: "32px", padding: "24px" }}>
                  <h3 className="heading-sm" style={{ marginBottom: "12px" }}>
                    Missed a day?
                  </h3>
                  <p className="text-body" style={{ fontSize: "14px", marginBottom: "16px" }}>
                    Tell us which day you missed and we'll rebalance your remaining topics across the rest of the week.
                  </p>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="date"
                      value={rebalanceDate}
                      onChange={(e) => setRebalanceDate(e.target.value)}
                      className="input-field"
                      style={{ width: "200px" }}
                    />
                    <button
                      type="button"
                      className="btn btn-accent btn-sm"
                      onClick={handleRebalance}
                      disabled={!rebalanceDate}
                    >
                      Rebalance my week
                    </button>
                  </div>
                  {rebalanceMsg && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px",
                        background: "var(--teal-subtle)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {rebalanceMsg}
                    </div>
                  )}
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
