"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  uploadSyllabus,
  getSampleSyllabus,
  getTopicVideosById,
  createPlan,
  type SyllabusResponse,
  type TopicVideosResponse,
  type TopicVideo,
  type PlanResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".heic", ".csv"];

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ScannerPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SyllabusResponse | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<number | null>(null);
  const [topicVideosCache, setTopicVideosCache] = useState<Record<number, TopicVideosResponse>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setErrorMessage("");
    setData(null);
    setPlanData(null);
    setExpandedTopicId(null);
    setTopicVideosCache({});

    try {
      const res = await uploadSyllabus(selectedFile, token);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Syllabus upload failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setErrorMessage("");
    setData(null);
    setPlanData(null);
    setFile(null);
    setExpandedTopicId(null);
    setTopicVideosCache({});

    try {
      const res = await getSampleSyllabus(token);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sample syllabus";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLectures = async (topicId: number) => {
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
      setActiveVideoId(null);
      return;
    }
    setExpandedTopicId(topicId);
    setActiveVideoId(null);

    if (!topicVideosCache[topicId]) {
      try {
        const res = await getTopicVideosById(topicId);
        setTopicVideosCache((prev) => ({ ...prev, [topicId]: res }));
      } catch {
        setTopicVideosCache((prev) => ({
          ...prev,
          [topicId]: {
            topic: "",
            videos: [],
            status: "unavailable",
            cached: false,
            fallback_search_url: "",
          },
        }));
      }
    }
  };

  const handleCreatePlan = async () => {
    if (!data) return;
    setPlanLoading(true);
    setErrorMessage("");
    try {
      const res = await createPlan(data.syllabus_id, {}, token);
      setPlanData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Plan creation failed";
      setErrorMessage(msg);
    } finally {
      setPlanLoading(false);
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
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              SCAN SYLLABUS
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              Upload your syllabus, get a study plan.
            </h1>
            <p className="text-body" style={{ fontSize: "17px" }}>
              Upload any course document — a typed PDF, a photo of your syllabus, or a text outline.
              StudyForge reads it, identifies topics, estimates study time, and finds video lectures for each.
            </p>
          </div>

          {/* Upload Area */}
          <Reveal dir="up" delay={80}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`card-brutal dropzone ${dragOver ? "dragging" : ""}`}
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: dragOver ? "var(--paper-sunken)" : "var(--paper-raised)",
                borderColor: dragOver ? "var(--accent)" : "var(--ink)",
                marginBottom: "32px",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={ACCEPTED_EXTENSIONS.join(",")}
                style={{ display: "none" }}
              />
              {/* Camera input for device capture */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
              />

              <div
                className={dragOver ? "animate-pop" : ""}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--paper-sunken)",
                  border: "2px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  fontSize: "28px",
                  transform: dragOver ? "scale(1.08)" : "scale(1)",
                  transition: "transform 0.25s var(--ease-bounce)",
                }}
              >
                📄
              </div>

              <h2 className="heading-sm" style={{ marginBottom: "8px" }}>
                {file ? file.name : "Drop your syllabus or notes here"}
              </h2>
              <p className="text-body" style={{ fontSize: "14px", marginBottom: "20px" }}>
                Supports PDF, photos (PNG, JPG, WEBP, HEIC), and text outlines up to 15 MB.
              </p>

              {/* Accepted format chips */}
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginBottom: "22px" }}>
                {ACCEPTED_EXTENSIONS.map((ext) => (
                  <span
                    key={ext}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "var(--ink-secondary)",
                      background: "var(--paper-sunken)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 8px",
                    }}
                  >
                    {ext}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm press"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm press"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm press"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSample();
                  }}
                >
                  ⚡ Load Sample Syllabus
                </button>
              </div>
            </div>
          </Reveal>

          {loading && (
            <div
              className="card animate-in"
              style={{
                padding: "32px",
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
                <span className="dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                READING DOCUMENT & ESTIMATING STUDY TIME...
              </div>
              <div className="progress-indeterminate" style={{ marginBottom: "16px" }} />
              <p className="text-small" style={{ marginBottom: "16px" }}>
                Extracting text, identifying topics, estimating study time, and finding video lectures for each topic.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="skeleton" style={{ height: "14px", width: "40%" }} />
                <div className="skeleton" style={{ height: "14px", width: "85%" }} />
                <div className="skeleton" style={{ height: "14px", width: "70%" }} />
              </div>
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

          {/* Results Display */}
          {data && (
            <div className="animate-in">
              {/* Summary Card */}
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
                  gap: "24px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "var(--teal)",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    {data.is_sample ? "SAMPLE SYLLABUS" : "EXTRACTED SUCCESSFULLY"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.8rem",
                      lineHeight: "1.2",
                      wordBreak: "break-word",
                    }}
                  >
                    {data.course_name}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "32px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Topics
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "var(--amber)",
                      }}
                    >
                      <AnimatedNumber value={data.total_topics} duration={700} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Estimated Study Time
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "var(--teal)",
                      }}
                    >
                      <AnimatedNumber value={data.total_estimated_minutes} format={(v) => formatMinutes(Math.round(v))} duration={900} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning if OCR was unreliable */}
              {data.warning && (
                <div
                  style={{
                    padding: "16px",
                    background: "var(--paper-sunken)",
                    border: "2px solid var(--amber)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "32px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  ⚠️ {data.warning}
                </div>
              )}

              {/* Topics List */}
              <Reveal dir="up">
                <div className="card" style={{ marginBottom: "40px" }}>
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Study Plan Topics
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    Topics & Estimated Study Time
                  </h2>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table-refined">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Topic</th>
                          <th>Category</th>
                          <th>Estimated Study Time</th>
                          <th>Difficulty</th>
                          <th>Lectures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topics.map((t, idx) => {
                          const isExpanded = expandedTopicId === t.id;
                          return (
                            <React.Fragment key={t.id}>
                              <tr
                                onClick={() => handleToggleLectures(t.id)}
                                style={{
                                  cursor: "pointer",
                                  background: isExpanded ? "var(--teal-subtle)" : undefined,
                                }}
                              >
                                <td style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
                                  {String(idx + 1).padStart(2, "0")}
                                </td>
                                <td style={{ fontWeight: 700 }}>
                                  {t.title}
                                  {t.subtopics.length > 0 && (
                                    <div style={{ fontSize: "12px", color: "var(--ink-secondary)", fontWeight: 400, marginTop: "4px" }}>
                                      {t.subtopics.slice(0, 3).join(", ")}{t.subtopics.length > 3 ? "..." : ""}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textTransform: "capitalize" }}>{t.kind}</td>
                                <td
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 700,
                                    color: "var(--teal)",
                                  }}
                                >
                                  {formatMinutes(t.estimated_minutes)}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      t.difficulty === "hard"
                                        ? "badge-accent"
                                        : "badge-teal"
                                    }`}
                                    style={{ textTransform: "capitalize" }}
                                  >
                                    {t.difficulty}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleLectures(t.id);
                                    }}
                                    className={`btn ${isExpanded ? "btn-accent" : "btn-ghost"} btn-sm`}
                                    style={{ fontSize: "11px", padding: "4px 8px" }}
                                  >
                                    {isExpanded ? "▼ Hide" : "▶ Lectures"}
                                  </button>
                                </td>
                              </tr>
                              {/* Expanded lectures row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} style={{ background: "var(--paper-sunken)", padding: "16px" }}>
                                    <LecturesExpander
                                      videos={topicVideosCache[t.id]}
                                      activeVideoId={activeVideoId}
                                      setActiveVideoId={setActiveVideoId}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>

              {/* Create Weekly Plan */}
              <Reveal dir="up">
                <div className="card" style={{ marginBottom: "40px", textAlign: "center", padding: "32px" }}>
                  <h3 className="heading-sm" style={{ marginBottom: "12px" }}>
                    Ready to build your weekly study plan?
                  </h3>
                  <p className="text-body" style={{ marginBottom: "20px", maxWidth: "500px", margin: "0 auto 20px" }}>
                    StudyForge will spread topics across your study days, hardest first, with a light review slot on the last day.
                  </p>
                  <button
                    type="button"
                    className="btn btn-accent btn-lg"
                    onClick={handleCreatePlan}
                    disabled={planLoading}
                  >
                    {planLoading ? "Creating Plan..." : "Create Weekly Plan →"}
                  </button>
                </div>
              </Reveal>

              {/* Plan Summary */}
              {planData && (
                <Reveal dir="up">
                  <div className="card" style={{ marginBottom: "40px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <div className="label" style={{ marginBottom: "4px" }}>
                          Weekly Plan Active
                        </div>
                        <h2 className="heading-md" style={{ marginBottom: 0 }}>
                          Your Study Schedule is Ready!
                        </h2>
                      </div>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <Link href="/dashboard" className="btn btn-primary btn-sm">
                          View on Dashboard →
                        </Link>
                        <Link href="/reoptimizer" className="btn btn-ghost btn-sm">
                          Simulate Missed Day
                        </Link>
                      </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table-refined">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Topic</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planData.items.map((item) => (
                            <tr key={item.id}>
                              <td style={{ fontFamily: "var(--font-mono)" }}>
                                {item.date} ({item.day_of_week})
                              </td>
                              <td style={{ fontWeight: 600 }}>{item.topic_title || "Weekly Review"}</td>
                              <td style={{ fontFamily: "var(--font-mono)" }}>{formatMinutes(item.minutes)}</td>
                              <td>{item.done ? "✓ Done" : "Pending"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ─── Lectures Expander ─── */
function LecturesExpander({
  videos,
  activeVideoId,
  setActiveVideoId,
}: {
  videos?: TopicVideosResponse;
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
}) {
  if (!videos) {
    return <div className="text-small">Loading lectures...</div>;
  }

  if (videos.status === "unavailable") {
    return (
      <div style={{ padding: "12px", background: "var(--paper-raised)", borderRadius: "var(--radius-sm)" }}>
        <p className="text-small" style={{ marginBottom: "8px" }}>
          Video lectures are temporarily unavailable for this topic.
        </p>
        {videos.fallback_search_url && (
          <a
            href={videos.fallback_search_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "12px" }}
          >
            Search YouTube directly →
          </a>
        )}
      </div>
    );
  }

  if (!videos.videos || videos.videos.length === 0) {
    return <div className="text-small">No video lectures found for this topic.</div>;
  }

  return (
    <div>
      {activeVideoId && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--teal)", fontWeight: 700 }}>
              ● Now Playing
            </span>
            <button
              onClick={() => setActiveVideoId(null)}
              style={{ background: "none", border: "none", color: "var(--ink-muted)", fontSize: "12px", cursor: "pointer" }}
            >
              ✕ Close
            </button>
          </div>
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: "var(--radius-md)",
              border: "2px solid var(--ink)",
              background: "#000",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1`}
              title="YouTube lecture"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {videos.videos.map((vid: TopicVideo) => (
          <div
            key={vid.video_id}
            onClick={() => setActiveVideoId(vid.video_id)}
            className="card-interactive"
            style={{
              display: "flex",
              gap: "14px",
              padding: "10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--paper-raised)",
              cursor: "pointer",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", width: "112px", height: "64px", flexShrink: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "#111" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vid.thumbnail_url} alt={vid.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              {vid.duration && vid.duration !== "?" && (
                <span style={{ position: "absolute", bottom: "3px", right: "4px", background: "rgba(0,0,0,0.85)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9.5px", fontWeight: 700, padding: "1px 4px", borderRadius: "3px" }}>
                  {vid.duration}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)", lineHeight: "1.35", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vid.title}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>
                {vid.channel_name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
