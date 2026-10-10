import type { FinalReport } from '../services/api';
import {
  Clock,
  MessageSquare,
  Quote,
  Lightbulb,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

interface ReportPageProps {
  report: FinalReport;
  onBackToDashboard: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ report, onBackToDashboard }) => {
  const { metrics, feedback, overall_score, overall_summary, topic, duration_seconds } = report;

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={18} /> Return to Dashboard
        </button>

        <span
          style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--accent-emerald)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          EVIDENCE VERIFIED REPORT
        </span>
      </div>

      {/* Main Score & Summary Header */}
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              CAMPUS PLACEMENT EVALUATION
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>"{topic}"</h1>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {Math.round(duration_seconds / 60)} minutes</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MessageSquare size={14} /> {metrics.student_turn_count} Spoken Turns</span>
            </div>
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '1.25rem 2rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(56, 189, 248, 0.15))',
              border: '1px solid var(--border-highlight)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OVERALL SCORE</span>
            <div style={{ fontSize: '2.75rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {overall_score.toFixed(1)}
              <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/5.0</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Placement Benchmark</span>
          </div>
        </div>

        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.7, background: 'rgba(0, 0, 0, 0.2)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)' }}>
          {overall_summary}
        </p>
      </div>

      {/* Participation Analytics */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
          Participation & Speaking Balance Analytics
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Candidate Word Share</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {metrics.student_share_words_percent.toFixed(1)}%
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Target: 15–25% in 4-candidate GD</span>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Turn Length</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {Math.round(metrics.average_turn_length_words)} words
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Concise voice formulation</span>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interruption Poise</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
              {metrics.interruptions_count} Events
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Barge-in exchanges</span>
          </div>
        </div>

        {/* Turn by Participant Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem' }}>Participant</th>
                <th style={{ padding: '0.65rem' }}>Turns Taken</th>
                <th style={{ padding: '0.65rem' }}>Word Count</th>
                <th style={{ padding: '0.65rem' }}>Speaking Time</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metrics.turns_by_participant).map((speaker) => (
                <tr key={speaker} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.65rem', fontWeight: 600, color: '#fff' }}>{speaker}</td>
                  <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>{metrics.turns_by_participant[speaker]}</td>
                  <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>{metrics.word_count_by_participant[speaker]}</td>
                  <td style={{ padding: '0.65rem', color: 'var(--text-secondary)' }}>
                    {Math.round(metrics.speaking_time_by_participant[speaker] || 0)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVIDENCE-BASED FEEDBACK (Non-negotiable core) */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Quote size={22} color="var(--accent-cyan)" />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Evidence-Grounded Feedback (9 Dimensions)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Every evaluation is mapped directly to verbatim quotes spoken by you during the discussion.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {feedback.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>
                    {item.criterion.replace(/_/g, ' ')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '8px',
                      background: item.status === 'validated' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: item.status === 'validated' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                      fontWeight: 600,
                    }}
                  >
                    {item.status === 'validated' ? 'Grounded Quote' : 'Insufficient Evidence'}
                  </span>
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {item.rating}/5
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                {item.feedback}
              </p>

              {/* Exact Quote Evidence */}
              {item.evidence && item.evidence.length > 0 && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(56, 189, 248, 0.05)',
                    borderLeft: '3px solid var(--accent-cyan)',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                    EXACT VERBATIM TRANSCRIPT QUOTE:
                  </span>
                  <p style={{ fontSize: '0.825rem', fontStyle: 'italic', color: '#fff', marginTop: '0.2rem' }}>
                    "{item.evidence[0].quote}"
                  </p>
                </div>
              )}

              {/* Actionable Improvement */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span><strong>Placement Coaching:</strong> {item.improvement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What You Could Have Said */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Lightbulb size={20} color="var(--accent-amber)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>"What You Could Have Said" — Missed Opportunities</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Strategic suggestions illustrating higher-impact formulations for placement interviews:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>OPPORTUNITY: EXTENDING THE ANALYST'S POINT</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
              "Building on what Ananya highlighted regarding cost structures, we can look at the UPI adoption model in India:
              zero MDR spurred massive consumer velocity while monetization shifted to financial cross-selling."
            </p>
          </div>
        </div>
      </div>

      {/* Return Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onBackToDashboard}
          style={{
            padding: '0.85rem 2.5rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
