"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import { login, signup, googleLogin, getAuthConfig, type AuthConfig } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: string | number;
              text?: string;
              shape?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthPage() {
  const router = useRouter();
  const { setAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  // Robot interactive states
  const [mood, setMood] = useState<"idle" | "watching" | "happy" | "excited" | "shy" | "pressed" | "success">("idle");
  const [isTurned, setIsTurned] = useState(false);
  const [isHyped, setIsHyped] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bubbleText, setBubbleText] = useState("Hi. I'm Volty. I guard this forge.");
  const [bubblePop, setBubblePop] = useState(false);
  const [meterScore, setMeterScore] = useState(0);
  const [panelLabel, setPanelLabel] = useState("NOT LOOKING");
  const [cardShake, setCardShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Refs for tracking DOM elements & physics
  const robotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const head3dRef = useRef<HTMLDivElement>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaidRef = useRef("");

  // Speak function with bubble animation
  const say = useCallback((text: string) => {
    if (text === lastSaidRef.current) return;
    lastSaidRef.current = text;
    setBubbleText(text);
    setBubblePop(false);
    requestAnimationFrame(() => {
      setBubblePop(true);
    });
  }, []);

  // Look & tilt helpers
  const look = useCallback((x: number, y: number) => {
    if (eyesRef.current) {
      eyesRef.current.style.setProperty("--lx", `${x}px`);
      eyesRef.current.style.setProperty("--ly", `${y}px`);
    }
  }, []);

  const tilt = useCallback((ry: number, rx: number) => {
    if (head3dRef.current) {
      head3dRef.current.style.setProperty("--ry", `${ry}deg`);
      head3dRef.current.style.setProperty("--rx", `${rx}deg`);
    }
  }, []);

  // Follow typing inside input
  const followTyping = useCallback((len: number) => {
    const ratio = Math.min(len / 24, 1);
    look(-6 + 12 * ratio, 5);
    tilt(-5 + 10 * ratio, -8);
  }, [look, tilt]);

  // Load Google Auth configuration
  useEffect(() => {
    getAuthConfig()
      .then((cfg) => {
        setAuthConfig(cfg);
        if (cfg.google_enabled && cfg.google_client_id) {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (window.google && googleBtnContainerRef.current) {
              window.google.accounts.id.initialize({
                client_id: cfg.google_client_id!,
                callback: handleGoogleCredential,
              });
              window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
                theme: "outline",
                size: "large",
                width: 324,
                text: "continue_with",
                shape: "rectangular",
              });
            }
          };
          document.head.appendChild(script);
        }
      })
      .catch(() => {
        setAuthConfig({ google_enabled: false, google_client_id: null });
      });
  }, []);

  // Idle blinking animation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const blinkLoop = () => {
      timeoutId = setTimeout(() => {
        if (!isSuccess && !isTurned && eyesRef.current) {
          eyesRef.current.classList.add(styles.blink);
          setTimeout(() => {
            eyesRef.current?.classList.remove(styles.blink);
          }, 150);
        }
        blinkLoop();
      }, 2600 + Math.random() * 2600);
    };
    blinkLoop();
    return () => clearTimeout(timeoutId);
  }, [isSuccess, isTurned]);

  // Mousemove head & eye tracking
  useEffect(() => {
    let rafPending = false;
    const handleMouseMove = (e: MouseEvent) => {
      const active = document.activeElement;
      if (isSuccess || (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA"))) {
        return;
      }
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (!robotRef.current) return;
        const rect = robotRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 260));
        const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 260));
        look(dx * 7, dy * 6);
        if (!isTurned) {
          tilt(dx * 12, -dy * 9);
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isSuccess, isTurned, look, tilt]);

  // Confetti explosion
  const triggerConfetti = () => {
    const colors = ["#e8553d", "#1a9e8f", "#ffc53d", "#23252d", "#ffffff"];
    const host = stageRef.current;
    if (!host) return;

    for (let i = 0; i < 65; i++) {
      const bit = document.createElement("span");
      bit.className = styles.confetti;
      bit.style.background = colors[Math.floor(Math.random() * colors.length)];
      if (Math.random() > 0.5) bit.style.borderRadius = "50%";
      host.appendChild(bit);

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 200 + Math.random() * 340;
      const tx = Math.cos(angle) * speed;
      const ty = Math.sin(angle) * speed;

      bit.animate(
        [
          { transform: "translate(0px, 0px) rotate(0deg) scale(1)", opacity: "1" },
          {
            transform: `translate(${tx}px, ${ty + 300}px) rotate(${540 * (Math.random() > 0.5 ? 1 : -1)}deg) scale(0.5)`,
            opacity: "0",
          },
        ],
        { duration: 1100 + Math.random() * 600, easing: "cubic-bezier(.15,.6,.35,1)" }
      ).onfinish = () => bit.remove();
    }
  };

  // Google credential receiver
  const handleGoogleCredential = async (response: { credential: string }) => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await googleLogin(response.credential);
      setAuth(res.access_token, res.user);
      onAuthSuccess(res.user.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google authentication failed";
      triggerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onAuthSuccess = (userLabel: string) => {
    setIsSuccess(true);
    setIsTurned(false);
    setIsHyped(false);
    setMood("success");
    say(`Access granted. Welcome to StudyForge, ${userLabel.split("@")[0]}!`);
    look(0, 0);
    tilt(0, 0);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 950);
      triggerConfetti();
    }

    setTimeout(() => {
      router.push("/dashboard");
    }, 1400);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    say(msg);
    setMood("watching");
    setCardShake(false);
    requestAnimationFrame(() => setCardShake(true));
  };

  // Name handlers
  const handleNameFocus = () => {
    setIsTurned(false);
    setMood("watching");
    say("A new scholar! State your full name.");
    followTyping(name.length);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    followTyping(val.length);
    if (val.trim().length >= 2) say(`${val.trim()}. Clean name. Logged into the forge.`);
  };

  // Email handlers
  const handleEmailFocus = () => {
    setIsTurned(false);
    setMood("watching");
    say("Email next. Academic correspondence only — zero spam guaranteed.");
    followTyping(email.length);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    followTyping(val.length);
    if (EMAIL_RE.test(val.trim())) {
      setMood("happy");
      say("Legitimate address confirmed. Excellent.");
    } else if (val.includes("@")) {
      say("Almost there. Syntax check pending.");
    }
  };

  // Password handlers
  const handlePasswordFocus = () => {
    setMood("shy");
    setIsTurned(true);
    look(0, 0);
    tilt(0, 0);
    say("A secret passphrase? Say no more. *turns around politely*");
    setPanelLabel("NOT LOOKING");
  };

  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If clicking peek button, don't turn back
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).id === "togglePass") return;
    setIsTurned(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);

    let score = 0;
    if (val.length >= 8) score++;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;
    if (val.length > 0 && score === 0) score = 1;

    setMeterScore(score);
    const labels = ["NOT LOOKING", "TOO SHORT", "GETTING THERE", "STRONG", "STUDY VAULT"];
    setPanelLabel(val.length === 0 ? "NOT LOOKING" : labels[score] || "STRONG");
  };

  const handleTogglePeek = () => {
    setShowPass(!showPass);
    if (!showPass) {
      say("Revealing the cipher? Good thing my visor is pointed at the wall.");
    }
  };

  // Submit button interactions
  const handleButtonHover = (on: boolean) => {
    if (isSuccess) return;
    setIsHyped(on);
    if (on) {
      setIsTurned(false);
      setMood("excited");
      say(mode === "login" ? "Ready to study? Press to enter." : "Forge your profile now!");
    } else {
      setMood("idle");
    }
  };

  const handleButtonPressDown = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    setIsPressed(true);
    setMood("pressed");
    say("Initiating cryptographic handshake...");
  };

  const handleButtonRelease = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      setIsPressed(false);
      if (mood === "pressed") {
        setMood(isSuccess ? "success" : "excited");
      }
    }, 300);
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuccess || submitting) return;

    if (mode === "signup" && !name.trim()) {
      triggerError("Please state your name so we can personalize your study plan.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      triggerError("Please provide a valid email address.");
      return;
    }
    if (password.length < 6) {
      triggerError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (mode === "signup") {
        const res = await signup(email.trim(), password);
        setAuth(res.access_token, res.user);
        onAuthSuccess(res.user.email);
      } else {
        const res = await login(email.trim(), password);
        setAuth(res.access_token, res.user);
        onAuthSuccess(res.user.email);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      triggerError(msg);
      setSubmitting(false);
    }
  };

  // Demo shortcut for fast testing
  const fillDemoAccount = () => {
    setEmail("scholar@studyforge.edu");
    setPassword("StudyForge2026!");
    setName("Alex Mercer");
    say("Demo credentials primed. Click LOG ME IN!");
  };

  return (
    <div className={styles.authPage}>
      <Link href="/" className={styles.backLink}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back to StudyForge</span>
      </Link>

      <main className={styles.stage} id="stage" ref={stageRef}>
        {/* Robot Guardian */}
        <div
          className={`${styles.robot} ${isTurned ? styles.isTurned : ""} ${
            isHyped ? styles.isHyped : ""
          } ${isPressed ? styles.isPressed : ""} ${isSpinning ? styles.isSpinning : ""}`}
          id="robot"
          ref={robotRef}
          data-mood={mood}
        >
          {/* Speech Bubble */}
          <div
            className={`${styles.bubble} ${bubblePop ? styles.pop : ""}`}
            id="bubble"
            role="status"
            aria-live="polite"
          >
            <span id="bubbleText">{bubbleText}</span>
          </div>

          {/* Antenna */}
          <div className={styles.antenna} aria-hidden="true">
            <span className={styles.antennaRod}></span>
            <span className={styles.antennaTip}></span>
          </div>

          {/* 3D Head */}
          <div className={styles.head3d} ref={head3dRef} aria-hidden="true">
            <div className={styles.head} id="head">
              <span className={`${styles.ear} ${styles.earL}`}></span>
              <span className={`${styles.ear} ${styles.earR}`}></span>

              {/* Front Face with visor & animated eyes */}
              <div className={`${styles.face} ${styles.faceFront}`}>
                <div className={styles.visor}>
                  <div className={styles.eyes} id="eyes" ref={eyesRef}>
                    <span className={styles.eye}></span>
                    <span className={styles.eye}></span>
                  </div>
                  <span className={`${styles.cheek} ${styles.cheekL}`}></span>
                  <span className={`${styles.cheek} ${styles.cheekR}`}></span>
                  <span className={styles.mouth}></span>
                </div>
              </div>

              {/* Back Face shown when typing password */}
              <div className={`${styles.face} ${styles.faceBack}`}>
                <div className={styles.panel}>
                  <span className={styles.panelLights}>
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  <div className={styles.meter} id="meter" data-lvl={meterScore}>
                    <i className={meterScore >= 1 ? styles.on : ""}></i>
                    <i className={meterScore >= 2 ? styles.on : ""}></i>
                    <i className={meterScore >= 3 ? styles.on : ""}></i>
                    <i className={meterScore >= 4 ? styles.on : ""}></i>
                  </div>
                  <p className={styles.panelLabel} id="panelLabel">
                    {panelLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form
          className={`${styles.card} ${cardShake ? styles.shake : ""}`}
          id="form"
          onSubmit={handleSubmit}
          noValidate
        >
          <span className={`${styles.hand} ${styles.handL}`} aria-hidden="true"></span>
          <span className={`${styles.hand} ${styles.handR}`} aria-hidden="true"></span>

          <h1 className={styles.title}>
            {mode === "login" ? "Beep boop. Who goes there?" : "New scholar? Join the forge."}
          </h1>

          {errorMessage && <div className={styles.errorMsg}>{errorMessage}</div>}

          {/* Name Field (for Sign Up) */}
          {mode === "signup" && (
            <label className={styles.field}>
              <svg className={styles.fieldIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-3.9 0-8 2-8 5v1.5h16V19c0-3-4.1-5-8-5Z" />
              </svg>
              <input
                id="name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onFocus={handleNameFocus}
                placeholder="Full name"
                autoComplete="name"
                aria-label="Full name"
              />
            </label>
          )}

          {/* Email Field */}
          <label className={styles.field}>
            <svg className={styles.fieldIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm8 7.3L4.4 7h15.2L12 12.3ZM4 9.2V17h16V9.2l-8 5.3-8-5.3Z" />
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onFocus={handleEmailFocus}
              placeholder="Academic email"
              autoComplete="email"
              aria-label="Your email"
            />
          </label>

          {/* Password Field */}
          <label className={styles.field}>
            <svg className={styles.fieldIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Zm3 4a2 2 0 0 1 1 3.7V19h-2v-1.3a2 2 0 0 1 1-3.7Z" />
            </svg>
            <input
              id="password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={handlePasswordChange}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              placeholder="Master passphrase"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              aria-label="Password"
            />
            <button
              className={styles.peek}
              id="togglePass"
              type="button"
              onClick={handleTogglePeek}
              aria-label={showPass ? "Hide password" : "Show password"}
              aria-pressed={showPass}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {showPass ? (
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                ) : (
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                )}
              </svg>
            </button>
          </label>

          {/* Submit Action */}
          <button
            className={`${styles.submitBtn} ${isSuccess ? styles.isSuccess : ""}`}
            id="loginBtn"
            type="submit"
            disabled={submitting}
            onMouseEnter={() => handleButtonHover(true)}
            onMouseLeave={() => handleButtonHover(false)}
            onFocus={() => handleButtonHover(true)}
            onBlur={() => handleButtonHover(false)}
            onPointerDown={handleButtonPressDown}
            onPointerUp={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
          >
            <span className={styles.btnBolt} aria-hidden="true">
              ⚡
            </span>
            <span>
              {isSuccess
                ? "ACCESS GRANTED ✓"
                : submitting
                ? "PROCESSING..."
                : mode === "login"
                ? "LOG ME IN"
                : "CREATE ACCOUNT"}
            </span>
          </button>

          {/* Switch mode link */}
          <div
            className={styles.switchLink}
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErrorMessage("");
              say(
                mode === "login"
                  ? "Switching to registration. Tell me about yourself!"
                  : "Welcome back, scholar! Enter your credentials."
              );
            }}
          >
            {mode === "login" ? (
              <>
                Need an account? <strong>Sign up here</strong>
              </>
            ) : (
              <>
                Already registered? <strong>Log in here</strong>
              </>
            )}
          </div>

          {/* Divider */}
          <div className={styles.toggleRow}>
            <div className={styles.dividerLine}></div>
            <span>OR CONTINUE WITH</span>
            <div className={styles.dividerLine}></div>
          </div>

          {/* Google Sign In Area */}
          <div style={{ marginTop: "14px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              ref={googleBtnContainerRef}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                minHeight: authConfig?.google_enabled ? "44px" : "0px",
              }}
            />
            {(!authConfig?.google_enabled || !authConfig?.google_client_id) && (
              <button
                type="button"
                className={styles.googleBtn}
                onClick={() => {
                  say(
                    "Google OAuth needs a Client ID in .env. Click demo credentials or use email + password!"
                  );
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Quick Demo Pre-fill for reviewers */}
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={fillDemoAccount}
              style={{
                fontSize: "11px",
                color: "#9a948a",
                cursor: "pointer",
                textDecoration: "underline",
                letterSpacing: "0.5px",
              }}
            >
              [One-click fill demo test credentials]
            </button>
          </div>

          <span className={`${styles.foot} ${styles.footL}`} aria-hidden="true"></span>
          <span className={`${styles.foot} ${styles.footR}`} aria-hidden="true"></span>
        </form>
      </main>
    </div>
  );
}
