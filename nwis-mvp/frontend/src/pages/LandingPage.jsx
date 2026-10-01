import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  ArrowRight,
  ChevronDown,
  Layers,
  Activity,
  Brain,
  Database,
  Shield,
  MapPin,
  Cpu,
  Search,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeIntelTab, setActiveIntelTab] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const capabilities = [
    {
      num: "01",
      title: "SIMILAR WELLS",
      tagline: "Geological & Spatial Proximity Matching",
      description:
        "Identify nearby historical wells with matching geological formations, lithology columns, and total depth profiles using spherical PostGIS distance and weighted multi-factor similarity.",
      features: [
        "Configurable geodesic search radius (5km, 10km, 25km)",
        "Multi-factor scoring: 40% spatial, 30% formation overlap, 30% depth profile",
        "Direct offset well correlation across Barail, Tipam, and Surma formations",
      ],
      metrics: [
        { label: "Search Accuracy", value: "99.8%" },
        { label: "Index Engine", value: "PostGIS 3.6" },
        { label: "Offset Horizon", value: "4,200m" },
      ],
    },
    {
      num: "02",
      title: "RISK INTELLIGENCE",
      tagline: "Preemptive Drilling Hazard Classification",
      description:
        "Evaluate mechanical drilling parameters and historical offset behavior using machine learning to detect stuck pipe, mud loss, and high torque hazards before tool damage occurs.",
      features: [
        "Trained multiclass XGBoost inference engine with balanced class weighting",
        "Evaluates ROP, WOB, RPM, Torque, Standpipe Pressure, and Mud Density",
        "Deterministic probability distribution across all operational risk classes",
      ],
      metrics: [
        { label: "Hazard Classes", value: "4 States" },
        { label: "Inference Latency", value: "<15ms" },
        { label: "Model Architecture", value: "XGBoost 3.1" },
      ],
    },
    {
      num: "03",
      title: "HISTORICAL KNOWLEDGE",
      tagline: "Dense Semantic Vector Retrieval",
      description:
        "Search unstructured drilling reports, incident mitigation debriefs, and geological completion summaries using native PostgreSQL pgvector cosine similarity.",
      features: [
        "Native PostgreSQL 18.3 + pgvector 0.8.6 hardware-accelerated cosine distance",
        "384-dimensional dense neural embeddings via Sentence-Transformers",
        "Strictly grounded offset context retrieval with source attribution",
      ],
      metrics: [
        { label: "Embedding Dim", value: "384-D" },
        { label: "Distance Operator", value: "<=> Cosine" },
        { label: "Generation Mode", value: "Zero Hallucination" },
      ],
    },
    {
      num: "04",
      title: "FIELD CONTEXT",
      tagline: "Spatiotemporal Subsurface Awareness",
      description:
        "Contextualize wellbores across multi-well basin coordinates, understanding spatial inter-well relationships, formation boundaries, and structural fault lines.",
      features: [
        "Geodetic coordinate modeling on WGS 84 (SRID 4326) Point geometries",
        "Multi-well trajectory profile modeling and depth-correlated formation zones",
        "Fleet-wide operational status monitoring across exploratory and development fields",
      ],
      metrics: [
        { label: "Spatial Coordinate", value: "EPSG:4326" },
        { label: "Field Boundary", value: "Active OIL Fields" },
        { label: "Topology Engine", value: "GeoAlchemy2" },
      ],
    },
  ];

  return (
    <div className="landing-page-root">
      {/* ============================================================
          TOP NAVIGATION
          ============================================================ */}
      <header className={`landing-nav ${scrolled ? "nav-scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-nav-left" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ cursor: "pointer" }}>
            <div className="landing-brand-mark">
              <Compass size={18} className="brand-compass" />
            </div>
            <div className="landing-brand-text">
              <span className="brand-name">Oil Sentry</span>
              <span className="brand-tag">NEARBY WELLS INTELLIGENCE</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <button onClick={() => scrollToSection("platform")} className="nav-link-btn">
              Platform
            </button>
            <button onClick={() => scrollToSection("intelligence")} className="nav-link-btn">
              Intelligence
            </button>
            <button onClick={() => scrollToSection("technology")} className="nav-link-btn">
              Technology
            </button>
            <button onClick={() => scrollToSection("spatial-field")} className="nav-link-btn">
              Spatial
            </button>
          </nav>

          <div className="landing-nav-right">
            <button
              onClick={() => navigate("/app")}
              className="btn-enter-operations"
              id="cta-nav-enter"
            >
              <span>Enter Operations</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="landing-hero" id="hero">
        <div className="hero-radial-glow" />
        <div className="hero-grid-pattern" />

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              <span>NEARBY WELLS INTELLIGENCE SYSTEM</span>
            </div>

            <h1 className="hero-heading">
              SHOW UP FOR OIL.
              <br />
              <span className="hero-heading-gradient">OIL SHOWS UP</span>
              <br />
              FOR YOU.
            </h1>

            <p className="hero-subtext">
              “Show up for Oil, Oil shows up for You” — AI-powered offset-well intelligence
              and predictive decision support for high-consequence drilling operations across
              Oil India Limited assets.
            </p>

            <div className="hero-actions">
              <button
                onClick={() => navigate("/app")}
                className="btn-hero-primary"
                id="cta-hero-primary"
              >
                <span>ENTER OPERATIONS</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => scrollToSection("intelligence")}
                className="btn-hero-secondary"
                id="cta-hero-explore"
              >
                <span>EXPLORE INTELLIGENCE</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="hero-metrics-strip">
              <div className="strip-item">
                <span className="strip-value font-mono">20</span>
                <span className="strip-label">Calibrated Wells</span>
              </div>
              <div className="strip-sep" />
              <div className="strip-item">
                <span className="strip-value font-mono">86</span>
                <span className="strip-label">Formations Mapped</span>
              </div>
              <div className="strip-sep" />
              <div className="strip-item">
                <span className="strip-value font-mono">3,000+</span>
                <span className="strip-label">Telemetry Logs</span>
              </div>
              <div className="strip-sep" />
              <div className="strip-item">
                <span className="strip-value font-mono">384-D</span>
                <span className="strip-label">Vector RAG</span>
              </div>
            </div>
          </div>

          {/* Subsurface Geological Vector Visualization */}
          <div className="hero-visual-wrapper">
            <div className="subsurface-diagram">
              <div className="diagram-header">
                <div className="diagram-chip">
                  <span className="chip-indicator" />
                  <span>SUBSURFACE PROFILE · FIELD-A / BARAIL HORIZON</span>
                </div>
                <span className="diagram-coord font-mono">26.852° N, 94.621° E</span>
              </div>

              {/* High-fidelity SVG Geological Strata & Trajectory */}
              <svg
                viewBox="0 0 600 480"
                className="subsurface-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Layer Gradients */}
                  <linearGradient id="layer-alluvium" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="layer-girujan" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2c2720" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#1a1815" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="layer-tipam" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#242831" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#151b24" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="layer-surma" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1b242e" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#101821" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="layer-barail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#292015" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#17120b" stopOpacity="0.98" />
                  </linearGradient>
                  {/* Glow Filters */}
                  <filter id="amber-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="soft-blur" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="1.5" />
                  </filter>
                </defs>

                {/* Depth Grid Lines */}
                <g className="grid-lines" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3">
                  <line x1="60" y1="60" x2="580" y2="60" />
                  <line x1="60" y1="140" x2="580" y2="140" />
                  <line x1="60" y1="220" x2="580" y2="220" />
                  <line x1="60" y1="310" x2="580" y2="310" />
                  <line x1="60" y1="410" x2="580" y2="410" />
                </g>

                {/* Depth Labels */}
                <g className="depth-labels" fill="#64748b" fontSize="10" fontFamily="monospace">
                  <text x="15" y="64">0m</text>
                  <text x="15" y="144">-1000m</text>
                  <text x="15" y="224">-2000m</text>
                  <text x="15" y="314">-3000m</text>
                  <text x="15" y="414">-4000m</text>
                </g>

                {/* Geological Formation Strata Bands */}
                <path
                  d="M 60,60 Q 250,55 580,68 L 580,140 Q 320,130 60,140 Z"
                  fill="url(#layer-alluvium)"
                  stroke="rgba(255,255,255,0.08)"
                />
                <path
                  d="M 60,140 Q 320,130 580,140 L 580,220 Q 350,230 60,220 Z"
                  fill="url(#layer-girujan)"
                  stroke="rgba(212,151,59,0.12)"
                />
                <path
                  d="M 60,220 Q 350,230 580,220 L 580,310 Q 280,300 60,310 Z"
                  fill="url(#layer-tipam)"
                  stroke="rgba(255,255,255,0.08)"
                />
                <path
                  d="M 60,310 Q 280,300 580,310 L 580,410 Q 330,420 60,410 Z"
                  fill="url(#layer-surma)"
                  stroke="rgba(255,255,255,0.06)"
                />
                <path
                  d="M 60,410 Q 330,420 580,410 L 580,470 L 60,470 Z"
                  fill="url(#layer-barail)"
                  stroke="rgba(212,151,59,0.2)"
                />

                {/* Lithology Tags */}
                <g fontSize="10" fontWeight="600" letterSpacing="0.08em" textAnchor="end">
                  <text x="560" y="105" fill="#94a3b8">ALLUVIUM</text>
                  <text x="560" y="185" fill="#d4973b">GIRUJAN CLAY</text>
                  <text x="560" y="270" fill="#94a3b8">TIPAM SANDSTONE</text>
                  <text x="560" y="365" fill="#64748b">SURMA SHALE</text>
                  <text x="560" y="445" fill="#f59e0b">BARAIL COAL / RESERVOIR</text>
                </g>

                {/* Offset Well W002 (Passive Gray Trajectory) */}
                <path
                  d="M 170,60 Q 170,200 130,340 T 110,420"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx="170" cy="60" r="4" fill="#64748b" />
                <text x="170" y="48" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  W002
                </text>
                <circle cx="110" cy="420" r="3" fill="#64748b" />
                <text x="95" y="423" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                  TD 3,850m
                </text>

                {/* Offset Well W005 (Historical Incident Marker) */}
                <path
                  d="M 430,60 Q 440,190 470,300 T 490,390"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx="430" cy="60" r="4" fill="#64748b" />
                <text x="430" y="48" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  W005
                </text>
                {/* Historical Event Pulse on W005 */}
                <circle cx="478" cy="328" r="7" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="478" cy="328" r="2.5" fill="#f59e0b" />
                <text x="492" y="331" fill="#f59e0b" fontSize="9" fontWeight="600" fontFamily="monospace">
                  Mud Loss (3,280m)
                </text>

                {/* Target Well W001 Active Trajectory (Luminous Petroleum Amber) */}
                <path
                  d="M 300,60 Q 300,160 320,260 T 360,400"
                  fill="none"
                  stroke="#d4973b"
                  strokeWidth="3.5"
                  filter="url(#amber-glow)"
                />
                <circle cx="300" cy="60" r="5" fill="#d4973b" stroke="#ffffff" strokeWidth="1.5" />
                <text x="300" y="46" fill="#f5f7fa" fontSize="11" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                  W001 (ACTIVE)
                </text>

                {/* Active Bit Indicator with Animated Pulse */}
                <circle cx="360" cy="400" r="10" fill="none" stroke="#e5a940" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="8;16;8" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="360" cy="400" r="4" fill="#ffffff" />
                <text x="375" y="404" fill="#e5a940" fontSize="10" fontWeight="700" fontFamily="monospace">
                  BIT DEPTH: 3,420m
                </text>

                {/* Spatial Proximity Connector (PostGIS Radius Line) */}
                <line
                  x1="320"
                  y1="260"
                  x2="455"
                  y2="245"
                  stroke="rgba(212,151,59,0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                />
                <rect x="360" y="240" width="85" height="18" rx="4" fill="#0f172a" stroke="rgba(212,151,59,0.4)" strokeWidth="1" />
                <text x="402" y="253" fill="#e5a940" fontSize="9" fontWeight="600" fontFamily="monospace" textAnchor="middle">
                  Δ 1.84 km · 94% Sim
                </text>
              </svg>

              <div className="diagram-footer">
                <div className="diagram-stat">
                  <span className="stat-name">Active Formation</span>
                  <span className="stat-val font-mono">Tipam Sandstone</span>
                </div>
                <div className="diagram-stat">
                  <span className="stat-name">Offset Reference</span>
                  <span className="stat-val font-mono">W002, W005 (Field-A)</span>
                </div>
                <div className="diagram-stat">
                  <span className="stat-name">Predicted Risk State</span>
                  <span className="stat-val font-mono" style={{ color: "var(--status-normal)" }}>NORMAL (0.72)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TAGLINE SECTION — MAJOR VISUAL MOMENT
          ============================================================ */}
      <section className="landing-tagline-section" id="tagline">
        <div className="tagline-ambient-glow" />

        <div className="tagline-container">
          <div className="tagline-line-graphic">
            <div className="trajectory-line-top" />
            <div className="trajectory-sensor-node">
              <span className="node-ring" />
              <span className="node-center" />
            </div>
            <div className="trajectory-line-bottom" />
          </div>

          <div className="tagline-text-block">
            <span className="tagline-micro-eyebrow">PREEMPTIVE SUBSURFACE INTELLIGENCE</span>

            <h2 className="tagline-phrase-1">
              KNOW THE WELL.
            </h2>

            <div className="tagline-connector-trace">
              <div className="connector-bar" />
            </div>

            <h2 className="tagline-phrase-2">
              Before the well knows you.
            </h2>

            <div className="tagline-quote-container">
              <div className="quote-pill">
                <span className="quote-icon font-mono">“</span>
                <span className="quote-exact">Know the Well. Before the Well Knows You.</span>
                <span className="quote-icon font-mono">”</span>
              </div>
              <span className="quote-attribution">
                Oil Sentry · Nearby Wells Intelligence System · Offset-Well Predictive Precision
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STORY SECTION — THE PROBLEM
          ============================================================ */}
      <section className="landing-story-section" id="platform">
        <div className="story-container">
          <div className="story-header-block">
            <span className="section-label">SUB-SURFACE REALITY</span>
            <h2 className="story-heading">Every well leaves a story.</h2>
            <p className="story-lead">
              Historical wells contain valuable drilling knowledge: formations, events,
              operational behavior, mitigation and outcomes.
              <br />
              <span className="story-highlight">But that knowledge is often fragmented.</span>
            </p>
          </div>

          {/* Visual Transformation Diagram: Well → History → Patterns */}
          <div className="pipeline-flow-composition">
            <div className="pipeline-step-card">
              <div className="step-badge">
                <span className="step-num">01</span>
                <span className="step-title">WELL</span>
              </div>
              <div className="step-visual">
                <div className="isolated-well-graphic">
                  <div className="well-derrick-icon">
                    <Layers size={32} className="text-secondary" />
                  </div>
                  <div className="well-strata-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
              <h3 className="step-name">Isolated Assets</h3>
              <p className="step-desc">
                Daily drilling logs, mud circulation records, and physical casing tallies stored
                in siloed completion reports across decades of exploration.
              </p>
              <div className="step-meta font-mono">20 Field Assets · Heterogeneous Logs</div>
            </div>

            <div className="pipeline-connector-arrow">
              <div className="arrow-line" />
              <ArrowRight size={20} className="arrow-glyph" />
            </div>

            <div className="pipeline-step-card">
              <div className="step-badge">
                <span className="step-num">02</span>
                <span className="step-title">HISTORY</span>
              </div>
              <div className="step-visual">
                <div className="isolated-well-graphic">
                  <div className="well-derrick-icon">
                    <Database size={32} className="text-amber" />
                  </div>
                  <div className="well-strata-lines">
                    <span style={{ width: "80%" }} />
                    <span style={{ width: "95%" }} />
                    <span style={{ width: "65%" }} />
                  </div>
                </div>
              </div>
              <h3 className="step-name">Unified Memory</h3>
              <p className="step-desc">
                PostGIS spatial indexing, 86 correlated geological formations, and 43 categorized
                drilling incident narratives indexed with native pgvector cosine distances.
              </p>
              <div className="step-meta font-mono">PostgreSQL 18.3 · PostGIS 3.6 · pgvector</div>
            </div>

            <div className="pipeline-connector-arrow">
              <div className="arrow-line" />
              <ArrowRight size={20} className="arrow-glyph" />
            </div>

            <div className="pipeline-step-card active-card">
              <div className="step-badge highlight">
                <span className="step-num">03</span>
                <span className="step-title">PATTERNS</span>
              </div>
              <div className="step-visual">
                <div className="isolated-well-graphic">
                  <div className="well-derrick-icon">
                    <Brain size={32} style={{ color: "var(--accent-amber)" }} />
                  </div>
                  <div className="well-strata-lines">
                    <span style={{ background: "var(--accent-amber)", width: "100%" }} />
                    <span style={{ background: "var(--status-normal)", width: "85%" }} />
                    <span style={{ background: "var(--accent-amber-hover)", width: "90%" }} />
                  </div>
                </div>
              </div>
              <h3 className="step-name">Predictive Decision</h3>
              <p className="step-desc">
                Instantaneous offset-well correlation, XGBoost real-time hazard probabilities,
                and contextual operational mitigation before bit engagement.
              </p>
              <div className="step-meta font-mono" style={{ color: "var(--accent-amber)" }}>
                XGBoost ML · RAG Synthesis · Decision Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          INTELLIGENCE SECTION — 4 LARGE HORIZONTAL CAPABILITY BLOCKS
          ============================================================ */}
      <section className="landing-intelligence-section" id="intelligence">
        <div className="intel-container">
          <div className="intel-header">
            <span className="section-label">ENGINEERING CAPABILITIES</span>
            <h2 className="section-heading">
              From historical wells
              <br />
              to actionable intelligence.
            </h2>
            <p className="section-desc">
              Four specialized subsurface intelligence modules operating cooperatively to
              protect drilling assemblies and shorten the learning curve on every new spud.
            </p>
          </div>

          <div className="intel-blocks-stack">
            {capabilities.map((cap, idx) => (
              <div key={cap.num} className="intel-block-row">
                <div className="intel-block-left">
                  <div className="block-number-badge font-mono">{cap.num}</div>
                  <h3 className="block-title">{cap.title}</h3>
                  <div className="block-tagline">{cap.tagline}</div>
                  <p className="block-description">{cap.description}</p>

                  <ul className="block-features">
                    {cap.features.map((feat, fIdx) => (
                      <li key={fIdx}>
                        <CheckCircle2 size={16} className="feature-check" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="block-metrics-grid">
                    {cap.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="block-metric-item">
                        <span className="m-val font-mono">{m.value}</span>
                        <span className="m-label">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="intel-block-right">
                  {idx === 0 && (
                    <div className="capability-preview-box">
                      <div className="preview-top">
                        <span className="preview-title">SPATIAL & OFFSET SIMILARITY ENGINE</span>
                        <span className="preview-badge font-mono">10 KM RADIUS</span>
                      </div>
                      <div className="offset-comparison-list">
                        <div className="offset-row active-offset">
                          <div className="offset-id">
                            <span className="offset-dot normal" />
                            <strong>W002</strong>
                            <span className="field-tag">Field-A</span>
                          </div>
                          <div className="offset-progress">
                            <div className="progress-bar" style={{ width: "94%" }} />
                          </div>
                          <div className="offset-score font-mono">94.2% SIMILAR</div>
                        </div>

                        <div className="offset-row">
                          <div className="offset-id">
                            <span className="offset-dot loss" />
                            <strong>W005</strong>
                            <span className="field-tag">Field-A</span>
                          </div>
                          <div className="offset-progress">
                            <div className="progress-bar" style={{ width: "88%" }} />
                          </div>
                          <div className="offset-score font-mono">88.5% SIMILAR</div>
                        </div>

                        <div className="offset-row">
                          <div className="offset-id">
                            <span className="offset-dot" />
                            <strong>W012</strong>
                            <span className="field-tag">Field-B</span>
                          </div>
                          <div className="offset-progress">
                            <div className="progress-bar" style={{ width: "79%" }} />
                          </div>
                          <div className="offset-score font-mono">79.1% SIMILAR</div>
                        </div>
                      </div>
                      <div className="preview-footer-note font-mono">
                        WEIGHTS: 40% Geodesic Spatial · 30% Formation Col · 30% Depth Overlap
                      </div>
                    </div>
                  )}

                  {idx === 1 && (
                    <div className="capability-preview-box">
                      <div className="preview-top">
                        <span className="preview-title">MULTICLASS DRILLING HAZARD MONITOR</span>
                        <span className="preview-badge font-mono">XGBOOST MULTI:SOFTPROB</span>
                      </div>
                      <div className="risk-bars-demo">
                        <div className="risk-prob-bar">
                          <div className="prob-label-row">
                            <span>NORMAL DRILLING</span>
                            <span className="font-mono">72.4%</span>
                          </div>
                          <div className="prob-track">
                            <div className="prob-fill normal" style={{ width: "72.4%" }} />
                          </div>
                        </div>

                        <div className="risk-prob-bar">
                          <div className="prob-label-row">
                            <span>MUD LOSS HAZARD</span>
                            <span className="font-mono">16.1%</span>
                          </div>
                          <div className="prob-track">
                            <div className="prob-fill loss" style={{ width: "16.1%" }} />
                          </div>
                        </div>

                        <div className="risk-prob-bar">
                          <div className="prob-label-row">
                            <span>HIGH TORQUE / DRAG</span>
                            <span className="font-mono">8.3%</span>
                          </div>
                          <div className="prob-track">
                            <div className="prob-fill torque" style={{ width: "8.3%" }} />
                          </div>
                        </div>

                        <div className="risk-prob-bar">
                          <div className="prob-label-row">
                            <span>STUCK PIPE CRITICAL</span>
                            <span className="font-mono">3.2%</span>
                          </div>
                          <div className="prob-track">
                            <div className="prob-fill stuck" style={{ width: "3.2%" }} />
                          </div>
                        </div>
                      </div>
                      <div className="preview-footer-note font-mono">
                        FEATURES: Depth, ROP, WOB, RPM, Torque, Standpipe Pressure, Mud Density
                      </div>
                    </div>
                  )}

                  {idx === 2 && (
                    <div className="capability-preview-box">
                      <div className="preview-top">
                        <span className="preview-title">GROUNDED HISTORICAL RAG RETRIEVAL</span>
                        <span className="preview-badge font-mono">PGVECTOR 0.8.6</span>
                      </div>
                      <div className="rag-preview-card">
                        <div className="rag-query-line">
                          <Search size={14} className="text-amber" />
                          <span className="query-text font-mono">
                            “What mitigation was applied for stuck pipe in Tipam Sandstone?”
                          </span>
                        </div>
                        <div className="rag-source-result">
                          <div className="source-header">
                            <span className="source-doc">DOC: W001_drilling_report.pdf · Chunk 1</span>
                            <span className="source-sim font-mono">Cosine Sim: 0.824</span>
                          </div>
                          <p className="source-excerpt">
                            “At 3,410m in Tipam Sandstone, high differential sticking occurred.
                            Circulation maintained with low-viscosity pill, 1.25 SG mud, and jar
                            impact at 60 klbs upward tension. Assembly freed after 3.2 hours.”
                          </p>
                        </div>
                      </div>
                      <div className="preview-footer-note font-mono">
                        GENERATION STATE: Grounded Sources Active · LLM Provider Optional
                      </div>
                    </div>
                  )}

                  {idx === 3 && (
                    <div className="capability-preview-box">
                      <div className="preview-top">
                        <span className="preview-title">SPATIAL BASIN TOPOLOGY</span>
                        <span className="preview-badge font-mono">POSTGIS ST_DISTANCESPHERE</span>
                      </div>
                      <div className="spatial-radar-preview">
                        <div className="radar-grid">
                          <div className="radar-circle c-1" />
                          <div className="radar-circle c-2" />
                          <div className="radar-axis axis-h" />
                          <div className="radar-axis axis-v" />
                          <div className="radar-point center-point" title="Target Well W001" />
                          <div className="radar-point offset-1" title="W002 (1.8km)" />
                          <div className="radar-point offset-2" title="W005 (3.4km)" />
                          <div className="radar-point offset-3" title="W008 (7.1km)" />
                        </div>
                        <div className="radar-labels">
                          <span className="label-center">W001 (Datum)</span>
                          <span className="label-r1">5 km Radius</span>
                          <span className="label-r2">10 km Radius</span>
                        </div>
                      </div>
                      <div className="preview-footer-note font-mono">
                        GEOMETRY: EPSG:4326 Geodetic · Subsurface Horizon Trajectories
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          TECHNOLOGY ARCHITECTURE SECTION
          ============================================================ */}
      <section className="landing-tech-section" id="technology">
        <div className="tech-container">
          <div className="tech-header">
            <span className="section-label">SYSTEM ARCHITECTURE</span>
            <h2 className="section-heading">Engineered for Subsurface Precision</h2>
            <p className="section-desc">
              A high-reliability, zero-latency pipeline connecting physical well telemetry and
              relational spatial records to machine learning inference.
            </p>
          </div>

          {/* Visual Architecture Flow: DATA -> SPATIAL -> ML -> RAG -> DECISION */}
          <div className="tech-flow-stack">
            <div className="tech-tier-card">
              <div className="tier-tag">TIER 01 · PERSISTENCE & SCHEMAS</div>
              <div className="tier-main">
                <div className="tier-title-group">
                  <Database size={22} className="tier-icon" />
                  <div>
                    <h4 className="tier-name">DATA</h4>
                    <span className="tier-sub">PostgreSQL 18.3 Relational Foundation</span>
                  </div>
                </div>
                <div className="tier-chips">
                  <span className="tech-spec-chip">SQLAlchemy 2.0</span>
                  <span className="tech-spec-chip">20 Normalized Wells</span>
                  <span className="tech-spec-chip">86 Formations</span>
                  <span className="tech-spec-chip">3,000 Drilling Logs</span>
                  <span className="tech-spec-chip">43 Incident Records</span>
                </div>
              </div>
            </div>

            <div className="tech-flow-connector">
              <span className="connector-dot" />
              <span className="connector-label">SPATIAL INDEXING</span>
              <span className="connector-line" />
            </div>

            <div className="tech-tier-card">
              <div className="tier-tag">TIER 02 · GEODETIC TOPOLOGY</div>
              <div className="tier-main">
                <div className="tier-title-group">
                  <MapPin size={22} className="tier-icon" />
                  <div>
                    <h4 className="tier-name">SPATIAL INTELLIGENCE</h4>
                    <span className="tier-sub">PostGIS 3.6 Geodesic Proximity Engine</span>
                  </div>
                </div>
                <div className="tier-chips">
                  <span className="tech-spec-chip">ST_DistanceSphere</span>
                  <span className="tech-spec-chip">SRID 4326 Points</span>
                  <span className="tech-spec-chip">Formation Overlap Logic</span>
                  <span className="tech-spec-chip">Radius Bounding</span>
                </div>
              </div>
            </div>

            <div className="tech-flow-connector">
              <span className="connector-dot" />
              <span className="connector-label">PARAMETER STREAM</span>
              <span className="connector-line" />
            </div>

            <div className="tech-tier-card">
              <div className="tier-tag">TIER 03 · STATISTICAL INFERENCE</div>
              <div className="tier-main">
                <div className="tier-title-group">
                  <Cpu size={22} className="tier-icon" />
                  <div>
                    <h4 className="tier-name">MACHINE LEARNING</h4>
                    <span className="tier-sub">XGBoost 3.1 Multiclass Hazard Classifier</span>
                  </div>
                </div>
                <div className="tier-chips">
                  <span className="tech-spec-chip">multi:softprob</span>
                  <span className="tech-spec-chip">GroupShuffleSplit by Well</span>
                  <span className="tech-spec-chip">Balanced Class Weights</span>
                  <span className="tech-spec-chip">7 Drilling Features</span>
                </div>
              </div>
            </div>

            <div className="tech-flow-connector">
              <span className="connector-dot" />
              <span className="connector-label">SEMANTIC CORRELATION</span>
              <span className="connector-line" />
            </div>

            <div className="tech-tier-card">
              <div className="tier-tag">TIER 04 · EMBEDDING RETRIEVAL</div>
              <div className="tier-main">
                <div className="tier-title-group">
                  <Brain size={22} className="tier-icon" />
                  <div>
                    <h4 className="tier-name">HISTORICAL KNOWLEDGE</h4>
                    <span className="tier-sub">Native PostgreSQL pgvector 0.8.6 Vector Space</span>
                  </div>
                </div>
                <div className="tier-chips">
                  <span className="tech-spec-chip">Native vector(384)</span>
                  <span className="tech-spec-chip">all-MiniLM-L6-v2</span>
                  <span className="tech-spec-chip">Cosine Distance &lt;=&gt;</span>
                  <span className="tech-spec-chip">Grounded Mitigation RAG</span>
                </div>
              </div>
            </div>

            <div className="tech-flow-connector">
              <span className="connector-dot" />
              <span className="connector-label">UNIFIED ORCHESTRATION</span>
              <span className="connector-line" />
            </div>

            <div className="tech-tier-card active-tier">
              <div className="tier-tag highlight">TIER 05 · OPERATIONAL DELIVERY</div>
              <div className="tier-main">
                <div className="tier-title-group">
                  <Shield size={22} className="tier-icon highlight" />
                  <div>
                    <h4 className="tier-name">DRILLING DECISION SUPPORT</h4>
                    <span className="tier-sub">FastAPI Orchestrator + React High-Performance UI</span>
                  </div>
                </div>
                <div className="tier-chips">
                  <span className="tech-spec-chip highlight">FastAPI 0.115 Async Gateway</span>
                  <span className="tech-spec-chip highlight">React 18 + Vite</span>
                  <span className="tech-spec-chip highlight">Modular Intelligence Endpoint</span>
                  <span className="tech-spec-chip highlight">Unified Engineering Dossiers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FIELD VISUALIZATION SECTION
          ============================================================ */}
      <section className="landing-field-section" id="spatial-field">
        <div className="field-container">
          <div className="field-header">
            <span className="section-label">SPATIAL INTELLIGENCE</span>
            <h2 className="section-heading">Basin-Scale Subsurface Correlation</h2>
            <p className="section-desc">
              Multiple trajectories plotted in true spatial coordination with geological horizons,
              revealing inter-well proximity and fault boundary hazards.
            </p>
          </div>

          <div className="field-visualization-canvas">
            <div className="canvas-header-bar">
              <div className="bar-left">
                <span className="bar-title">UPPER ASSAM BASIN · MULTI-WELL DRILLING COMPLEX</span>
                <span className="bar-status font-mono">COORDINATES: WGS 84</span>
              </div>
              <div className="bar-right font-mono">
                <span>POSTGIS SPATIAL PROJECTION ACTIVE</span>
              </div>
            </div>

            <div className="field-perspective-diagram">
              <svg viewBox="0 0 900 420" className="field-svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="field-bg-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e1520" />
                    <stop offset="100%" stopColor="#070a0e" />
                  </linearGradient>
                  <linearGradient id="horizon-barail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(212,151,59,0.15)" />
                    <stop offset="50%" stopColor="rgba(212,151,59,0.3)" />
                    <stop offset="100%" stopColor="rgba(212,151,59,0.15)" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width="900" height="420" fill="url(#field-bg-grad)" rx="12" />

                {/* Perspective Spatial Grid */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                  <line x1="50" y1="120" x2="850" y2="120" />
                  <line x1="70" y1="200" x2="830" y2="200" />
                  <line x1="90" y1="290" x2="810" y2="290" />
                  <line x1="120" y1="380" x2="780" y2="380" />

                  <line x1="150" y1="60" x2="120" y2="400" />
                  <line x1="300" y1="60" x2="280" y2="400" />
                  <line x1="450" y1="60" x2="450" y2="400" />
                  <line x1="600" y1="60" x2="620" y2="400" />
                  <line x1="750" y1="60" x2="780" y2="400" />
                </g>

                {/* Target Formation Horizon Plane (Barail Layer in 3D perspective) */}
                <polygon
                  points="140,240 760,240 820,320 80,320"
                  fill="url(#horizon-barail)"
                  stroke="rgba(212,151,59,0.4)"
                  strokeWidth="1.5"
                />
                <text x="450" y="275" fill="#e5a940" fontSize="12" fontWeight="700" letterSpacing="0.1em" textAnchor="middle">
                  TARGET RESERVOIR HORIZON · BARAIL SERIES (-3,200m to -3,800m)
                </text>

                {/* Offset Well Trajectories */}
                {/* W003 */}
                <path d="M 220,90 Q 220,180 200,260 T 180,350" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="220" cy="90" r="5" fill="#475569" />
                <text x="220" y="78" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">W003 (Producing)</text>

                {/* W002 */}
                <path d="M 360,80 Q 370,190 350,270 T 330,360" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="360" cy="80" r="5" fill="#475569" />
                <text x="360" y="68" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">W002 (Offset)</text>

                {/* W001 Active Center Well */}
                <path d="M 480,70 Q 485,170 510,250 T 540,365" fill="none" stroke="#d4973b" strokeWidth="3.5" filter="drop-shadow(0 0 8px rgba(212,151,59,0.5))" />
                <circle cx="480" cy="70" r="6" fill="#d4973b" stroke="#ffffff" strokeWidth="2" />
                <text x="480" y="56" fill="#f5f7fa" fontSize="12" fontWeight="700" fontFamily="monospace" textAnchor="middle">W001 (ACTIVE DRILLING)</text>
                <circle cx="540" cy="365" r="5" fill="#ffffff" />
                <text x="555" y="370" fill="#e5a940" fontSize="11" fontWeight="700" fontFamily="monospace">Bit: 3,420m</text>

                {/* W005 High Risk Offset */}
                <path d="M 670,85 Q 660,180 690,265 T 720,355" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="670" cy="85" r="5" fill="#475569" />
                <text x="670" y="73" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">W005 (Historical Mud Loss)</text>
                <circle cx="698" cy="285" r="6" fill="#f59e0b" />

                {/* Spatial Proximity Radii Vectors */}
                <line x1="480" y1="70" x2="360" y2="80" stroke="rgba(212,151,59,0.4)" strokeWidth="1.5" strokeDasharray="2 2" />
                <line x1="480" y1="70" x2="670" y2="85" stroke="rgba(212,151,59,0.4)" strokeWidth="1.5" strokeDasharray="2 2" />

                <rect x="390" y="60" width="60" height="16" rx="3" fill="#0d141e" stroke="rgba(212,151,59,0.3)" />
                <text x="420" y="72" fill="#d4973b" fontSize="9" fontFamily="monospace" textAnchor="middle">1.84 km</text>

                <rect x="545" y="65" width="60" height="16" rx="3" fill="#0d141e" stroke="rgba(212,151,59,0.3)" />
                <text x="575" y="77" fill="#d4973b" fontSize="9" fontFamily="monospace" textAnchor="middle">3.41 km</text>
              </svg>
            </div>

            <div className="canvas-footer-bar">
              <div className="bar-tag">
                <span className="dot active" />
                <span>20 Calibrated Wellbores</span>
              </div>
              <div className="bar-tag">
                <span className="dot" />
                <span>Geological Formations Correlated (Barail, Tipam, Surma, Girujan)</span>
              </div>
              <div className="bar-tag">
                <span className="dot" />
                <span>Interactive GIS Mapping Scheduled for Dedicated Maps Phase</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CALL TO ACTION
          ============================================================ */}
      <section className="landing-closing-cta">
        <div className="closing-radial-glow" />

        <div className="closing-container">
          <span className="closing-eyebrow">OILFIELD INTELLIGENCE AT SCALE</span>

          <h2 className="closing-heading">
            THE NEXT WELL
            <br />
            DOESN'T START WITH
            <br />
            <span className="closing-heading-gold">A DRILL BIT.</span>
          </h2>

          <p className="closing-sub">
            It starts with what we already know.
          </p>

          <div className="closing-action">
            <button
              onClick={() => navigate("/app")}
              className="btn-enter-nwis"
              id="cta-closing-enter"
            >
              <span>ENTER OIL SENTRY OPERATIONS</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="closing-footnote font-mono">
            OIL SENTRY · SIH 2026 PS121 · OIL INDIA LIMITED
          </div>
        </div>
      </section>

      {/* ============================================================
          MINIMAL FOOTER
          ============================================================ */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="footer-brand">
              <Compass size={16} className="text-amber" />
              <span className="footer-name">Oil Sentry</span>
            </div>
            <p className="footer-tagline">
              Nearby Wells Intelligence System
            </p>
            <div className="footer-meta font-mono">
              SIH 2026 · PS121 · Oil India Limited
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <span className="col-title">PLATFORM</span>
              <button onClick={() => navigate("/app")} className="footer-link-btn">
                Operations Overview
              </button>
              <button onClick={() => navigate("/app/wells")} className="footer-link-btn">
                Wells Registry
              </button>
              <button onClick={() => navigate("/app/live")} className="footer-link-btn">
                Live Operations
              </button>
            </div>

            <div className="footer-col">
              <span className="col-title">INTELLIGENCE</span>
              <button onClick={() => navigate("/app/intelligence")} className="footer-link-btn">
                RAG Knowledge Center
              </button>
              <button onClick={() => navigate("/app/events")} className="footer-link-btn">
                Historical Incidents
              </button>
              <button onClick={() => navigate("/app/reports")} className="footer-link-btn">
                Intelligence Dossiers
              </button>
            </div>

            <div className="footer-col">
              <span className="col-title">ENGINEERING</span>
              <button onClick={() => navigate("/app/system")} className="footer-link-btn">
                System Topology
              </button>
              <span className="footer-static font-mono">PostgreSQL 18.3</span>
              <span className="footer-static font-mono">pgvector 0.8.6</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <span className="copyright">
              Oil Sentry © 2026. Built for Oil India Limited Subsurface Operations.
            </span>
            <div className="footer-status-indicator">
              <span className="status-dot" />
              <span className="font-mono">INTELLIGENCE SERVICES OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
