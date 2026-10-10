import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AIParticipant, TranscriptEntry, FinalReport } from '../services/api';
import {
  playSpokenAudio,
  cancelSpokenAudio,
  createSpeechRecognizer,
  setupMicrophoneVolumeMeter,
} from '../services/speech';
import type { SpeechRecognitionHandler } from '../services/speech';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  Square,
  ShieldAlert,
  Clock,
  Send,
  Zap,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

interface AIGDRoomPageProps {
  initialTopic?: string;
  onExit: () => void;
  onSessionComplete: (report: FinalReport) => void;
}

export const AIGDRoomPage: React.FC<AIGDRoomPageProps> = ({
  initialTopic,
  onExit,
  onSessionComplete,
}) => {
  // Phase state: 'setup' -> 'pre_discussion' -> 'active' -> 'concluded'
  const [phase, setPhase] = useState<'setup' | 'pre_discussion' | 'active' | 'concluded'>('setup');

  // Configuration state
  const [topic, setTopic] = useState(initialTopic || 'Is Artificial Intelligence a threat to entry-level jobs?');
  const [participantCount, setParticipantCount] = useState<number>(4);
  const [durationSeconds, setDurationSeconds] = useState<number>(600); // 10 mins
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [format, setFormat] = useState('General');
  const [aiPatience, setAiPatience] = useState<'Short' | 'Normal' | 'Patient'>('Normal');
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [enableSilentNudges, setEnableSilentNudges] = useState(true);

  // Runtime discussion state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<AIParticipant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [activeSpeakerName, setActiveSpeakerName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);

  // Microphone & Speech State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [studentInputText, setStudentInputText] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [activeNudge, setActiveNudge] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Refs
  const recognizerRef = useRef<SpeechRecognitionHandler | null>(null);
  const volumeMeterRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<any>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelSpokenAudio();
      if (recognizerRef.current) recognizerRef.current.stop();
      if (volumeMeterRef.current) volumeMeterRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1. Setup -> Pre-discussion
  const handleProceedToPreDiscussion = async () => {
    try {
      const sessionRes = await api.createSession({
        topic,
        participant_count: participantCount,
        duration_seconds: durationSeconds,
      });
      setSessionId(sessionRes.session_id);
      setParticipants(sessionRes.participants);
      setSecondsRemaining(durationSeconds);
      setPhase('pre_discussion');
    } catch (err: any) {
      alert(`Room creation failed: ${err.message}`);
    }
  };

  // 2. Start Discussion
  const handleStartDiscussion = async () => {
    if (!sessionId) return;
    setPhase('active');

    try {
      // 1. Start Discussion via API first so session is ACTIVE
      const startRes = await api.startSession(sessionId);
      const openingTurn = startRes.opening_turn;
      setTranscript([openingTurn]);
      setActiveSpeakerId(openingTurn.speaker_id);
      setActiveSpeakerName(openingTurn.speaker_name);

      // 2. Setup Microphone & Speech Recognizer gracefully
      try {
        recognizerRef.current = createSpeechRecognizer((text, isFinal) => {
          if (isFinal && text.trim()) {
            handleStudentSubmit(text.trim());
          }
        });
        recognizerRef.current.start();
      } catch (recErr) {
        console.warn('Speech recognizer non-blocking note:', recErr);
      }

      try {
        volumeMeterRef.current = await setupMicrophoneVolumeMeter((vol) => {
          setMicVolume(vol);
        });
      } catch {
        // Microphone hardware gracefully handled
      }

      // 3. Speak Moderator Opening
      if (!isAudioMuted) {
        playSpokenAudio(
          openingTurn.text,
          'en-US-AriaNeural',
          () => setActiveSpeakerId(openingTurn.speaker_id),
          () => {
            setActiveSpeakerId(null);
            scheduleNextTurn(sessionId);
          }
        );
      } else {
        setTimeout(() => {
          setActiveSpeakerId(null);
          scheduleNextTurn(sessionId);
        }, 3000);
      }

      // Start Server-Synced Clock
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleEndDiscussion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      alert(`Failed to start discussion: ${err.message}`);
    }
  };

  // 3. AI Turn Generation & Scheduling
  const scheduleNextTurn = async (sId: string) => {
    try {
      const nextRes = await api.requestNextTurn(sId);
      if (nextRes.action === 'waiting_for_student') {
        setActiveNudge('The floor is open for your input! Share your perspective now.');
        return;
      }

      if (nextRes.entry) {
        const entry = nextRes.entry;
        setTranscript((prev) => [...prev, entry]);
        setActiveSpeakerId(entry.speaker_id);
        setActiveSpeakerName(entry.speaker_name);

        if (!isAudioMuted) {
          playSpokenAudio(
            entry.text,
            nextRes.audio?.voice_name,
            () => setActiveSpeakerId(entry.speaker_id),
            () => {
              setActiveSpeakerId(null);
              // Slight natural pause before requesting next turn
              setTimeout(() => {
                scheduleNextTurn(sId);
              }, 1800);
            }
          );
        } else {
          setTimeout(() => {
            setActiveSpeakerId(null);
            scheduleNextTurn(sId);
          }, 4000);
        }
      }
    } catch (err) {
      console.error('Next turn generation error:', err);
    }
  };

  // 4. Student Submits Turn
  const handleStudentSubmit = async (textToSend: string) => {
    if (!sessionId || !textToSend.trim()) return;
    try {
      const wasAiSpeaking = activeSpeakerId !== null && activeSpeakerId !== 'student';
      if (wasAiSpeaking) {
        await handleBargeIn();
      }

      const res = await api.submitStudentTurn(sessionId, {
        text: textToSend,
        is_interruption: wasAiSpeaking,
      });
      setTranscript((prev) => [...prev, res.entry]);
      setStudentInputText('');
      setActiveNudge(null);

      // Trigger next AI response after candidate speaks
      setTimeout(() => {
        if (sessionId) scheduleNextTurn(sessionId);
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting student turn:', err);
    }
  };

  // 5. Barge-In Interruption (Sub-second audio cancel)
  const handleBargeIn = async () => {
    if (!sessionId) return;
    cancelSpokenAudio(); // Stop audio immediately
    setActiveSpeakerId(null);
    try {
      await api.interruptSpeaker(sessionId);
    } catch (e) {
      console.error('Interruption call error:', e);
    }
  };

  // 6. End Discussion & Generate Report
  const handleEndDiscussion = async () => {
    if (!sessionId || isEnding) return;
    setIsEnding(true);
    cancelSpokenAudio();
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognizerRef.current) recognizerRef.current.stop();
    if (volumeMeterRef.current) volumeMeterRef.current.stop();

    try {
      const report = await api.endSession(sessionId);
      onSessionComplete(report);
    } catch (err: any) {
      alert(`Report generation failed: ${err.message}`);
      onExit();
    }
  };

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // RENDER: Phase 1 - Room Configuration
  if (phase === 'setup') {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={onExit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Configure AI GD Room</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Customize topic, participant personalities, room duration, and pacing.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Discussion Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  AI Participants Count
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setParticipantCount(cnt)}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        border: participantCount === cnt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                        background: participantCount === cnt ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                        color: participantCount === cnt ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {cnt} AI Candidates
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Duration
                </label>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value={300}>5 Minutes (Sprint)</option>
                  <option value={600}>10 Minutes (Standard)</option>
                  <option value={900}>15 Minutes (Comprehensive)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Format Style
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="General">General Campus GD</option>
                  <option value="Controversial">Controversial / Debate</option>
                  <option value="Case-Based">Case-Based Solution</option>
                  <option value="Abstract">Abstract Metaphor</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="Beginner">Beginner (Gentle)</option>
                  <option value="Intermediate">Intermediate (Campus Standard)</option>
                  <option value="Advanced">Advanced (High Pressure)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  AI Discussion Patience
                </label>
                <select
                  value={aiPatience}
                  onChange={(e) => setAiPatience(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="Short">Short (Fast Pacing, High Energy)</option>
                  <option value="Normal">Normal (Standard Interview Flow)</option>
                  <option value="Patient">Patient (Generous Silence for Candidate)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableCaptions}
                  onChange={(e) => setEnableCaptions(e.target.checked)}
                />
                Live Captions & Subtitles
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#fff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableSilentNudges}
                  onChange={(e) => setEnableSilentNudges(e.target.checked)}
                />
                Silent Turn-Taking Nudges
              </label>
            </div>

            <button
              onClick={handleProceedToPreDiscussion}
              style={{
                marginTop: '1rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              Continue to Equipment & Room Check <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Phase 2 - Pre-Discussion Screen
  if (phase === 'pre_discussion') {
    return (
      <div style={{ padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
        <button
          onClick={() => setPhase('setup')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Configuration
        </button>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            Pre-Discussion Room & Audio Check
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Review room parameters and verify audio before the AI Moderator opens the session.
          </p>

          {/* Topic Summary */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>TOPIC:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>"{topic}"</div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <span>Duration: {durationSeconds / 60} mins</span> • <span>Format: {format}</span> • <span>AI Participants: {participantCount}</span>
            </div>
          </div>

          {/* AI Disclosure Warning */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--accent-amber)',
              fontSize: '0.825rem',
              display: 'flex',
              gap: '0.65rem',
              marginBottom: '1.5rem',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Simulated Participants Disclosure:</strong> You are practising with AI-generated participants.
              Their voices, personalities, and arguments are synthesized for placement practice.
            </span>
          </div>

          {/* Participant Room Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Participating Candidates in this Room:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
              <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>Moderator</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Impartial Floor Orchestrator</div>
              </div>
              {participants.map((p) => (
                <div key={p.id} style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>
                    {p.profile.profile_type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartDiscussion}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)',
            }}
          >
            Enter & Start Discussion
          </button>
        </div>
      </div>
    );
  }

  // RENDER: Phase 3 - Active Group Discussion
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Discussion Header */}
      <header
        style={{
          height: '65px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-emerald)',
              boxShadow: '0 0 10px var(--accent-emerald)',
            }}
          />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              LIVE GD ARENA {activeSpeakerName ? `• ${activeSpeakerName} speaking` : ''}
            </span>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topic}
            </h2>
          </div>
        </div>

        {/* Clock & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Mute Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMicMuted;
                setIsMicMuted(nextMuted);
                if (nextMuted && recognizerRef.current) recognizerRef.current.stop();
                else if (!nextMuted && recognizerRef.current) recognizerRef.current.start();
              }}
              title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: isMicMuted ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.3)',
                color: isMicMuted ? 'var(--accent-rose)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAudioMuted) cancelSpokenAudio();
                setIsAudioMuted(!isAudioMuted);
              }}
              title={isAudioMuted ? 'Unmute Audio Playback' : 'Mute Audio Playback'}
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: isAudioMuted ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0,0,0,0.3)',
                color: isAudioMuted ? 'var(--accent-rose)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: secondsRemaining <= 90 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0, 0, 0, 0.3)',
              border: secondsRemaining <= 90 ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
              color: secondsRemaining <= 90 ? 'var(--accent-rose)' : 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
            }}
          >
            <Clock size={16} /> {formatTime(secondsRemaining)}
          </div>

          <button
            onClick={handleEndDiscussion}
            disabled={isEnding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              background: 'rgba(244, 63, 94, 0.15)',
              color: 'var(--accent-rose)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <Square size={14} /> {isEnding ? 'Generating Report...' : 'End GD'}
          </button>
        </div>
      </header>

      {/* Main GD Area: Participants Grid + Transcript Panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Participant Cards Grid */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Silent Nudge Banner */}
          {enableSilentNudges && activeNudge && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid var(--border-highlight)',
                color: 'var(--accent-cyan)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Zap size={16} />
              <span>{activeNudge}</span>
            </div>
          )}

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Moderator Card */}
            <div
              className={`glass-panel ${activeSpeakerId === 'moderator_001' ? 'speaking-pulse' : ''}`}
              style={{
                padding: '1.25rem',
                border: activeSpeakerId === 'moderator_001' ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Moderator</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>IMPARTIAL HOST</span>
                </div>
              </div>
              {activeSpeakerId === 'moderator_001' && (
                <div className="waveform-container">
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginLeft: '6px' }}>Speaking...</span>
                </div>
              )}
            </div>

            {/* AI Candidates Cards */}
            {participants.map((p) => {
              const isSpeaking = activeSpeakerId === p.id;
              return (
                <div
                  key={p.id}
                  className={`glass-panel ${isSpeaking ? 'speaking-pulse' : ''}`}
                  style={{
                    padding: '1.25rem',
                    border: isSpeaking ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(56, 189, 248, 0.7))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: '#fff',
                      }}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{p.name}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', textTransform: 'capitalize' }}>
                        {p.profile.profile_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {isSpeaking ? (
                    <div className="waveform-container">
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                      <div className="waveform-bar" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginLeft: '6px' }}>Speaking...</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Listening</div>
                  )}
                </div>
              );
            })}

            {/* Student Candidate Card ("You") */}
            <div
              className={`glass-panel ${activeSpeakerId === 'student' ? 'speaking-pulse' : ''}`}
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-highlight)',
                background: 'rgba(56, 189, 248, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#000',
                  }}
                >
                  YOU
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Candidate (You)</div>
                  <span style={{ fontSize: '0.7rem', color: isMicMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                    {isMicMuted ? 'MIC MUTED' : 'MIC ACTIVE'}
                  </span>
                </div>
              </div>

              {micVolume > 0.05 ? (
                <div className="waveform-container">
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginLeft: '6px' }}>Voice Detected</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready to speak</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Transcript & Interaction Panel */}
        <div
          style={{
            width: '420px',
            borderLeft: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(10, 15, 29, 0.75)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Discussion Transcript</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{transcript.length} turns</span>
          </div>

          {/* Transcript Feed */}
          <div
            ref={transcriptScrollRef}
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {transcript.map((entry) => {
              const isStudent = entry.speaker_type === 'STUDENT';
              const isMod = entry.speaker_type === 'MODERATOR';
              return (
                <div
                  key={entry.entry_id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isStudent ? 'rgba(56, 189, 248, 0.1)' : isMod ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                    border: isStudent ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: isStudent ? 'var(--accent-cyan)' : isMod ? 'var(--accent-indigo)' : '#fff' }}>
                      {entry.speaker_name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Turn {entry.sequence_number}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.text}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Interruption & Text Input Fallback Bar */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeSpeakerId && activeSpeakerId !== 'student' && (
              <button
                type="button"
                onClick={handleBargeIn}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: 'var(--accent-rose)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Zap size={14} /> Interupt Current Speaker (Barge-In)
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Type or speak a point..."
                value={studentInputText}
                onChange={(e) => setStudentInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStudentSubmit(studentInputText);
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => handleStudentSubmit(studentInputText)}
                disabled={!studentInputText.trim()}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
