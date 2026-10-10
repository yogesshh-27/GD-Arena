import React, { useState } from 'react';
import { api } from '../services/api';
import { GraduationCap, Award, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Academic details
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('Third');
  const [course, setCourse] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering');

  // Step 2: Experience details
  const [experienceAreas, setExperienceAreas] = useState<string[]>([
    'group discussions',
    'class presentations',
  ]);
  const [gdConfidence, setGdConfidence] = useState('Intermediate');

  const experienceOptions = [
    'class presentations',
    'technical presentations',
    'group discussions',
    'interview rounds',
    'public speaking',
    'debates',
    'hackathon pitching',
    'technical demonstrations',
    'none',
  ];

  const toggleExperience = (item: string) => {
    if (item === 'none') {
      setExperienceAreas(['none']);
      return;
    }
    const filtered = experienceAreas.filter((x) => x !== 'none');
    if (filtered.includes(item)) {
      setExperienceAreas(filtered.filter((x) => x !== item));
    } else {
      setExperienceAreas([...filtered, item]);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!college.trim()) {
      setError('Please provide your college or university name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.saveAcademic({ college, year, course, branch });
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save academic details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.saveExperience({
        experience_areas: experienceAreas,
        gd_confidence: gdConfidence,
      });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save experience details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel animate-scale-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '2.5rem',
        }}
      >
        {/* Progress Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step >= 1 ? '#233a2d' : 'var(--border-subtle)',
                border: step >= 1 ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: step >= 1 ? '0 0 10px rgba(35, 58, 45, 0.5)' : 'none',
              }}
            >
              1
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: step === 1 ? '#fff' : 'var(--text-muted)' }}>
              Academics
            </span>
          </div>

          <div style={{ flex: 1, height: '2px', background: step === 2 ? 'var(--accent-emerald)' : 'var(--border-subtle)', margin: '0 1rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step === 2 ? '#233a2d' : 'rgba(255, 255, 255, 0.1)',
                border: step === 2 ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                color: step === 2 ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: step === 2 ? '0 0 10px rgba(35, 58, 45, 0.5)' : 'none',
              }}
            >
              2
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: step === 2 ? '#fff' : 'var(--text-muted)' }}>
              Communication
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: 'var(--accent-rose)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {step === 1 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <GraduationCap size={28} color="var(--accent-gold)" />
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff1f2' }}>Academic Details</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Help us calibrate placement discussion difficulty for your curriculum.
                </p>
              </div>
            </div>

            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  College / University Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Institute of Technology, Trichy"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Course / Degree
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: '#1a050e',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="B.Tech">B.Tech / B.E.</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="B.Sc.">B.Sc.</option>
                    <option value="M.Sc.">M.Sc.</option>
                    <option value="MBA">MBA</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Current Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: '#1a050e',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  >
                    <option value="First">First Year</option>
                    <option value="Second">Second Year</option>
                    <option value="Third">Third Year</option>
                    <option value="Fourth">Fourth Year (Final)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Branch / Specialization
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Engineering"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #1a2c22',
                  background: '#233a2d',
                  boxShadow: '0 4px 15px rgba(35, 58, 45, 0.4)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                Continue to Communication Experience <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Award size={28} color="var(--accent-gold)" />
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff1f2' }}>Communication Background</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Tailor feedback sensitivity and pacing thresholds to your comfort level.
                </p>
              </div>
            </div>

            <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Prior Speaking & Presentation Experience (Select all that apply)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
                  {experienceOptions.map((opt) => {
                    const isSelected = experienceAreas.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleExperience(opt)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(225, 29, 72, 0.22)' : 'rgba(26, 5, 14, 0.5)',
                          color: isSelected ? '#fff1f2' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <CheckCircle2 size={13} color="var(--accent-rose)" />}
                        <span style={{ textTransform: 'capitalize' }}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Current GD Confidence Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {['Beginner', 'Intermediate', 'Advanced', 'Not sure'].map((lvl) => {
                    const isSelected = gdConfidence === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setGdConfidence(lvl)}
                        style={{
                          padding: '0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(225, 29, 72, 0.22)' : 'rgba(26, 5, 14, 0.5)',
                          color: isSelected ? '#fff1f2' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #1a2c22',
                    background: '#233a2d',
                    boxShadow: '0 4px 15px rgba(35, 58, 45, 0.4)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {loading ? 'Saving...' : 'Complete Profile & Start Calibration'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
