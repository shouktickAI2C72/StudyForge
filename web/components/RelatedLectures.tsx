"use client";

import React, { useState, useEffect } from "react";
import { getTopicVideos, type TopicVideo } from "@/lib/api";

interface RelatedLecturesProps {
  topic: string;
  className?: string;
  style?: React.CSSProperties;
}

export function RelatedLectures({ topic, className = "", style }: RelatedLecturesProps) {
  const [videos, setVideos] = useState<TopicVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!topic || !topic.trim()) {
      setVideos([]);
      setActiveVideoId(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchVideos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getTopicVideos(topic.trim());
        if (!isMounted) return;
        setVideos(res.videos || []);
        setCached(Boolean(res.cached));
        // Auto-select first video preview if wanted or keep collapsed
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load lecture recommendations";
        setError(msg);
        setVideos([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, [topic]);

  if (!topic || !topic.trim()) {
    return null;
  }

  return (
    <div
      className={`card ${className}`}
      style={{
        marginTop: "24px",
        background: "var(--paper-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              background: "#FF0000",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            ▶
          </span>
          <h4
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            Related Lectures
          </h4>
        </div>

        {cached && !loading && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              color: "var(--ink-muted)",
              background: "var(--paper-sunken)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ⚡ cached (24h)
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "16px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--ink-secondary)",
            }}
          >
            <span
              className="dot-pulse"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
              }}
            />
            Searching educational lectures for &ldquo;{topic}&rdquo;...
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="skeleton" style={{ height: "64px", width: "100%", borderRadius: "var(--radius-md)" }} />
            <div className="skeleton" style={{ height: "64px", width: "100%", borderRadius: "var(--radius-md)" }} />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          style={{
            padding: "14px",
            background: "var(--red-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <strong>Unable to load lectures:</strong> {error}
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              getTopicVideos(topic)
                .then((res) => {
                  setVideos(res.videos || []);
                  setCached(Boolean(res.cached));
                })
                .catch((e) => setError(e?.message || "Failed again"))
                .finally(() => setLoading(false));
            }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "11px", padding: "4px 8px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && videos.length === 0 && (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            background: "var(--paper-sunken)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border)",
            color: "var(--ink-secondary)",
            fontSize: "13px",
          }}
        >
          No relevant educational video lectures found for this topic.
        </div>
      )}

      {/* Inline Embedded Player Preview */}
      {activeVideoId && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--teal)",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              ● Now Playing Preview
            </span>
            <button
              onClick={() => setActiveVideoId(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--ink-muted)",
                fontSize: "12px",
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              ✕ Close Preview
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
              boxShadow: "var(--shadow-md)",
            }}
          >
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1`}
              title="YouTube lecture preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
        </div>
      )}

      {/* Video Cards List */}
      {!loading && !error && videos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {videos.map((vid) => {
            const isPlaying = activeVideoId === vid.video_id;
            return (
              <div
                key={vid.video_id}
                onClick={() => setActiveVideoId(vid.video_id)}
                className="card-interactive"
                style={{
                  display: "flex",
                  gap: "14px",
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  border: isPlaying ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: isPlaying ? "var(--accent-subtle)" : "var(--paper-sunken)",
                  cursor: "pointer",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Thumbnail Container */}
                <div
                  style={{
                    position: "relative",
                    width: "112px",
                    height: "64px",
                    flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "#111",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vid.thumbnail_url}
                    alt={vid.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                  />
                  {vid.duration && vid.duration !== "?" && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "3px",
                        right: "4px",
                        background: "rgba(0,0,0,0.85)",
                        color: "#fff",
                        fontFamily: "var(--font-mono)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "1px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      {vid.duration}
                    </span>
                  )}
                  {/* Hover/Play overlay icon */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "16px",
                    }}
                  >
                    ▶
                  </div>
                </div>

                {/* Video Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "var(--ink)",
                      lineHeight: "1.35",
                      marginBottom: "4px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={vid.title}
                  >
                    {vid.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "11.5px",
                      color: "var(--ink-secondary)",
                    }}
                  >
                    <span>{vid.channel_name}</span>
                    {isPlaying && (
                      <span
                        style={{
                          color: "var(--accent)",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          fontSize: "10.5px",
                        }}
                      >
                        Playing preview
                      </span>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div style={{ flexShrink: 0, paddingRight: "4px" }}>
                  <button
                    type="button"
                    className={`btn ${isPlaying ? "btn-accent" : "btn-ghost"} btn-sm`}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      pointerEvents: "none",
                    }}
                  >
                    {isPlaying ? "Active" : "Watch"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
