import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Flame,
  Bot,
  Users,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface DashboardPageProps {
  onEnterAIRoom: (topicTitle?: string) => void;
  onEnterHumanRoom: () => void;
  onViewReports: (sessionId?: string) => void;
  onViewTopics: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onEnterAIRoom,
  onEnterHumanRoom,
  onViewReports,
  onViewTopics,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Sparkles size={32} color="var(--accent-gold)" style={{ animation: 'spin 2s linear infinite', margin: '0 auto 1rem' }} />
        <p>Loading your placement dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--accent-rose)' }}>
        <p>{error || 'Unable to display dashboard.'}</p>
        <button
          onClick={loadSummary}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: 'var(--bg-card)',
            color: '#fff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { profile, streak, performance, recent_activity, recommended_topics } = data;

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner: Profile & Streaks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: '#233a2d',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: '0 0 20px rgba(35, 58, 45, 0.5)',
                }}
              >
                {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{profile.full_name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {profile.course} • {profile.year} Year • {profile.college}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--accent-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 700,
                }}
              >
                Confidence: {profile.gd_confidence || 'Intermediate'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--accent-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontWeight: 600,
                }}
              >
                {streak.total_sessions} Discussions Practiced
              </span>
            </div>

            <div
              style={{
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.75rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--accent-emerald)',
              }}
            >
              <strong>Baseline Assessment:</strong> {profile.baseline_summary}
            </div>
          </div>
        </div>

        {/* Streak & Consistency Card */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={22} color="var(--accent-gold)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Daily Practice Streak</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Asia/Kolkata</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                {streak.current_streak}
              </span>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Days Active</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Longest: {streak.longest_streak} days
              </span>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {streak.motivating_message}
            </p>

            {/* Weekly Activity Bar Chart */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '65px', gap: '6px' }}>
              {streak.weekly_activity?.map((day: any, idx: number) => {
                const heightPercent = Math.min(100, Math.max(15, day.sessions * 40));
                const hasSession = day.sessions > 0;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div
                      title={`${day.date}: ${day.sessions} sessions`}
                      style={{
                        width: '100%',
                        height: `${heightPercent}%`,
                        borderRadius: '4px',
                        background: hasSession ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                        transition: 'all 0.2s ease',
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: hasSession ? '#fff' : 'var(--text-muted)' }}>
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Quick Enter AI GD */}
        <div
          className="glass-panel-glow"
          style={{
            padding: '1.75rem',
            background: 'rgba(20, 35, 27, 0.95)',
            border: '1px solid rgba(35, 58, 45, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Bot size={22} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Enter AI GD Room</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '380px' }}>
              Practice speaking on-demand with 3–5 adaptive AI participants and real-time interruption.
            </p>
            <button
              onClick={() => onEnterAIRoom()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #1a2c22',
                background: '#233a2d',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(35, 58, 45, 0.4)',
              }}
            >
              Start AI Discussion <ArrowRight size={16} />
            </button>
          </div>
          <div className="hidden md:block">
            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                background: 'rgba(35, 58, 45, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Sparkles size={32} color="var(--accent-emerald)" />
            </div>
          </div>
        </div>

        {/* Quick Enter Human Room */}
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            background: 'rgba(18, 32, 24, 0.85)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={22} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Enter Human GD Room</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '380px' }}>
              Join scheduled peer audio rooms with fellow students and trade structured peer feedback.
            </p>
            <button
              onClick={onEnterHumanRoom}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(35, 58, 45, 0.4)',
                color: 'var(--accent-emerald)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Browse Human Rooms <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Performance Dimensions</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {performance.recent_change}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Overall Communication Score
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: performance.avg_communication_score ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
              {performance.avg_communication_score ? `${performance.avg_communication_score} / 5.0` : 'Not enough data'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Based on verified report rubrics</span>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Speaking Participation
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem' }}>
              {performance.speaking_participation}
            </div>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Ideas & Content Quality
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem' }}>
              {performance.ideas_content_quality}
            </div>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Listening & Collaboration
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem' }}>
              {performance.listening_collaboration}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Topics & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Recommended Topics */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Recommended Placement Topics</h3>
            </div>
            <button
              onClick={onViewTopics}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              View all
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommended_topics.map((t: any) => (
              <div
                key={t.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{t.category}</span> • <span>{t.difficulty}</span>
                  </div>
                </div>
                <button
                  onClick={() => onEnterAIRoom(t.title)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(225, 29, 72, 0.35)',
                    background: 'rgba(225, 29, 72, 0.15)',
                    color: 'var(--accent-gold)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Practice
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Recent Discussion Sessions</h3>
            </div>
          </div>

          {recent_activity.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>No discussion sessions recorded yet.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Enter the AI GD Room to generate your first placement report.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recent_activity.map((s: any) => (
                <div
                  key={s.session_id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{s.topic}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {s.date} • {Math.round(s.duration_seconds / 60)} mins • Status: {s.status}
                    </div>
                  </div>
                  {s.has_report && (
                    <button
                      onClick={() => onViewReports(s.session_id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-emerald)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
