"use client";

import React, { useState, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { scanNotes, type ScanResponse } from "@/lib/api";
import { RelatedLectures } from "@/components/RelatedLectures";

const SAMPLE_SYLLABUS_TEXT = `CS 401: Advanced Operating Systems & Distributed Architecture
Course Syllabus — Spring Semester

Module 1: Virtual Memory & Page Replacement Policies
Paging mechanisms, multi-level page tables, Translation Lookaside Buffer (TLB) hit ratios, inverted page tables, and demand paging algorithms including LRU, FIFO, and Working Set model.

Module 2: Process Synchronization & Concurrency Primitives
Race conditions, critical section problem, Peterson's algorithm, hardware atomic test-and-set instructions, mutex locks, semaphores, classic synchronization problems (Dining Philosophers, Readers-Writers), and condition variables.

Module 3: Deadlock Detection & Banker's Algorithm
Necessary conditions for deadlock, resource allocation graphs, deadlock prevention vs avoidance, Banker's algorithm safe state verification, and detection and recovery strategies.

Module 4: Distributed File Systems & Consensus Protocols
Network File System (NFS) v4 architecture, cache consistency, Byzantine fault tolerance, Paxos consensus protocol basics, and Raft leader election mechanisms.`;

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv"];

export default function ScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScanResponse | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const res = await scanNotes(selectedFile);
      setData(res);
      if (res.topics && res.topics.length > 0) {
        setSelectedTopic(res.topics[0].topic_name);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scanning failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    const blob = new Blob([SAMPLE_SYLLABUS_TEXT], { type: "text/plain" });
    const sampleFile = new File([blob], "cs401_operating_systems_syllabus.txt", {
      type: "text/plain",
    });
    processFile(sampleFile);
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
              MODULE 3: SYLLABUS & NOTES SCANNER
            </div>
            <h1 className="heading-xl" style={{ marginBottom: "16px" }}>
              Universal Document to Study Plan.
            </h1>
            <p className="text-body" style={{ fontSize: "17px" }}>
              Upload any course document — typed syllabi (PDF), handwritten notes (JPG/PNG), or course
              outlines (TXT/Markdown). Our document extractor segments candidate topics and pipes them
              directly into Module 1&rsquo;s PyTorch MLP for instantaneous workload quantification.
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
                Supports PDF, scanned images (PNG, JPG, WEBP), and plaintext outlines up to 15MB.
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
                EXTRACTING CANDIDATES & RUNNING PYTORCH INFERENCE...
              </div>
              <div className="progress-indeterminate" style={{ marginBottom: "16px" }} />
              <p className="text-small" style={{ marginBottom: "16px" }}>
                Parsing document structure, identifying academic topic boundaries, and chaining each entry through the Effort Predictor MLP.
              </p>
              {/* Skeleton preview of the results to come */}
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
              {/* Executive Summary Card */}
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
                    EXTRACTOR STATUS: COMPLETED ({data.extraction_method.toUpperCase()})
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.8rem",
                      lineHeight: "1.2",
                      wordBreak: "break-word",
                    }}
                  >
                    {data.filename}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "32px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Topics Detected
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "var(--amber)",
                      }}
                    >
                      <AnimatedNumber value={data.total_topics_detected} duration={700} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--paper-sunken)", textTransform: "uppercase", marginBottom: "2px" }}>
                      Cumulative Effort
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "2rem",
                        fontWeight: 800,
                        color: "var(--teal)",
                      }}
                    >
                      <AnimatedNumber value={data.total_estimated_hours} format={(v) => `${v.toFixed(1)} hrs`} duration={900} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted Topics Table */}
              <Reveal dir="up">
                <div className="card" style={{ marginBottom: "40px" }}>
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Chained Topic Predictor Output
                  </div>
                  <h2 className="heading-md" style={{ marginBottom: "20px" }}>
                    Parsed Modules & Estimated Study Durations
                  </h2>

                  <div style={{ overflowX: "auto" }}>
                    <table className="table-refined">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Module / Topic Name</th>
                          <th>Category</th>
                          <th>Subtopics</th>
                          <th>Predicted Effort</th>
                          <th>Difficulty Tier</th>
                          <th>Confidence</th>
                          <th>Lectures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topics.map((t, idx) => {
                          const isSelected = selectedTopic === t.topic_name;
                          return (
                            <tr
                              key={idx}
                              onClick={() => setSelectedTopic(t.topic_name)}
                              style={{
                                cursor: "pointer",
                                background: isSelected ? "var(--teal-subtle)" : undefined,
                              }}
                            >
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
                                0{idx + 1}
                              </td>
                              <td style={{ fontWeight: 700 }}>{t.topic_name}</td>
                              <td style={{ textTransform: "capitalize" }}>{t.topic_type}</td>
                              <td>{t.subtopic_count}</td>
                              <td
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 700,
                                  color: "var(--teal)",
                                }}
                              >
                                {t.formatted_time} ({t.predicted_hours.toFixed(2)}h)
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    t.difficulty_tier === "Deep Dive" || t.difficulty_tier === "Intensive"
                                      ? "badge-accent"
                                      : "badge-teal"
                                  }`}
                                >
                                  {t.difficulty_tier}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "110px" }}>
                                  <div
                                    style={{
                                      flex: 1,
                                      height: "6px",
                                      background: "var(--paper-sunken)",
                                      border: "1px solid var(--border)",
                                      borderRadius: "3px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      className="bar-fill"
                                      style={{
                                        width: `${t.confidence_score * 100}%`,
                                        height: "100%",
                                        background: "var(--teal)",
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                                    {(t.confidence_score * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTopic(t.topic_name);
                                  }}
                                  className={`btn ${isSelected ? "btn-accent" : "btn-ghost"} btn-sm`}
                                  style={{ fontSize: "11px", padding: "4px 8px" }}
                                >
                                  {isSelected ? "▶ Selected" : "Lectures"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* YouTube Related Lectures for Scanned Topic */}
                  {selectedTopic && (
                    <div style={{ marginTop: "24px" }}>
                      <RelatedLectures topic={selectedTopic} />
                    </div>
                  )}
                </div>
              </Reveal>

              {/* CNN Backbone Architecture Details */}
              <Reveal dir="up">
                <div className="card" style={{ marginBottom: "40px" }}>
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Vision & Sequence Transfer Learning
                  </div>
                  <h3 className="heading-sm" style={{ marginBottom: "16px" }}>
                    CNN-RNN Document Extractor Specification
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12.5px",
                    }}
                  >
                    {[
                      { title: "Architecture", value: data.cnn_backbone_metadata.model_architecture },
                      { title: "Convolution Kernels", value: data.cnn_backbone_metadata.kernel_details },
                      { title: "Pooling & Stride", value: data.cnn_backbone_metadata.pooling_details },
                    ].map((spec) => (
                      <div
                        key={spec.title}
                        className="card-interactive"
                        style={{
                          padding: "16px",
                          background: "var(--paper-sunken)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>{spec.title}</div>
                        <div style={{ color: "var(--ink-secondary)" }}>{spec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Raw Extracted Text Viewer */}
              <Reveal dir="up">
                <div className="card">
                  <div className="label" style={{ marginBottom: "8px" }}>
                    Raw Extracted Document Stream
                  </div>
                  <pre
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      lineHeight: "1.6",
                      background: "var(--paper-sunken)",
                      padding: "16px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      maxHeight: "260px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      margin: 0,
                    }}
                  >
                    {data.extracted_raw_text}
                  </pre>
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
