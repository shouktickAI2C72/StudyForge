"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getHealth } from "@/lib/api";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Elevation shadow once the page leaves the top
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/predictor", label: "Effort Predictor" },
    { href: "/reoptimizer", label: "Schedule Re-Optimizer" },
    { href: "/scanner", label: "Syllabus Scanner" },
  ];

  return (
    <header
      className={`site-header ${scrolled ? "scrolled" : ""}`}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(250, 248, 244, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: "var(--header-height)",
      }}
    >
      <div
        className="container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--font-display)",
              fontSize: "1.6rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                background: "var(--ink)",
                color: "var(--paper)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 800,
                transition: "transform 0.35s var(--ease-bounce)",
              }}
              className="brand-mark"
            >
              SF
            </span>
            StudyForge
          </Link>

          {/* Engine status indicator */}
          <div
            title={
              backendOnline === true
                ? "FastAPI ML Backend: Connected & Active"
                : backendOnline === false
                ? "FastAPI Backend Offline (Start on port 8000)"
                : "Checking backend..."
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 8px",
              background: "var(--paper-sunken)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--ink-secondary)",
            }}
          >
            <span
              className="dot-pulse"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background:
                  backendOnline === true
                    ? "var(--teal)"
                    : backendOnline === false
                    ? "var(--accent)"
                    : "var(--amber)",
                color:
                  backendOnline === true
                    ? "var(--teal)"
                    : backendOnline === false
                    ? "var(--accent)"
                    : "var(--amber)",
              }}
            />
            <span>{backendOnline ? "PyTorch MLP: Online" : "PyTorch MLP: Port 8000"}</span>
          </div>
        </div>

        {/* Navigation links (desktop) */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: "6px",
            background: "var(--paper-sunken)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  fontSize: "13.5px",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--ink)" : "var(--ink-secondary)",
                  background: isActive ? "var(--paper-raised)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: isActive ? "var(--shadow-xs)" : "none",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  transition: "all 0.2s var(--ease-out)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User state / Auth action */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--ink-secondary)",
                  background: "var(--paper-sunken)",
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </span>
              <button
                onClick={logout}
                className="btn btn-ghost btn-sm"
                style={{ padding: "6px 12px", fontSize: "12px" }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="btn btn-accent btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              <span>🤖</span>
              <span>Sign in with Volty</span>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="mobile-menu-btn"
            style={{
              display: "none",
              placeItems: "center",
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--paper-sunken)",
              cursor: "pointer",
            }}
          >
            <div style={{ width: "16px" }}>
              <span
                style={{
                  display: "block",
                  height: "2px",
                  background: "var(--ink)",
                  borderRadius: "2px",
                  marginBottom: "4px",
                  transition: "transform 0.3s var(--ease-expo), opacity 0.2s",
                  transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none",
                }}
              />
              <span
                style={{
                  display: "block",
                  height: "2px",
                  background: "var(--ink)",
                  borderRadius: "2px",
                  marginBottom: "4px",
                  opacity: menuOpen ? 0 : 1,
                  transition: "opacity 0.2s",
                }}
              />
              <span
                style={{
                  display: "block",
                  height: "2px",
                  background: "var(--ink)",
                  borderRadius: "2px",
                  transition: "transform 0.3s var(--ease-expo), opacity 0.2s",
                  transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none",
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`mobile-menu ${menuOpen ? "open" : ""}`}
        style={{
          background: "var(--paper-raised)",
          borderBottom: menuOpen ? "1px solid var(--border)" : "none",
        }}
      >
        <div className="container" style={{ padding: "12px 24px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "10px 12px",
                  fontSize: "14px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--ink)" : "var(--ink-secondary)",
                  background: isActive ? "var(--paper-sunken)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .site-header a:hover .brand-mark {
          transform: rotate(-8deg) scale(1.08);
        }
        @media (min-width: 860px) {
          .desktop-nav {
            display: flex !important;
          }
        }
        @media (max-width: 859px) {
          .mobile-menu-btn {
            display: grid !important;
          }
        }
      `}</style>
    </header>
  );
}