import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Users,
  Mic,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Quote,
  Activity,
  Flame,
  Award,
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onDemoLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onDemoLogin }) => {
  const [activePersonality, setActivePersonality] = useState<number>(0);

  const personalities = [
    {
      name: 'Vikram Malhotra',
      role: 'The Dominator',
      desc: 'Assertive, rapid-fire arguments. Trains you to stand your ground and politely reclaim speaking time without losing composure.',
      sample: 'Let me jump in right here. The real roadblock is never tech infrastructure—it is managerial paralysis.',
      badge: 'High Pressure',
    },
    {
      name: 'Priya Sharma',
      role: 'The Data-Driven Thinker',
      desc: 'Methodical, fact-focused. Challenges emotional statements and demands concrete reasoning.',
      sample: 'If we look at placement hiring statistics across Tier-1 colleges, practical project exposure consistently outweighs GPA.',
      badge: 'Analytical',
    },
    {
      name: 'Ananya Roy',
      role: 'The Creative Thinker',
      desc: 'Unconventional angles, lateral thinking. Connects disparate threads to synthesize novel perspectives.',
      sample: 'What if we view the discussion not as binary opposition, but as a transitional continuum?',
      badge: 'Synthesizer',
    },
    {
      name: 'Kabir Patel',
      role: 'The Quiet Contributor',
      desc: 'Speaks selectively with high impact. Helps you practice drawing in quiet candidates and demonstrating leadership.',
      sample: 'I agree with the core premise, but we should not overlook the regional accessibility gap.',
      badge: 'Strategic',
    },
  ];

  return (
    <div className="arena-root-frame">
      {/* Upper Editorial Canvas */}
      <div className="arena-canvas">
        {/* Sticky Floating Nav */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'rgba(237, 233, 223, 0.88)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Brand Logo Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: '#ffffff',
              border: '1px solid #dcd8cc',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: '#233a2d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={13} color="#fff" />
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#121e17',
              }}
            >
              gd arena.
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                marginLeft: '2px',
              }}
            />
          </div>

          {/* Action Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onDemoLogin}
              className="arena-btn arena-btn--brand"
              style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              Log in
            </button>
            <button
              onClick={onStart}
              className="arena-btn arena-btn--white"
              style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              Sign up
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            padding: '5rem 1.5rem 6.5rem',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Circuit Interconnect Chips & Routing (Background Aesthetics) */}
          <div
            style={{
              position: 'absolute',
              top: '12%',
              left: '4%',
              opacity: 0.9,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              pointerEvents: 'none',
            }}
            className="hidden md:flex"
          >
            <div className="arena-node-chip">
              <Bot size={13} color="#233a2d" /> Vikram · Dominator
            </div>
            <div className="arena-node-chip" style={{ marginLeft: '24px' }}>
              <Activity size={13} color="#10b981" /> Voice Activity Detection
            </div>
            <div className="arena-node-chip">
              <Quote size={13} color="#d97706" /> Verbatim Quote Proof
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '12%',
              right: '4%',
              opacity: 0.9,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              pointerEvents: 'none',
            }}
            className="hidden md:flex"
          >
            <div className="arena-node-chip">
              <Bot size={13} color="#233a2d" /> Priya · Data Thinker
            </div>
            <div className="arena-node-chip" style={{ marginRight: '20px' }}>
              <Zap size={13} color="#d97706" /> Sub-Second Barge-In
            </div>
            <div className="arena-node-chip">
              <Users size={13} color="#233a2d" /> LiveKit Human Rooms
            </div>
          </div>

          <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
            {/* Top Pill Status */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: '#e2ded4',
                border: '1px solid #d0cbc0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                marginBottom: '1.75rem',
              }}
            >
              <span style={{ fontSize: '12px', color: '#5a6860', fontWeight: 500 }}>
                Trusted by
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  background: '#f97316',
                  color: '#fff',
                }}
              >
                <CheckCircle2 size={12} />
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#121e17' }}>
                12,000+ placement candidates
              </span>
            </div>

            {/* Main Editorial Headline */}
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 6vw, 4.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.06,
                color: '#121e17',
                marginBottom: '1.35rem',
              }}
            >
              Ace the GD
              <br />
              in a single{' '}
              <span
                style={{
                  fontWeight: 900,
                  color: '#121e17',
                }}
              >
                afternoon
              </span>
            </h1>

            {/* Subheading */}
            <p
              style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
                color: '#5a6860',
                lineHeight: 1.55,
                maxWidth: '640px',
                margin: '0 auto 2.25rem',
              }}
            >
              Simulate high-stakes campus placement discussions with 3–5 realistic AI participants.
              Live microphone voice, natural turn-taking, instant barge-in, and evidence-grounded
              feedback reports.
            </p>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '3rem',
              }}
            >
              <button
                onClick={onStart}
                className="arena-btn arena-btn--brand"
                style={{ height: '48px', padding: '0 26px', fontSize: '15px' }}
              >
                Start Practising <ArrowRight size={16} />
              </button>
              <button
                onClick={onDemoLogin}
                className="arena-btn arena-btn--white"
                style={{ height: '48px', padding: '0 22px', fontSize: '15px' }}
              >
                Explore Demo Mode
              </button>
            </div>

            {/* 3D Voice Disc Centerpiece */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                marginTop: '1rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#e2ded4',
                  border: '1px solid #d0cbc0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#18261e',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                  }}
                />
                AI Voice Engine · Live VAD
              </div>

              <div className="arena-voice-disc">
                <Mic size={44} color="#233a2d" style={{ opacity: 0.95 }} />
              </div>
            </div>
          </div>

          {/* Side-by-Side Floating Micro-Cards (Inspired by 21st.dev template) */}
          <div
            style={{
              maxWidth: '1080px',
              margin: '3rem auto 0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              textAlign: 'left',
            }}
          >
            {/* Card 1: Live Discussion Stream */}
            <div
              style={{
                background: '#132219',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#879b8f',
                    letterSpacing: '0.05em',
                  }}
                >
                  LIVE DISCUSSION STREAM
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#1c2d22',
                    color: '#10b981',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Turn 4 · Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#233a2d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  V
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Vikram Malhotra</div>
                  <div style={{ fontSize: '11px', color: '#879b8f' }}>The Dominator · High Urgency</div>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1rem' }}>
                "If Indian IT firms don't mandate practical skills over GPA, we will face an acute
                employability bottleneck within two placement seasons."
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="waveform-container">
                  <div className="waveform-bar" style={{ background: '#10b981' }} />
                  <div className="waveform-bar" style={{ background: '#10b981' }} />
                  <div className="waveform-bar" style={{ background: '#10b981' }} />
                  <div className="waveform-bar" style={{ background: '#10b981' }} />
                  <div className="waveform-bar" style={{ background: '#10b981' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  ⚡ Barge-In Available (Stop AI immediately)
                </span>
              </div>
            </div>

            {/* Card 2: Evidence-Backed Report Card */}
            <div
              style={{
                background: '#132219',
                borderRadius: '16px',
                padding: '1.5rem',
                color: '#fff',
                boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#879b8f',
                    letterSpacing: '0.05em',
                  }}
                >
                  VERBATIM EVIDENCE AUDIT
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  100% Quote Verified
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>88</span>
                <span style={{ fontSize: '14px', color: '#879b8f' }}>/ 100 Overall Score</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ▲ +14% vs baseline
                </span>
              </div>

              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, marginBottom: '2px' }}>
                  EXACT TRANSCRIPT QUOTE (Turn 3):
                </div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#e2e8f0' }}>
                  "Building on Priya's point, companies test problem-solving, not rote syntax."
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#879b8f', lineHeight: 1.4 }}>
                <strong>Assessment:</strong> Outstanding conversational synthesis. Acknowledged previous
                speaker by name and pivoted to placement evaluation criteria.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Dark Lower Half: Editorial Manifesto & Bento Features (Inspired by reference) */}
      <div className="arena-dark-section">
        {/* Manifesto Section */}
        <section
          style={{
            padding: '6rem 1.5rem 5rem',
            maxWidth: '920px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--accent-gold)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              marginBottom: '2rem',
            }}
          >
            ★ WHY GD ARENA
          </div>

          <h2
            style={{
              fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              color: '#fff',
              marginBottom: '3.5rem',
            }}
          >
            GD Arena{' '}
            <span
              style={{
                display: 'inline-flex',
                gap: '4px',
                verticalAlign: 'middle',
                margin: '0 4px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(225, 29, 72, 0.25)',
                  color: 'var(--accent-gold)',
                }}
              >
                <Bot size={16} />
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(249, 115, 22, 0.2)',
                  color: '#f97316',
                }}
              >
                <Flame size={16} />
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                }}
              >
                <Award size={16} />
              </span>
            </span>{' '}
            gives campus candidates their edge back: realistic AI rooms, live turn-taking and{' '}
            <span style={{ color: '#fda4af' }}>reports placement evaluators actually respect.</span>
          </h2>

          {/* 3 Numerical Impact Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                15,000+
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Mock GD Rounds Practised
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '-0.02em' }}>
                3.4×
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Placement Conversion Multiplier
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
                100%
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Verbatim Quote Grounding
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid: Inside The Arena */}
        <section
          style={{
            padding: '3rem 1.5rem 6rem',
            maxWidth: '1160px',
            margin: '0 auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--accent-gold)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                marginBottom: '1rem',
              }}
            >
              ★ INSIDE THE ARENA
            </div>
            <h3
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#fff',
              }}
            >
              Every discussion dynamic, one platform
            </h3>
            <p style={{ color: '#fda4af', fontSize: '15px', marginTop: '0.5rem' }}>
              Switch seamlessly between multi-AI personality rooms and real-time student WebRTC rooms.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Bento 1: AI Personalities Selector */}
            <div className="arena-bento-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                  AI PERSONALITY ENGINE
                </span>
                <span style={{ fontSize: '11px', color: '#fda4af' }}>Distinct Prompts & Voices</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {personalities.map((p, idx) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setActivePersonality(idx)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: activePersonality === idx ? '1px solid var(--accent-rose)' : '1px solid rgba(255,255,255,0.1)',
                      background: activePersonality === idx ? 'rgba(225, 29, 72, 0.25)' : 'rgba(0,0,0,0.3)',
                      color: activePersonality === idx ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              <div
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                    {personalities[activePersonality].name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(225, 29, 72, 0.25)',
                      color: 'var(--accent-gold)',
                    }}
                  >
                    {personalities[activePersonality].badge}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#fda4af', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                  {personalities[activePersonality].desc}
                </p>
                <div
                  style={{
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: '#fff1f2',
                    borderLeft: '2px solid var(--accent-gold)',
                    paddingLeft: '8px',
                  }}
                >
                  "{personalities[activePersonality].sample}"
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Each AI has unique speaking frequencies, disagreement habits, and voice assignments.
              </p>
            </div>

            {/* Bento 2: Placement Streak & Calendar Heatmap */}
            <div className="arena-bento-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
                  CONSISTENCY HEATMAP
                </span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Active Streak</span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>
                  12 Days <Flame size={24} color="#f97316" style={{ display: 'inline', verticalAlign: 'middle' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  A day counts after a completed GD session. Never lose your interview momentum.
                </div>
              </div>

              {/* Heatmap Grid Simulation (Inspired by 21st.dev template) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(14, 1fr)',
                  gap: '4px',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1rem',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                }}
              >
                {Array.from({ length: 42 }).map((_, i) => {
                  const filled = i % 3 === 0 || i % 5 === 0 || i > 30;
                  const intensity = i > 30 ? '#10b981' : filled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.06)';
                  return (
                    <div
                      key={i}
                      style={{
                        height: '14px',
                        borderRadius: '3px',
                        background: intensity,
                      }}
                      title={`Day ${i + 1}`}
                    />
                  );
                })}
              </div>

              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Hover a week to see performance score trajectories and category distribution.
              </p>
            </div>

            {/* Bento 3: Dual Mode Comparison */}
            <div className="arena-bento-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                  DUAL DISCUSSION MODES
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>AI vs Human Peer</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(225, 29, 72, 0.12)',
                    border: '1px solid rgba(225, 29, 72, 0.3)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '2px' }}>
                    1. AI Practice Room (On Demand)
                  </div>
                  <div style={{ fontSize: '12px', color: '#fda4af' }}>
                    Available 24/7 with zero waiting time. Practice dominating, redirecting drifters, and
                    summarizing under pressure.
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                    2. Human Peer Room (LiveKit WebRTC)
                  </div>
                  <div style={{ fontSize: '12px', color: '#fda4af' }}>
                    Multi-user low-latency audio rooms with batchmates. Creator host controls, shared
                    synced timers, and peer rubrics.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onStart}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Enter AI Room
                </button>
                <button
                  type="button"
                  onClick={onStart}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(225, 29, 72, 0.15)',
                    color: 'var(--accent-gold)',
                    border: '1px solid rgba(225, 29, 72, 0.35)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Join Peer Room
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Closing Editorial CTA Section */}
        <section
          style={{
            padding: '5rem 1.5rem',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(225, 29, 72, 0.25)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <Sparkles size={22} color="var(--accent-gold)" />
          </div>

          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#fff',
              marginBottom: '1rem',
            }}
          >
            Your next placement GD,
            <br />
            already half aced.
          </h2>
          <p style={{ color: '#fda4af', fontSize: '15px', marginBottom: '2.5rem' }}>
            Zero setup required. Try our instant demo mode or register with your college email.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={onStart}
              className="arena-btn arena-btn--brand"
              style={{ height: '48px', padding: '0 28px', fontSize: '15px' }}
            >
              Start Free Practice
            </button>
            <button
              onClick={onDemoLogin}
              className="arena-btn arena-btn--white"
              style={{ height: '48px', padding: '0 24px', fontSize: '15px' }}
            >
              1-Click Demo Account
            </button>
          </div>

          {/* Mandatory AI Disclosure Banner */}
          <div
            style={{
              marginTop: '4rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#fda4af',
            }}
          >
            <ShieldCheck size={16} color="var(--accent-gold)" />
            <span>
              <strong>Educational Practice Disclosure:</strong> You are practising with AI-generated participants.
              Their voices and opinions are simulated for educational practice.
            </span>
          </div>

          <footer
            style={{
              marginTop: '3rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>© 2026 GD ARENA. Designed for Campus Placements.</div>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <span>Privacy</span>
              <span>Rubrics</span>
              <span>Topics</span>
              <span>Status</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
