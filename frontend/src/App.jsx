import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

function token() { return localStorage.getItem("token"); }

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

function fmt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const gold = "#c4a96b";
const bg0 = "#0c0c0e";
const bg1 = "#111114";
const border = "#2a2a2e";
const textPrimary = "#e8e2d6";
const textMuted = "#6b6b6b";
const textSub = "#b0a898";

const styles = {
  page: { fontFamily: "'Georgia', serif", background: bg0, minHeight: "100vh", color: textPrimary },
  card: { background: bg1, border: `1px solid ${border}`, borderRadius: "4px", padding: "24px" },
  cardSm: { background: bg1, border: `1px solid ${border}`, borderRadius: "4px", padding: "16px 20px" },
  input: {
    width: "100%", background: bg0, border: `1px solid ${border}`, borderRadius: "4px",
    color: textPrimary, padding: "10px 14px", fontSize: "14px", fontFamily: "sans-serif",
    outline: "none", boxSizing: "border-box",
  },
  btn: (v = "primary") => ({
    padding: "9px 18px", borderRadius: "4px", cursor: "pointer",
    fontSize: "13px", letterSpacing: "0.5px", fontFamily: "sans-serif", fontWeight: "500",
    background: v === "primary" ? gold : "transparent",
    color: v === "primary" ? bg0 : gold,
    border: v === "primary" ? "none" : `1px solid ${border}`,
  }),
  btnSm: (v = "secondary") => ({
    padding: "5px 12px", borderRadius: "4px", cursor: "pointer",
    fontSize: "12px", fontFamily: "sans-serif",
    background: v === "primary" ? gold : "transparent",
    color: v === "primary" ? bg0 : textMuted,
    border: `1px solid ${border}`,
  }),
  label: { fontSize: "11px", letterSpacing: "3px", color: textMuted, textTransform: "uppercase", display: "block", marginBottom: "8px", fontFamily: "sans-serif" },
  eyebrow: { fontSize: "11px", letterSpacing: "4px", color: textMuted, textTransform: "uppercase", fontFamily: "sans-serif" },
  error: { color: "#bf6b6b", fontSize: "13px", fontFamily: "sans-serif", marginTop: "8px" },
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  tailored:  { bg: "#1a1a1a", color: "#888888", dot: "#666666", label: "Not Applied" },
  applied:   { bg: "#1a1a2a", color: "#6b8bbf", dot: "#4a6a9f", label: "Applied" },
  interview: { bg: "#1a2a1a", color: "#6bbf6b", dot: "#4a9f4a", label: "Interview" },
  offer:     { bg: "#2a2a1a", color: "#c4a96b", dot: "#a08040", label: "Offer" },
  rejected:  { bg: "#2a1a1a", color: "#bf6b6b", dot: "#9f4a4a", label: "Rejected" },
};
const STATUS_LIST = ["tailored", "applied", "interview", "offer", "rejected"];

function Badge({ status, size = "sm" }) {
  const c = STATUS[status] || STATUS.applied;
  return (
    <span style={{
      ...c, fontSize: size === "sm" ? "10px" : "12px",
      padding: size === "sm" ? "3px 8px" : "4px 10px",
      borderRadius: "2px", letterSpacing: "1px",
      fontFamily: "sans-serif", textTransform: "uppercase",
    }}>{STATUS[status]?.label || status}</span>
  );
}


// ── Landing page ──────────────────────────────────────────────────────────────

function LandingPage({ onEnter }) {
  const lp = {
    bg:       "#0a0a0a",
    card:     "#111111",
    border:   "#222222",
    gold:     "#c4a96b",
    text:     "#e8e8e8",
    muted:    "#888888",
    green:    "#6bbf6b",
  };

  const features = [
    { icon: "◈", title: "Dashboard", desc: "Get a bird's-eye view of your job search. See total applications, response rate, interviews, and recent activity all in one place." },
    { icon: "◉", title: "Application Tracker", desc: "Track every application from not applied to offer. Update statuses, add notes, and view the full timeline for each role." },
    { icon: "◎", title: "Gmail Agent", desc: "Connect your Gmail and let the agent automatically detect interview invites, offers, and rejections — your tracker stays up to date." },
  ];

  const steps = [
    { n: "01", title: "Add an application", desc: "Log a job you're interested in or have already applied to." },
    { n: "02", title: "Track your progress", desc: "Move applications through statuses — not applied, applied, interview, offer, or rejected." },
    { n: "03", title: "Connect Gmail", desc: "Authorize Gmail access and let the agent scan your inbox for job-related emails." },
    { n: "04", title: "Stay on top", desc: "Check your dashboard for stats, trends, and activity across every application." },
  ];

  const mockApps = [
    { role: "Senior Engineer",  company: "Stripe",  status: "interview", color: "#6bbf6b" },
    { role: "Staff Developer",  company: "Vercel",  status: "applied",   color: "#6b8bbf" },
    { role: "Tech Lead",        company: "Linear",  status: "offer",     color: "#c4a96b" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: lp.bg, color: lp.text, fontFamily: "sans-serif" }}>
      <style>{`
        .lp-nav-signin { transition: color 0.15s, border-color 0.15s; }
        .lp-nav-signin:hover { color: #c4a96b !important; border-color: #c4a96b !important; }
        .lp-nav-start { transition: opacity 0.15s, transform 0.15s; }
        .lp-nav-start:hover { opacity: 0.85; transform: translateY(-1px); }

        .lp-btn-primary { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s; }
        .lp-btn-primary:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(196,169,107,0.25); }
        .lp-btn-secondary { transition: color 0.15s, border-color 0.15s; }
        .lp-btn-secondary:hover { color: #c4a96b !important; border-color: #c4a96b !important; }

        .lp-stat { transition: transform 0.2s; cursor: default; }
        .lp-stat:hover { transform: scale(1.08); }

        .lp-mock-stat { transition: border-color 0.2s, box-shadow 0.2s; }
        .lp-mock-stat:hover { border-color: #333 !important; box-shadow: 0 0 12px rgba(196,169,107,0.08); }
        .lp-mock-row { transition: background 0.15s, border-color 0.15s, transform 0.15s; cursor: default; }
        .lp-mock-row:hover { background: #1d1d1d !important; border-color: #333 !important; transform: translateX(3px); }

        .lp-feature-card { transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .lp-feature-card:hover { transform: translateY(-6px); border-color: #c4a96b !important; box-shadow: 0 12px 40px rgba(196,169,107,0.1); }
        .lp-feature-icon { transition: transform 0.2s; }
        .lp-feature-card:hover .lp-feature-icon { transform: scale(1.2); }

        .lp-step-card { transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .lp-step-card:hover { transform: translateY(-5px); border-color: #3a3a3a !important; box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
        .lp-step-num { transition: color 0.2s; }
        .lp-step-card:hover .lp-step-num { color: #c4a96b !important; }

        .lp-check-row { transition: transform 0.15s; }
        .lp-check-row:hover { transform: translateX(4px); }

        .lp-cta-btn { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s; }
        .lp-cta-btn:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(196,169,107,0.3); }

        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-a1 { animation: lp-fade-up 0.55s ease 0.05s both; }
        .lp-a2 { animation: lp-fade-up 0.55s ease 0.15s both; }
        .lp-a3 { animation: lp-fade-up 0.55s ease 0.25s both; }
        .lp-a4 { animation: lp-fade-up 0.55s ease 0.35s both; }
        .lp-a5 { animation: lp-fade-up 0.55s ease 0.45s both; }
        .lp-a6 { animation: lp-fade-up 0.55s ease 0.55s both; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ padding: "0 60px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${lp.border}`, position: "sticky", top: 0, background: lp.bg, zIndex: 100 }}>
        <span style={{ fontSize: "17px", fontWeight: "700", color: lp.gold, letterSpacing: "1.5px", textTransform: "uppercase" }}>ApplyWisely</span>
        <button onClick={onEnter} className="lp-nav-start" style={{ background: lp.gold, border: "none", color: "#0a0a0a", padding: "8px 18px", borderRadius: "3px", cursor: "pointer", fontSize: "13px", fontWeight: "600", letterSpacing: "0.5px" }}>
          Open App
        </button>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "100px 60px 80px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        {/* Badge */}
        <div className="lp-a1" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#1a1a0a", border: `1px solid #3a3a1a`, borderRadius: "20px", padding: "6px 16px", marginBottom: "32px" }}>
          <span style={{ color: lp.gold }}>◎</span>
          <span style={{ fontSize: "12px", color: lp.gold, letterSpacing: "1px", textTransform: "uppercase" }}>Job Search Command Centre</span>
        </div>

        <h1 className="lp-a2" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: "700", lineHeight: "1.15", margin: "0 0 24px", color: lp.text, letterSpacing: "-1px" }}>
          Track every application.<br />
          <span style={{ color: lp.gold }}>Never miss a reply.</span>
        </h1>

        <p className="lp-a3" style={{ fontSize: "18px", color: lp.muted, maxWidth: "600px", margin: "0 auto 40px", lineHeight: "1.7" }}>
          Manage your entire job search in one place — track applications by status, monitor your pipeline on a live dashboard, and let the Gmail Agent automatically catch interview invites and offers.
        </p>

        <div className="lp-a4" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "64px" }}>
          <button onClick={onEnter} className="lp-btn-primary" style={{ background: lp.gold, border: "none", color: "#0a0a0a", padding: "14px 32px", borderRadius: "3px", cursor: "pointer", fontSize: "15px", fontWeight: "700", letterSpacing: "0.5px" }}>
            Open App →
          </button>
        </div>

        {/* Stats */}
        <div className="lp-a5" style={{ display: "flex", justifyContent: "center", gap: "48px", flexWrap: "wrap", marginBottom: "80px" }}>
          {[["3", "Tracking views"], ["100%", "Private & local"], ["0", "Sign-ups needed"]].map(([n, l]) => (
            <div key={l} className="lp-stat" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: lp.gold }}>{n}</div>
              <div style={{ fontSize: "13px", color: lp.muted, marginTop: "4px", letterSpacing: "0.5px" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Mock dashboard */}
        <div className="lp-a6" style={{ background: "#0f0f0f", border: `1px solid ${lp.border}`, borderRadius: "8px", padding: "24px", maxWidth: "780px", margin: "0 auto", textAlign: "left" }}>
          {/* Top bar */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />)}
          </div>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[["Applications","24", lp.text],["Response Rate","67%", lp.gold],["Interviews","8", lp.green],["Offers","3", "#c4a96b"]].map(([l,v,c]) => (
              <div key={l} className="lp-mock-stat" style={{ background: "#161616", border: `1px solid ${lp.border}`, borderRadius: "4px", padding: "14px 16px" }}>
                <div style={{ fontSize: "10px", color: lp.muted, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px" }}>{l}</div>
                <div style={{ fontSize: "22px", color: c, fontWeight: "600" }}>{v}</div>
              </div>
            ))}
          </div>
          {/* App rows */}
          {mockApps.map(a => (
            <div key={a.role} className="lp-mock-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#161616", border: `1px solid ${lp.border}`, borderRadius: "4px", marginBottom: "8px" }}>
              <div>
                <span style={{ fontSize: "13px", color: lp.text, fontWeight: "500" }}>{a.role}</span>
                <span style={{ fontSize: "12px", color: lp.muted, marginLeft: "8px" }}>@ {a.company}</span>
              </div>
              <span style={{ fontSize: "11px", color: a.color, background: a.color + "18", padding: "3px 10px", borderRadius: "2px", letterSpacing: "1px", textTransform: "uppercase" }}>{a.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "80px 60px", borderTop: `1px solid ${lp.border}`, background: "#0d0d0d" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: lp.gold, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>Features</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: "600", color: lp.text, margin: 0 }}>Everything you need to manage your search</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {features.map(f => (
              <div key={f.title} className="lp-feature-card" style={{ background: lp.card, border: `1px solid ${lp.border}`, borderRadius: "6px", padding: "28px 24px" }}>
                <div className="lp-feature-icon" style={{ fontSize: "20px", color: lp.gold, marginBottom: "14px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "15px", fontWeight: "600", color: lp.text, margin: "0 0 10px", letterSpacing: "0.3px" }}>{f.title}</h3>
                <p style={{ fontSize: "13px", color: lp.muted, lineHeight: "1.7", margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "80px 60px", borderTop: `1px solid ${lp.border}` }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <div style={{ fontSize: "11px", color: lp.gold, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>How it works</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: "600", color: lp.text, margin: 0 }}>Get started in 4 steps</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            {steps.map((s, i) => (
              <div key={s.n} className="lp-step-card" style={{ background: lp.card, border: `1px solid ${lp.border}`, borderRadius: "6px", padding: "28px 24px" }}>
                <div className="lp-step-num" style={{ fontSize: "28px", fontWeight: "700", color: lp.border, marginBottom: "14px", letterSpacing: "-1px" }}>{s.n}</div>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: lp.text, margin: "0 0 10px" }}>{s.title}</h3>
                <p style={{ fontSize: "13px", color: lp.muted, lineHeight: "1.7", margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy callout ── */}
      <section style={{ padding: "60px", borderTop: `1px solid ${lp.border}`, background: "#0d0d0d" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "40px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ fontSize: "11px", color: lp.green, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>Privacy First</div>
            <h2 style={{ fontSize: "22px", fontWeight: "600", color: lp.text, margin: "0 0 16px" }}>100% Private & Local</h2>
            <p style={{ fontSize: "14px", color: lp.muted, lineHeight: "1.8", margin: 0 }}>
              Your application data lives on your own machine. No accounts required, no data sold, no third-party tracking. Everything runs locally.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
            {["No account required", "No third-party sharing", "Your data, your machine"].map(item => (
              <div key={item} className="lp-check-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: lp.green, fontSize: "14px" }}>✓</span>
                <span style={{ fontSize: "14px", color: lp.text }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 60px", borderTop: `1px solid ${lp.border}`, textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "700", color: lp.text, margin: "0 0 16px", lineHeight: "1.2" }}>
            Ready to take control of<br /><span style={{ color: lp.gold }}>your job search?</span>
          </h2>
          <p style={{ fontSize: "15px", color: lp.muted, lineHeight: "1.7", marginBottom: "36px" }}>
            Open the app and start tracking your applications, monitoring your pipeline, and letting Gmail do the heavy lifting.
          </p>
          <button onClick={onEnter} className="lp-cta-btn" style={{ background: lp.gold, border: "none", color: "#0a0a0a", padding: "16px 40px", borderRadius: "3px", cursor: "pointer", fontSize: "15px", fontWeight: "700", letterSpacing: "0.5px" }}>
            Open App →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "32px 60px", borderTop: `1px solid ${lp.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: lp.gold, letterSpacing: "1px" }}>ApplyWisely</span>
        <span style={{ fontSize: "12px", color: lp.muted }}>Built with AI. Designed for humans.</span>
        <span style={{ fontSize: "12px", color: lp.muted }}>© 2026 ApplyWisely</span>
      </footer>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: "◈" },
  { id: "tracker",      label: "Tracker",       icon: "◉" },
  { id: "gmail",        label: "Gmail Agent",   icon: "◎" },
];

function Sidebar({ active, setActive, onBack }) {
  return (
    <div style={{ width: "200px", borderRight: `1px solid ${border}`, display: "flex", flexDirection: "column", minHeight: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "28px 24px 20px", borderBottom: `1px solid ${border}` }}>
        <div style={styles.eyebrow}>ApplyWisely</div>
      </div>
      <nav style={{ flex: 1, padding: "20px 0" }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} className="app-nav-btn" style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "10px 24px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left", fontSize: "13px", letterSpacing: "0.5px",
            fontFamily: "sans-serif", color: active === item.id ? gold : textMuted,
            borderLeft: active === item.id ? `2px solid ${gold}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: "10px" }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding: "20px 24px", borderTop: `1px solid ${border}` }}>
        <button onClick={onBack} className="app-signout" style={{ background: "none", border: "none", color: textMuted, fontSize: "12px", cursor: "pointer", fontFamily: "sans-serif" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

// ── Donut chart ────────────────────────────────────────────────────────────────

function DonutChart({ segments, total, selected, onSelect }) {
  // segments: [{ key, count, color, dot }]
  const size   = 260;
  const cx     = size / 2;
  const cy     = size / 2;
  const R      = 100;   // outer radius
  const r      = 58;    // inner radius (donut hole)
  const GAP    = 0.018; // radians gap between segments

  // Build arcs
  let angle = -Math.PI / 2; // start at top
  const arcs = segments.map(seg => {
    const frac  = total > 0 ? seg.count / total : 0;
    const sweep = frac * 2 * Math.PI - GAP;
    const start = angle + GAP / 2;
    const end   = start + Math.max(sweep, 0.001);
    angle       = end + GAP / 2;

    const x1 = cx + R * Math.cos(start);
    const y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end);
    const y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(end);
    const iy1 = cy + r * Math.sin(end);
    const ix2 = cx + r * Math.cos(start);
    const iy2 = cy + r * Math.sin(start);
    const large = sweep > Math.PI ? 1 : 0;

    const midAngle = start + sweep / 2;
    const labelR   = R + 22;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    return { ...seg, path: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`, frac, midAngle, lx, ly, sweep };
  });

  const sel = selected ? segments.find(s => s.key === selected) : null;

  return (
    <svg width={size + 80} height={size + 80} viewBox={`-40 -40 ${size+80} ${size+80}`} style={{ overflow: "visible" }}>
      {arcs.map(arc => {
        const isSelected = selected === arc.key;
        const scale = isSelected ? 1.06 : 1;
        return (
          <g key={arc.key} style={{ cursor: "pointer", transition: "transform 0.2s", transformOrigin: `${cx}px ${cy}px`, transform: `scale(${scale})` }}
             onClick={() => onSelect(isSelected ? null : arc.key)}>
            <path d={arc.path} fill={arc.dot}
              opacity={selected && !isSelected ? 0.35 : 1}
              stroke={bg0} strokeWidth="1"
            />
          </g>
        );
      })}

      {/* Centre text */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={sel ? sel.color : textPrimary}
        style={{ fontSize: sel ? "32px" : "36px", fontFamily: "Georgia, serif", fontWeight: "400" }}>
        {sel ? sel.count : total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={textMuted}
        style={{ fontSize: "12px", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "2px" }}>
        {sel ? sel.key : "total"}
      </text>
      {sel && (
        <text x={cx} y={cy + 32} textAnchor="middle" fill={sel.color}
          style={{ fontSize: "13px", fontFamily: "sans-serif" }}>
          {Math.round(sel.frac * 100)}%
        </text>
      )}
    </svg>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage({ onNavigate }) {
  const [stats, setStats]         = useState(null);
  const [apps, setApps]           = useState([]);
  const [selected, setSelected]   = useState(null); // status key or null

  useEffect(() => {
    apiFetch("/applications/dashboard").then(setStats).catch(() => {});
    apiFetch("/applications/").then(setApps).catch(() => {});
  }, []);

  if (!stats) return <div style={{ padding: "60px 48px", color: textMuted, fontFamily: "sans-serif" }}>Loading…</div>;

  const segments = STATUS_LIST
    .map(s => ({ key: s, count: stats.by_status[s] || 0, ...STATUS[s] }))
    .filter(s => s.count > 0);

  const filteredApps = selected
    ? apps.filter(a => a.status === selected)
    : [];

  const pipelineWidth = (count) => stats.total ? Math.max(4, Math.round((count / stats.total) * 100)) : 0;

  return (
    <div className="app-page" style={{ padding: "40px 48px", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={styles.eyebrow}>Overview</div>
      <h2 style={{ fontSize: "22px", fontWeight: "400", color: gold, margin: "10px 0 32px" }}>Dashboard</h2>

      {/* Top row: donut + stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "32px", marginBottom: "32px", alignItems: "start" }}>

        {/* Donut chart */}
        <div style={{ ...styles.card, display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px" }}>
          <div style={{ ...styles.eyebrow, marginBottom: "16px", alignSelf: "flex-start" }}>Applications by status</div>
          {stats.total === 0 ? (
            <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif", padding: "40px 0" }}>No applications yet</div>
          ) : (
            <DonutChart segments={segments} total={stats.total} selected={selected} onSelect={setSelected} />
          )}
          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "8px" }}>
            {segments.map(s => (
              <div key={s.key}
                onClick={() => setSelected(selected === s.key ? null : s.key)}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                         padding: "6px 10px", borderRadius: "4px",
                         background: selected === s.key ? s.dot + "22" : "transparent",
                         border: `1px solid ${selected === s.key ? s.dot + "66" : "transparent"}`,
                         transition: "all 0.15s" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: "13px", color: selected === s.key ? s.color : textSub, fontFamily: "sans-serif" }}>{STATUS[s.key]?.label || s.key}</span>
                <span style={{ fontSize: "13px", color: s.color, fontFamily: "sans-serif", fontWeight: "500" }}>{s.count}</span>
                <span style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif" }}>{Math.round(s.count / stats.total * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: stats + pipeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="app-stat-card" style={styles.cardSm}>
              <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Total</div>
              <div style={{ fontSize: "32px", color: textPrimary }}>{stats.total}</div>
            </div>
            <div className="app-stat-card" style={styles.cardSm}>
              <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Response rate</div>
              <div style={{ fontSize: "32px", color: gold }}>{stats.response_rate}%</div>
            </div>
            <div className="app-stat-card" style={styles.cardSm}>
              <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Interviews</div>
              <div style={{ fontSize: "32px", color: STATUS.interview.color }}>{stats.by_status.interview || 0}</div>
            </div>
            <div className="app-stat-card" style={styles.cardSm}>
              <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Offers</div>
              <div style={{ fontSize: "32px", color: STATUS.offer.color }}>{stats.by_status.offer || 0}</div>
            </div>
          </div>

          {/* Pipeline bar */}
          <div style={styles.card}>
            <div style={{ ...styles.eyebrow, marginBottom: "16px" }}>Pipeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {STATUS_LIST.map(s => {
                const count = stats.by_status[s] || 0;
                const w = pipelineWidth(count);
                const isSelected = selected === s;
                return (
                  <div key={s} onClick={() => setSelected(isSelected ? null : s)}
                    className="app-pipeline-row"
                    style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                             padding: "4px 6px", borderRadius: "3px",
                             background: isSelected ? STATUS[s].dot + "15" : "transparent" }}>
                    <div style={{ width: "66px", fontSize: "10px", color: isSelected ? STATUS[s].color : textMuted,
                                  fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0 }}>{s}</div>
                    <div style={{ flex: 1, height: "5px", background: border, borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${w}%`, height: "100%", background: STATUS[s].dot,
                                    borderRadius: "3px", transition: "width 0.4s",
                                    opacity: selected && !isSelected ? 0.3 : 1 }} />
                    </div>
                    <div style={{ width: "28px", textAlign: "right", fontSize: "12px", color: STATUS[s].color, fontFamily: "sans-serif" }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filtered applications list */}
      {selected && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ ...styles.eyebrow }}>
                Showing {filteredApps.length} {selected} application{filteredApps.length !== 1 ? "s" : ""}
              </div>
              <Badge status={selected} />
            </div>
            <button onClick={() => setSelected(null)} style={styles.btnSm()}>Clear ×</button>
          </div>
          {filteredApps.length === 0 ? (
            <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif" }}>No applications with this status.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredApps.map(app => (
                <div key={app.id} className="app-card-hover" style={{ ...styles.cardSm, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "14px", color: textPrimary }}>{app.role}</span>
                      <span style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif" }}>@ {app.company}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif" }}>Applied {fmt(app.applied_at)}</div>
                  </div>
                  <button onClick={() => onNavigate("tracker")} style={styles.btnSm()}>Open →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div style={styles.card}>
        <div style={{ ...styles.eyebrow, marginBottom: "20px" }}>Recent activity</div>
        {stats.recent_activity.length === 0 ? (
          <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif" }}>No activity yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {stats.recent_activity.map((ev, i) => (
              <div key={i} className="app-activity-row" style={{ display: "flex", gap: "16px", paddingBottom: "16px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: STATUS[ev.to_status]?.dot || gold, marginTop: "5px" }} />
                  {i < stats.recent_activity.length - 1 && <div style={{ width: "1px", flex: 1, background: border, marginTop: "6px", minHeight: "20px" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: textPrimary, fontFamily: "sans-serif" }}>
                    <span style={{ color: textSub }}>{ev.role}</span>
                    <span style={{ color: textMuted }}> @ {ev.company}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", marginTop: "2px" }}>
                    {ev.from_status ? `${ev.from_status} → ` : "Created as "}
                    <span style={{ color: STATUS[ev.to_status]?.color }}>{ev.to_status}</span>
                    <span style={{ marginLeft: "10px" }}>{fmtTime(ev.occurred_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {stats.total > 0 && (
          <button onClick={() => onNavigate("tracker")} style={{ ...styles.btnSm(), marginTop: "12px" }}>
            View all applications →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Application detail drawer ─────────────────────────────────────────────────

function AppDrawer({ appId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("notes");   // "notes" | "timeline" | "resume"
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await apiFetch(`/applications/${appId}`);
    setDetail(d);
  }, [appId]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(status) {
    await apiFetch(`/applications/${appId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load(); onChanged();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSaving(true);
    await apiFetch(`/applications/${appId}/notes`, { method: "POST", body: JSON.stringify({ body: noteText }) });
    setNoteText(""); setSaving(false); load();
  }

  async function deleteNote(noteId) {
    await apiFetch(`/applications/${appId}/notes/${noteId}`, { method: "DELETE" });
    load();
  }

  if (!detail) return (
    <div style={{ ...drawerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: textMuted, fontFamily: "sans-serif" }}>Loading…</div>
    </div>
  );

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      background: "none", border: "none", cursor: "pointer", fontFamily: "sans-serif",
      fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase",
      color: tab === id ? gold : textMuted,
      borderBottom: tab === id ? `1px solid ${gold}` : "1px solid transparent",
      padding: "6px 0", marginRight: "20px",
    }}>{label}</button>
  );

  return (
    <div style={drawerStyle}>
      {/* Header */}
      <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "16px", color: textPrimary, marginBottom: "4px" }}>{detail.role}</div>
            <div style={{ fontSize: "13px", color: textMuted, fontFamily: "sans-serif" }}>{detail.company}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer", lineHeight: "1" }}>×</button>
        </div>
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Badge status={detail.status} size="md" />
          <span style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif" }}>Applied {fmt(detail.applied_at)}</span>
        </div>
        {/* Status changer */}
        <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {STATUS_LIST.filter(s => s !== detail.status).map(s => (
            <button key={s} onClick={() => updateStatus(s)} style={{
              ...styles.btnSm(), color: STATUS[s].color, border: `1px solid ${STATUS[s].dot}`,
            }}>→ {STATUS[s].label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 28px", borderBottom: `1px solid ${border}` }}>
        {tabBtn("notes", "Notes")}
        {tabBtn("timeline", "Timeline")}
        {tabBtn("resume", "Tailored resume")}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

        {tab === "notes" && (
          <div>
            <form onSubmit={addNote} style={{ marginBottom: "20px", display: "flex", gap: "8px" }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add a note…"
              />
              <button type="submit" style={styles.btn("primary")} disabled={saving}>Add</button>
            </form>
            {detail.notes_list.length === 0 ? (
              <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif" }}>No notes yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {detail.notes_list.map(n => (
                  <div key={n.id} style={{ ...styles.cardSm, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: textSub, fontFamily: "sans-serif", lineHeight: "1.6" }}>{n.body}</div>
                      <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", marginTop: "6px" }}>{fmtTime(n.created_at)}</div>
                    </div>
                    <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", fontSize: "16px", flexShrink: 0, marginLeft: "8px" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "timeline" && (
          <div>
            {detail.status_events.length === 0 ? (
              <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif" }}>No events yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {detail.status_events.map((ev, i) => (
                  <div key={ev.id} style={{ display: "flex", gap: "16px", paddingBottom: "20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: `2px solid ${STATUS[ev.to_status]?.dot || gold}`, background: bg0, marginTop: "3px" }} />
                      {i < detail.status_events.length - 1 && <div style={{ width: "1px", flex: 1, background: border, marginTop: "4px", minHeight: "24px" }} />}
                    </div>
                    <div style={{ paddingTop: "1px" }}>
                      <div style={{ fontSize: "13px", fontFamily: "sans-serif", color: textPrimary }}>
                        {ev.from_status
                          ? <><span style={{ color: STATUS[ev.from_status]?.color }}>{ev.from_status}</span> → <span style={{ color: STATUS[ev.to_status]?.color }}>{ev.to_status}</span></>
                          : <span style={{ color: STATUS[ev.to_status]?.color }}>Created as {ev.to_status}</span>
                        }
                      </div>
                      {ev.note && <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", marginTop: "2px" }}>{ev.note}</div>}
                      <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", marginTop: "4px" }}>{fmtTime(ev.occurred_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "resume" && (
          <div>
            {detail.tailored_resume_text ? (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                  <button onClick={() => navigator.clipboard.writeText(detail.tailored_resume_text)} style={styles.btnSm()}>Copy</button>
                </div>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "sans-serif", fontSize: "12px", lineHeight: "1.8", color: textSub }}>
                  {detail.tailored_resume_text}
                </pre>
              </>
            ) : (
              <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif" }}>No tailored resume attached.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const drawerStyle = {
  width: "420px", borderLeft: `1px solid ${border}`, display: "flex",
  flexDirection: "column", background: bg1, minHeight: "100vh", flexShrink: 0,
};

// ── Paste to Scan ─────────────────────────────────────────────────────────────

function PasteToScan({ onScanned }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState("");
  const fileInputRef             = useRef(null);

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const processImage = useCallback(async (file) => {
    setScanning(true);
    setError("");
    try {
      const base64 = await fileToBase64(file);
      const result = await apiFetch("/scan/", {
        method: "POST",
        body: JSON.stringify({ image_base64: base64, mime_type: file.type }),
      });
      onScanned(result);
    } catch (err) {
      setError(err.message || "Failed to scan image");
    } finally {
      setScanning(false);
    }
  }, [onScanned]);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) processImage(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImage]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0",
        border: `1.5px dashed ${scanning ? gold : border}`,
        borderRadius: "8px", overflow: "hidden",
        background: scanning ? "rgba(196,169,107,0.04)" : bg1,
        transition: "border-color 0.2s, background 0.2s",
        cursor: scanning ? "default" : "pointer",
      }}
        className="lp-feature-card"
        onClick={() => !scanning && fileInputRef.current?.click()}
      >
        {/* Left — icon + text */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px", flex: 1 }}>
          <span style={{
            fontSize: "22px", color: gold,
            animation: scanning ? "spin 1s linear infinite" : "none",
          }}>
            {scanning ? "◌" : "⚡"}
          </span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: textPrimary, fontFamily: "sans-serif" }}>
              {scanning ? "Scanning…" : "Paste Screenshot (Ctrl+V)"}
            </div>
            <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", marginTop: "2px" }}>
              {scanning ? "AI is extracting job details" : "to auto-fill job details instantly"}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: "1px", background: border, alignSelf: "stretch" }} />

        {/* Right — upload trigger */}
        <div
          onClick={e => { e.stopPropagation(); if (!scanning) fileInputRef.current?.click(); }}
          style={{ padding: "14px 20px", color: textMuted, fontSize: "18px", cursor: "pointer", transition: "color 0.15s" }}
          title="Upload image file"
          className="app-btn-sm"
        >
          ↑
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div style={{ ...styles.error, marginTop: "6px" }}>⚠ {error}</div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Add Application Modal ─────────────────────────────────────────────────────

function AddAppModal({ onClose, onSaved, initialData = {} }) {
  const [company, setCompany] = useState(initialData.company || "");
  const [role, setRole]       = useState(initialData.role    || "");
  const [status, setStatus]   = useState("tailored");
  const [notes, setNotes]     = useState(initialData.notes   || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) { setError("Company and role are required."); return; }
    setLoading(true); setError("");
    try {
      await apiFetch("/applications/", {
        method: "POST",
        body: JSON.stringify({ company: company.trim(), role: role.trim(), status, notes: notes.trim() || null }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }} onClick={onClose}>
      <div style={{
        background: bg1, border: `1px solid ${border}`, borderRadius: "8px",
        width: "100%", maxWidth: "480px", padding: "32px",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "500", color: gold }}>Add Application</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: textMuted, fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Company */}
          <div style={{ marginBottom: "16px" }}>
            <label style={styles.label}>Company Name</label>
            <input className="app-input" style={styles.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Stripe" autoFocus />
          </div>

          {/* Role */}
          <div style={{ marginBottom: "16px" }}>
            <label style={styles.label}>Job Role</label>
            <input className="app-input" style={styles.input} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineer" />
          </div>

          {/* Status */}
          <div style={{ marginBottom: "16px" }}>
            <label style={styles.label}>Status</label>
            <select className="app-input" value={status} onChange={e => setStatus(e.target.value)} style={{
              ...styles.input, cursor: "pointer",
              color: STATUS[status]?.color || textPrimary,
            }}>
              {STATUS_LIST.map(s => (
                <option key={s} value={s} style={{ color: STATUS[s]?.color, background: bg0 }}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "24px" }}>
            <label style={styles.label}>Notes</label>
            <textarea className="app-input" style={{ ...styles.input, height: "100px", resize: "vertical" }}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Paste job description, notes, or anything relevant…"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="app-btn-secondary" style={styles.btn("secondary")} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="app-btn-primary" style={{
              ...styles.btn("primary"),
              background: gold, color: bg0, fontWeight: "600",
              opacity: loading ? 0.7 : 1,
            }} disabled={loading}>
              {loading ? "Saving…" : "+ Add Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tracker page ──────────────────────────────────────────────────────────────

function TrackerPage({ onBack }) {
  const [apps, setApps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanData, setScanData]         = useState(null);

  function handleScanned(data) {
    setScanData(data);
    setShowAddModal(true);
  }

  const load = useCallback(async () => {
    const data = await apiFetch("/applications/");
    setApps(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteApp(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this application?")) return;
    await apiFetch(`/applications/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    load();
  }

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchSearch = !search || `${a.role} ${a.company}`.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* List pane */}
      <div style={{ flex: 1, padding: "40px 40px 40px 48px", overflowY: "auto", minWidth: 0 }}>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "400", color: gold, margin: 0 }}>Tracker</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="app-btn-primary"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: gold, color: bg0, border: "none",
              padding: "9px 18px", borderRadius: "6px", cursor: "pointer",
              fontSize: "13px", fontWeight: "600", fontFamily: "sans-serif", letterSpacing: "0.3px",
            }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span> Add Application
          </button>
        </div>

        {/* Paste to Scan */}
        <PasteToScan onScanned={handleScanned} />

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <input
            style={{ ...styles.input, maxWidth: "220px" }}
            placeholder="Search role or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            {["all", ...STATUS_LIST].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                ...styles.btnSm(filterStatus === s ? "primary" : "secondary"),
                color: filterStatus === s ? bg0 : (STATUS[s]?.color || textMuted),
                background: filterStatus === s ? gold : "transparent",
                border: `1px solid ${filterStatus === s ? gold : border}`,
              }}>{s === "all" ? "All" : STATUS[s].label}</button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "24px" }}>
          {STATUS_LIST.map(s => (
            <div key={s} className="app-stat-card" style={{ ...styles.cardSm, padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: textMuted, fontFamily: "sans-serif", textTransform: "uppercase" }}>{STATUS[s].label}</div>
              <div style={{ fontSize: "20px", color: STATUS[s].color, marginTop: "4px" }}>{apps.filter(a => a.status === s).length}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ color: textMuted, fontSize: "14px", fontFamily: "sans-serif" }}>
            {apps.length === 0 ? "No applications yet." : "No applications match your filter."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(app => (
              <div
                key={app.id}
                onClick={() => setSelectedId(selectedId === app.id ? null : app.id)}
                className="app-tracker-card"
                style={{
                  ...styles.card,
                  cursor: "pointer",
                  borderColor: selectedId === app.id ? gold : border,
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", color: textPrimary }}>{app.role}</span>
                      <span style={{ fontSize: "13px", color: textMuted, fontFamily: "sans-serif" }}>@ {app.company}</span>
                      <Badge status={app.status} />
                    </div>
                    <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif" }}>
                      Applied {fmt(app.applied_at)} · Updated {fmt(app.updated_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, marginLeft: "12px" }}>
                    <span style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif" }}>
                      {selectedId === app.id ? "Close ↑" : "Open ↓"}
                    </span>
                    <button onClick={(e) => deleteApp(app.id, e)} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", fontSize: "18px" }}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <AppDrawer
          key={selectedId}
          appId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}

      {/* Add application modal */}
      {showAddModal && (
        <AddAppModal
          onClose={() => { setShowAddModal(false); setScanData(null); }}
          onSaved={load}
          initialData={scanData || {}}
        />
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [page, setPage] = useState("dashboard");

  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;

  return (
    <div style={{ ...styles.page, display: "flex" }}>
      <style>{`
        /* ── Sidebar ── */
        .app-nav-btn { transition: color 0.15s, border-left-color 0.15s, background 0.15s; }
        .app-nav-btn:hover { color: #c4a96b !important; background: rgba(196,169,107,0.05) !important; }
        .app-signout { transition: color 0.15s; }
        .app-signout:hover { color: #c4a96b !important; }

        /* ── Cards ── */
        .app-card-hover { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
        .app-card-hover:hover { border-color: #3a3a3e !important; box-shadow: 0 4px 20px rgba(0,0,0,0.3); transform: translateY(-2px); }

        /* ── Buttons ── */
        .app-btn-primary { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s; }
        .app-btn-primary:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(196,169,107,0.2); }
        .app-btn-secondary { transition: color 0.15s, border-color 0.15s, background 0.15s; }
        .app-btn-secondary:hover:not(:disabled) { color: #c4a96b !important; border-color: #c4a96b !important; }
        .app-btn-sm { transition: color 0.15s, border-color 0.15s; }
        .app-btn-sm:hover { color: #c4a96b !important; border-color: #3a3a3e !important; }

        /* ── Table / list rows ── */
        .app-row-hover { transition: background 0.15s, border-color 0.15s; }
        .app-row-hover:hover { background: #161618 !important; border-color: #3a3a3e !important; }

        /* ── Pipeline bars ── */
        .app-pipeline-row { transition: background 0.15s; border-radius: 3px; }
        .app-pipeline-row:hover { background: rgba(196,169,107,0.06) !important; }

        /* ── Stat cards ── */
        .app-stat-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .app-stat-card:hover { border-color: #3a3a3e !important; box-shadow: 0 0 16px rgba(196,169,107,0.07); }

        /* ── Resume items ── */
        .app-resume-item { transition: border-color 0.2s, background 0.2s; }
        .app-resume-item:hover { border-color: #3a3a3e !important; background: #141416 !important; }

        /* ── Badge keywords / tags ── */
        .app-tag { transition: border-color 0.15s, color 0.15s; }
        .app-tag:hover { border-color: #c4a96b !important; color: #c4a96b !important; }

        /* ── Grade panel items ── */
        .app-grade-row { transition: background 0.15s; }
        .app-grade-row:hover { background: rgba(196,169,107,0.04) !important; }

        /* ── Page fade-in ── */
        @keyframes app-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .app-page { animation: app-fade-in 0.3s ease both; }

        /* ── Toolbar buttons in editor ── */
        .app-tool-btn { transition: color 0.15s, border-color 0.15s, background 0.15s; }
        .app-tool-btn:hover { color: #c4a96b !important; border-color: #c4a96b !important; background: rgba(196,169,107,0.06) !important; }

        /* ── Input / select focus glow ── */
        .app-input:focus { border-color: #c4a96b !important; box-shadow: 0 0 0 2px rgba(196,169,107,0.12) !important; outline: none; }
        textarea.app-input:focus { border-color: #c4a96b !important; box-shadow: 0 0 0 2px rgba(196,169,107,0.12) !important; outline: none; }

        /* ── Tracker columns ── */
        .app-tracker-col { transition: background 0.15s; }
        .app-tracker-col:hover { background: rgba(196,169,107,0.025) !important; }
        .app-tracker-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
        .app-tracker-card:hover { border-color: #3a3a3e !important; box-shadow: 0 4px 16px rgba(0,0,0,0.35); transform: translateY(-2px); }

        /* ── Activity timeline rows ── */
        .app-activity-row { transition: background 0.12s; border-radius: 4px; padding: 4px 6px; }
        .app-activity-row:hover { background: rgba(255,255,255,0.03) !important; }

        /* ── Run history rows ── */
        .app-run-row { transition: border-color 0.15s, background 0.15s; }
        .app-run-row:hover { border-color: #3a3a3e !important; background: #131315 !important; }
      `}</style>
      <Sidebar active={page} setActive={setPage} onBack={() => setShowLanding(true)} />
      <main style={{ flex: 1, overflowY: page === "tracker" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        {page === "dashboard"  && <DashboardPage onNavigate={setPage} />}
        {page === "tracker"    && <TrackerPage onBack={() => setShowLanding(true)} />}
        {page === "gmail"      && <GmailAgentPage />}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GMAIL AGENT PAGE
// ══════════════════════════════════════════════════════════════════════════════

function RunHistory({ agentLog, signalIcon, signalColor }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div style={styles.card}>
      <div style={{ ...styles.eyebrow, marginBottom: "20px" }}>Run history</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {agentLog.map((run, i) => {
          const hasDetails = run.details && run.details.length > 0;
          const isOpen = expanded[i];
          return (
            <div key={i} className="app-run-row" style={{ ...styles.cardSm, padding: "12px 16px" }}>
              {/* Summary row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "13px", color: textPrimary, fontFamily: "sans-serif" }}>
                  {fmtTime(run.ran_at)}
                </div>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif" }}>{run.emails_fetched} fetched</span>
                  <span style={{ fontSize: "12px", color: gold, fontFamily: "sans-serif" }}>{run.job_related} job-related</span>
                  <span style={{ fontSize: "12px", color: "#6bbf6b", fontFamily: "sans-serif" }}>{run.status_updates} updated</span>
                  {hasDetails && (
                    <button
                      onClick={() => toggle(i)}
                      style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", fontSize: "11px", fontFamily: "sans-serif", padding: "0 4px" }}
                    >
                      {isOpen ? "▲ hide" : "▼ details"}
                    </button>
                  )}
                </div>
              </div>
              {/* Sub-stats */}
              {(run.low_confidence > 0 || run.unmatched > 0) && (
                <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                  {run.low_confidence > 0 && <span style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif" }}>{run.low_confidence} skipped (low confidence)</span>}
                  {run.unmatched > 0 && <span style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif" }}>{run.unmatched} unmatched</span>}
                </div>
              )}
              {/* Expandable details */}
              {isOpen && hasDetails && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", borderTop: `1px solid ${border}`, paddingTop: "12px" }}>
                  {run.details.map((d, j) => (
                    <div key={j} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "13px", color: signalColor(d.signal || d.action), flexShrink: 0, marginTop: "1px" }}>
                        {signalIcon(d.signal || d.action)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", color: textPrimary, fontFamily: "sans-serif" }}>
                          {d.subject || "(no subject)"}
                        </div>
                        <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", marginTop: "2px" }}>
                          {d.summary || d.action}
                          {d.status_changed && (
                            <span style={{ marginLeft: "8px" }}>
                              <span style={{ color: STATUS[d.from_status]?.color }}>{d.from_status}</span>
                              {" → "}
                              <span style={{ color: STATUS[d.to_status]?.color }}>{d.to_status}</span>
                            </span>
                          )}
                          {d.action === "unmatched" && <span style={{ marginLeft: "6px", color: "#bf6b6b" }}>no matching application</span>}
                          {d.action === "skipped_low_confidence" && <span style={{ marginLeft: "6px" }}>confidence {Math.round((d.confidence || 0) * 100)}%</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GmailAgentPage() {
  const [gmailStatus, setGmailStatus] = useState(null); // { connected, email }
  const [agentLog, setAgentLog]       = useState([]);
  const [running, setRunning]         = useState(false);
  const [runResult, setRunResult]     = useState(null);
  const [error, setError]             = useState("");
  const [successMsg, setSuccessMsg]   = useState("");
  const [threshold, setThreshold]     = useState(0.65);
  const [maxEmails, setMaxEmails]     = useState(50);
  const [checking, setChecking]       = useState(true);

  useEffect(() => {
    // Handle OAuth redirect params
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      setSuccessMsg("Gmail connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gmail_error")) {
      setError(`Gmail connection failed: ${params.get("gmail_error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Check Gmail connection status
    apiFetch("/gmail/status")
      .then(s => setGmailStatus(s))
      .catch(() => setGmailStatus({ connected: false, email: null }))
      .finally(() => setChecking(false));

    // Load run log
    apiFetch("/gmail/agent/log?limit=10")
      .then(d => setAgentLog(d.runs || []))
      .catch(() => {});
  }, []);

  async function connectGmail() {
    setError("");
    try {
      const data = await apiFetch("/gmail/auth");
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err.message || "Failed to start Gmail connection — check GOOGLE_CLIENT_ID is set");
    }
  }

  async function disconnectGmail() {
    setError(""); setSuccessMsg("");
    try {
      await apiFetch("/gmail/disconnect", { method: "DELETE" });
      setGmailStatus({ connected: false, email: null });
    } catch (err) {
      setError(err.message || "Failed to disconnect Gmail");
    }
  }

  async function runAgent() {
    setRunning(true); setError(""); setRunResult(null); setSuccessMsg("");
    try {
      const result = await apiFetch("/gmail/process", {
        method: "POST",
        body: JSON.stringify({ confidence_threshold: threshold, max_emails: maxEmails }),
      });
      setRunResult(result.results || {
        processed: 0, job_related: 0, status_updates: 0, notes_added: 0, details: [],
      });
      const newLog = await apiFetch("/gmail/agent/log?limit=10");
      setAgentLog(newLog.runs || []);
    } catch (err) {
      setError(err.message || "Agent failed — check Gmail connection");
    } finally {
      setRunning(false);
    }
  }

  async function saveConfig() {
    await apiFetch("/gmail/agent/config", {
      method: "PUT",
      body: JSON.stringify({ enabled: true, confidence_threshold: threshold, max_emails_per_run: maxEmails }),
    }).catch(() => {});
  }

  const signalIcon = (signal) => ({
    interview: "◆", offer: "◈", rejection: "◉", acknowledgement: "◐", noted: "◐",
  }[signal] || "·");

  const signalColor = (signal) => ({
    interview: "#6bbf6b", offer: "#c4a96b", rejection: "#bf6b6b",
    acknowledgement: textMuted, noted: textMuted,
  }[signal] || textMuted);

  const connected = gmailStatus?.connected;

  return (
    <div className="app-page" style={{ padding: "40px 48px", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
  
      <h2 style={{ fontSize: "22px", fontWeight: "400", color: gold, margin: "10px 0 8px" }}>Gmail Agent</h2>
      <p style={{ fontSize: "14px", color: textMuted, fontFamily: "sans-serif", margin: "0 0 4px", lineHeight: "1.7" }}>
        Reads your inbox for job-related emails and automatically updates your application tracker.
        Emails are classified using OpenAI.
      </p>
      <p style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", margin: "0 0 28px", opacity: 0.6 }}>
        Optional feature — requires Gmail connection
      </p>

      {successMsg && (
        <div style={{ ...styles.cardSm, marginBottom: "20px", borderColor: "#1a3a1a" }}>
          <div style={{ color: "#6bbf6b", fontSize: "13px", fontFamily: "sans-serif" }}>{successMsg}</div>
        </div>
      )}
      {error && (
        <div style={{ ...styles.cardSm, marginBottom: "20px", borderColor: "#3a1a1a" }}>
          <div style={{ color: "#bf6b6b", fontSize: "13px", fontFamily: "sans-serif" }}>{error}</div>
        </div>
      )}

      {/* Gmail connection card */}
      <div style={{ ...styles.card, marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={styles.eyebrow}>Gmail connection</div>
          <div style={{ fontSize: "14px", fontFamily: "sans-serif", marginTop: "8px", color: textPrimary }}>
            {checking
              ? "Checking…"
              : connected
                ? <span style={{ color: "#6bbf6b" }}>● Connected — {gmailStatus.email}</span>
                : <span style={{ color: textMuted }}>● Not connected</span>
            }
          </div>
          {!checking && !connected && (
            <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", marginTop: "6px", lineHeight: "1.6" }}>
              Connect your Gmail account to let the agent scan your inbox.
              The rest of the app works fine without it.
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          {!checking && !connected && (
            <button onClick={connectGmail} style={{ ...styles.btn("primary"), whiteSpace: "nowrap" }}>
              Connect Gmail
            </button>
          )}
          {!checking && connected && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={runAgent}
                disabled={running}
                style={{ ...styles.btn("primary"), whiteSpace: "nowrap", opacity: running ? 0.7 : 1 }}
              >
                {running ? "Running…" : "▶ Run agent now"}
              </button>
              <button
                onClick={disconnectGmail}
                style={{ ...styles.btn("secondary"), whiteSpace: "nowrap", fontSize: "12px" }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Run result */}
      {runResult && (
        <div style={{ ...styles.card, marginBottom: "24px", borderColor: "#1a2a1a" }}>
          <div style={{ ...styles.eyebrow, marginBottom: "16px", color: "#6bbf6b" }}>Last run result</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Processed",      val: runResult.processed      || 0, color: textPrimary },
              { label: "Job-related",    val: runResult.job_related     || 0, color: gold },
              { label: "Status updates", val: runResult.status_updates  || 0, color: "#6bbf6b" },
              { label: "Notes added",    val: runResult.notes_added     || 0, color: "#6b8bbf" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...styles.cardSm, padding: "12px 16px" }}>
                <div style={{ fontSize: "10px", color: textMuted, fontFamily: "sans-serif", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "24px", color }}>{val}</div>
              </div>
            ))}
          </div>

          {runResult.details && runResult.details.length > 0 && (
            <div>
              <div style={{ ...styles.eyebrow, marginBottom: "12px" }}>Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {runResult.details.map((d, i) => (
                  <div key={i} style={{ ...styles.cardSm, padding: "12px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "14px", color: signalColor(d.signal || d.action), flexShrink: 0, marginTop: "1px" }}>
                      {signalIcon(d.signal || d.action)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", color: textPrimary, fontFamily: "sans-serif", marginBottom: "2px" }}>
                        {d.subject || "(no subject)"}
                      </div>
                      <div style={{ fontSize: "12px", color: textMuted, fontFamily: "sans-serif", lineHeight: "1.5" }}>
                        {d.summary || d.action}
                        {d.status_changed && (
                          <span style={{ marginLeft: "8px" }}>
                            <span style={{ color: STATUS[d.from_status]?.color }}>{d.from_status}</span>
                            {" → "}
                            <span style={{ color: STATUS[d.to_status]?.color }}>{d.to_status}</span>
                          </span>
                        )}
                        {d.action === "unmatched" && (
                          <span style={{ marginLeft: "8px", color: "#bf6b6b" }}>no matching application found</span>
                        )}
                        {d.action === "skipped_low_confidence" && (
                          <span style={{ marginLeft: "8px", color: textMuted }}>confidence {Math.round((d.confidence || 0) * 100)}% — below threshold</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config */}
      <div style={{ ...styles.card, marginBottom: "24px" }}>
        <div style={{ ...styles.eyebrow, marginBottom: "20px" }}>Agent settings</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <div>
            <label style={styles.label}>Confidence threshold</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range" min="0.4" max="0.95" step="0.05"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: "14px", color: gold, fontFamily: "sans-serif", minWidth: "36px" }}>
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", marginTop: "6px" }}>
              Emails below this confidence are skipped and flagged for manual review
            </div>
          </div>
          <div>
            <label style={styles.label}>Max emails per run</label>
            <select
              value={maxEmails}
              onChange={e => setMaxEmails(parseInt(e.target.value))}
              style={styles.input}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} emails</option>)}
            </select>
            <div style={{ fontSize: "11px", color: textMuted, fontFamily: "sans-serif", marginTop: "6px" }}>
              Emails scanned per run (searches last 7 days)
            </div>
          </div>
        </div>
        <button onClick={saveConfig} style={styles.btn("secondary")}>Save settings</button>
      </div>

      {/* Run log */}
      {agentLog.length > 0 && (
        <RunHistory agentLog={agentLog} signalIcon={signalIcon} signalColor={signalColor} />
      )}

      {agentLog.length === 0 && !runResult && connected && (
        <div style={{ color: textMuted, fontSize: "13px", fontFamily: "sans-serif", lineHeight: "1.8" }}>
          No runs yet. Hit <strong style={{ color: gold }}>Run agent now</strong> to scan your inbox for the first time.
          The agent searches for emails containing keywords like "application", "interview", "offer", or "position"
          from the last 7 days.
        </div>
      )}
    </div>
  );
}
