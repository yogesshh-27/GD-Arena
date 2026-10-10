import React, { useState, useEffect } from 'react';
import { api, getToken, removeToken } from './services/api';
import type { User, FinalReport } from './services/api';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { DashboardPage } from './pages/DashboardPage';
import { AIGDRoomPage } from './pages/AIGDRoomPage';
import { HumanGDRoomPage } from './pages/HumanGDRoomPage';
import { ReportPage } from './pages/ReportPage';
import { TopicsPage } from './pages/TopicsPage';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<string>('landing'); // landing, auth, onboarding, assessment, app
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTopicForAIRoom, setSelectedTopicForAIRoom] = useState<string | undefined>();
  const [activeReport, setActiveReport] = useState<FinalReport | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setCurrentView('landing');
      return;
    }

    try {
      const res = await api.getMe();
      setUser({
        id: res.id,
        email: res.email,
        full_name: res.full_name,
        role: res.role,
        has_completed_onboarding: res.has_completed_onboarding,
      });

      if (!res.has_completed_onboarding) {
        setCurrentView('onboarding');
      } else {
        setCurrentView('app');
      }
    } catch {
      removeToken();
      setUser(null);
      setCurrentView('landing');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setCurrentView('landing');
  };

  const handleAuthSuccess = (authedUser: User) => {
    setUser(authedUser);
    if (!authedUser.has_completed_onboarding) {
      setCurrentView('onboarding');
    } else {
      setCurrentView('app');
      setActiveTab('dashboard');
    }
  };

  const handleStartAIRoom = (topicTitle?: string) => {
    setSelectedTopicForAIRoom(topicTitle);
    setActiveTab('ai-room');
  };

  const handleViewReport = async (sessionId?: string) => {
    if (sessionId) {
      try {
        const report = await api.getReport(sessionId);
        setActiveReport(report);
        setActiveTab('report-view');
        return;
      } catch (err) {
        console.error('Error fetching report:', err);
      }
    }
    setActiveTab('reports');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Sparkles size={36} color="var(--accent-gold)" style={{ animation: 'spin 2s linear infinite' }} />
      </div>
    );
  }

  // Not Logged In: Landing Page
  if (currentView === 'landing') {
    return (
      <LandingPage
        onStart={() => setCurrentView('auth')}
        onDemoLogin={() => setCurrentView('auth')}
      />
    );
  }

  // Not Logged In: Auth Page
  if (currentView === 'auth') {
    return (
      <AuthPage
        onSuccess={handleAuthSuccess}
        onCancel={() => setCurrentView('landing')}
      />
    );
  }

  // Logged In: Onboarding Step
  if (currentView === 'onboarding') {
    return (
      <OnboardingPage
        onComplete={() => setCurrentView('assessment')}
      />
    );
  }

  // Logged In: Initial 30s Speech Assessment
  if (currentView === 'assessment') {
    return (
      <AssessmentPage
        onComplete={() => {
          setCurrentView('app');
          setActiveTab('dashboard');
        }}
        onSkip={() => {
          setCurrentView('app');
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // Logged In: Main Platform Layout with Sidebar
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Vertical Sidebar */}
      <Sidebar
        currentTab={activeTab === 'report-view' ? 'reports' : activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'reports' && !activeReport) {
            // Will show reports list
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {/* Persistent Engine Mode Banner */}
        <div
          style={{
            padding: '0.45rem 1.5rem',
            background: 'rgba(225, 29, 72, 0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent-emerald)',
                boxShadow: '0 0 8px var(--accent-emerald)',
                display: 'inline-block',
              }}
            />
            <span>
              <strong style={{ color: 'var(--accent-gold)' }}>GD ARENA INTELLIGENCE ENGINE:</strong> Real-time voice turn-taking & barge-in active.
            </span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
            Signed in as {user?.email} ({user?.role})
          </span>
        </div>

        {/* Tab Switcher */}
        {activeTab === 'dashboard' && (
          <DashboardPage
            onEnterAIRoom={handleStartAIRoom}
            onEnterHumanRoom={() => setActiveTab('human-room')}
            onViewReports={handleViewReport}
            onViewTopics={() => setActiveTab('topics')}
          />
        )}

        {activeTab === 'ai-room' && (
          <AIGDRoomPage
            initialTopic={selectedTopicForAIRoom}
            onExit={() => setActiveTab('dashboard')}
            onSessionComplete={(rep) => {
              setActiveReport(rep);
              setActiveTab('report-view');
            }}
          />
        )}

        {activeTab === 'human-room' && <HumanGDRoomPage />}

        {activeTab === 'topics' && (
          <TopicsPage
            onSelectTopic={(t) => handleStartAIRoom(t)}
          />
        )}

        {activeTab === 'report-view' && activeReport && (
          <ReportPage
            report={activeReport}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'reports' && !activeReport && (
          <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Performance Reports History
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
              Access evidence-verified reports from your past AI discussion practice sessions.
            </p>
            <button
              onClick={() => handleStartAIRoom()}
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(225, 29, 72, 0.35)',
              }}
            >
              Start an AI Discussion to Generate Report
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ padding: '2.5rem', maxWidth: '720px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                Candidate Profile
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{user?.full_name}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>{user?.email}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-gold)', textTransform: 'capitalize' }}>
                    {user?.role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Progress & Consistency Analytics
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Longitudinal scoring trajectory across campus placement interview rounds.
              </p>
              <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <Sparkles size={28} color="var(--accent-gold)" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#fff', fontWeight: 600 }}>Analytics calibrated with daily streak engine.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Practice consistently across categories (Tech, Business, Social, Abstract) to unlock detailed trend charts.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div style={{ padding: '2.5rem', maxWidth: '850px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                Campus Placement GD Guidelines & Rubrics
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p>
                  <strong>1. Initiating the Discussion:</strong> Opening the GD creates a positive first impression only when you provide a clear definition of the topic and frame the key dimensions.
                </p>
                <p>
                  <strong>2. Building on Others (Synthesis):</strong> Recruitment evaluators look for candidates who listen actively. Connect your points using phrases like "Building upon what Vikram highlighted..."
                </p>
                <p>
                  <strong>3. Handling Dominators & Interruptions:</strong> Never get visibly frustrated. Use polite assertiveness: "If I may complete my thought..." or yield gracefully and re-enter with a strong point.
                </p>
                <p>
                  <strong>4. Neutral Summarization:</strong> During the closing round, do not introduce new arguments. Concisely synthesize the consensus and divergence points.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
