import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AIParticipant, TranscriptEntry, FinalReport } from '../services/api';
import {
  playSpokenAudio,
  cancelSpokenAudio,
  createSpeechRecognizer,
  setupMicrophoneVolumeMeter,
  setupMicrophoneVAD,
} from '../services/speech';
import type { SpeechRecognitionHandler, VADHandler } from '../services/speech';
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
  Globe,
  AlertCircle,
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
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN' | 'en-US'>('en-IN');
  const [provisionalSpeech, setProvisionalSpeech] = useState('');
  const [accumulatedTurnText, setAccumulatedTurnText] = useState('');
  const [isStudentSpeaking, setIsStudentSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [studentInputText, setStudentInputText] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [activeNudge, setActiveNudge] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Synchronization & Generation Tracking Refs
  const activeSpeakerIdRef = useRef<string | null>(null);
  const activeGenerationIdRef = useRef<number>(0);
  const scheduleTimeoutRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSubmittingTurnRef = useRef<boolean>(false);
  const wasInterruptionRef = useRef<boolean>(false);
  const accumulatedTurnTextRef = useRef<string>('');
  const provisionalSpeechRef = useRef<string>('');

  const recognizerRef = useRef<SpeechRecognitionHandler | null>(null);
  const volumeMeterRef = useRef<{ stop: () => void } | null>(null);
  const vadRef = useRef<VADHandler | null>(null);
  const timerRef = useRef<any>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);

  // Keep active speaker ref synchronously synced
  useEffect(() => {
    activeSpeakerIdRef.current = activeSpeakerId;
  }, [activeSpeakerId]);

  // Keep text refs synced with state
  useEffect(() => {
    provisionalSpeechRef.current = provisionalSpeech;
  }, [provisionalSpeech]);

  useEffect(() => {
    accumulatedTurnTextRef.current = accumulatedTurnText;
  }, [accumulatedTurnText]);

  // Automatic AI Interruption: Triggered by VAD or early provisional speech
  const triggerAutomaticInterruption = async () => {
    if (!sessionId) return;
    const currentSpeaker = activeSpeakerIdRef.current;
    if (currentSpeaker && currentSpeaker !== 'student') {
      // 1. Immediately cut AI speech playback (sub-second acoustic cancellation)
      cancelSpokenAudio();

      // 2. Invalidate active generation token so pending responses/timeouts are cancelled
      activeGenerationIdRef.current++;
      if (scheduleTimeoutRef.current) {
        clearTimeout(scheduleTimeoutRef.current);
        scheduleTimeoutRef.current = null;
      }

      // 3. Mark interruption flag for metrics tracking
      wasInterruptionRef.current = true;

      // 4. Immediately transfer floor to candidate
      setActiveSpeakerId('student');
      setActiveSpeakerName('Candidate (You)');
      setIsStudentSpeaking(true);

      // 5. Invalidate on backend
      try {
        await api.interruptSpeaker(sessionId);
      } catch (err) {
        console.error('Automatic interruption call error:', err);
      }
    }
  };

  // Reset or restart end-of-turn silence debounce timer (1800ms)
  const resetEndOfTurnTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    silenceTimerRef.current = setTimeout(() => {
      const fullText = `${accumulatedTurnTextRef.current} ${provisionalSpeechRef.current}`.trim();
      const words = fullText.split(/\s+/).filter(Boolean);
      // Auto-commit if candidate has spoken a meaningful thought (>= 2 words)
      if (words.length >= 2 && !isSubmittingTurnRef.current) {
        handleStudentSubmit();
      }
    }, 1800);
  };

  // Initialize Streaming Speech Recognizer (Provisional vs Finalized)
  const setupSpeechRecognition = (lang: string) => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setMicError(null);
    try {
      recognizerRef.current = createSpeechRecognizer(
        {
          onProvisional: (text) => {
            if (!text) {
              setProvisionalSpeech('');
              return;
            }
            // Trigger automatic interruption if AI is speaking
            if (activeSpeakerIdRef.current && activeSpeakerIdRef.current !== 'student') {
              triggerAutomaticInterruption();
            }
            setIsStudentSpeaking(true);
            setActiveSpeakerId('student');
            setActiveSpeakerName('Candidate (You)');
            setProvisionalSpeech(text);
            resetEndOfTurnTimer();
          },
          onFinalSegment: (_finalSegment, allAccumulated) => {
            if (activeSpeakerIdRef.current && activeSpeakerIdRef.current !== 'student') {
              triggerAutomaticInterruption();
            }
            setIsStudentSpeaking(true);
            setActiveSpeakerId('student');
            setActiveSpeakerName('Candidate (You)');
            setProvisionalSpeech('');
            setAccumulatedTurnText(allAccumulated);
            resetEndOfTurnTimer();
          },
          onSpeechStart: () => {
            if (activeSpeakerIdRef.current && activeSpeakerIdRef.current !== 'student') {
              triggerAutomaticInterruption();
            }
            setIsStudentSpeaking(true);
          },
          onSpeechEnd: () => {
            // Silence ended - let the silence timer finalize if words exist
            resetEndOfTurnTimer();
          },
          onError: (err) => {
            setMicError(err);
          },
        },
        undefined,
        lang
      );

      if (!isMicMuted) {
        recognizerRef.current.start();
      }
    } catch (e: any) {
      setMicError(e.message || 'Speech recognition initialization failed');
    }
  };

  const handleLanguageChange = (newLang: 'en-IN' | 'hi-IN' | 'en-US') => {
    setSpeechLanguage(newLang);
    if (recognizerRef.current) {
      recognizerRef.current.setLanguage(newLang);
    }
  };

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
      if (vadRef.current) vadRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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

      // Start volume meter early in pre_discussion for equipment check
      try {
        volumeMeterRef.current = await setupMicrophoneVolumeMeter((vol) => {
          setMicVolume(vol);
        });
      } catch {
        // Handled in UI
      }
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

      // 2. Setup Microphone & Streaming Speech Recognizer gracefully
      setupSpeechRecognition(speechLanguage);

      if (!vadRef.current) {
        try {
          vadRef.current = await setupMicrophoneVAD({
            onVolumeChange: (vol) => {
              setMicVolume(vol);
            },
            onSpeechStart: () => {
              if (activeSpeakerIdRef.current && activeSpeakerIdRef.current !== 'student') {
                triggerAutomaticInterruption();
              }
              setIsStudentSpeaking(true);
            },
            onSpeechEnd: (_silenceMs) => {
              resetEndOfTurnTimer();
            },
          });
        } catch {
          // Handled gracefully if Web Audio not supported
        }
      }

      if (!volumeMeterRef.current) {
        try {
          volumeMeterRef.current = await setupMicrophoneVolumeMeter((vol) => {
            setMicVolume(vol);
          });
        } catch {
          // Volume meter hardware gracefully handled
        }
      }

      // 3. Speak Moderator Opening
      if (!isAudioMuted) {
        playSpokenAudio(
          openingTurn.text,
          'en-US-AriaNeural',
          'MODERATOR',
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
        }, 1500);
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
    const currentGen = activeGenerationIdRef.current;
    try {
      // If student is actively speaking or holding floor, do not schedule AI speech
      if (activeSpeakerIdRef.current === 'student' || isStudentSpeaking) {
        return;
      }

      const nextRes = await api.requestNextTurn(sId);
      // Invalidation check: if user interrupted and generation incremented, discard
      if (currentGen !== activeGenerationIdRef.current) {
        return;
      }

      if (nextRes.action === 'waiting_for_student') {
        setActiveNudge('The floor is open for your input! Share your perspective now.');
        return;
      }

      if (nextRes.entry) {
        const entry = nextRes.entry;
        setTranscript((prev) => [...prev, entry]);
        setActiveSpeakerId(entry.speaker_id);
        setActiveSpeakerName(entry.speaker_name);

        const speakerParticipant = participants.find((p) => p.id === entry.speaker_id);
        const profileType = speakerParticipant?.profile?.profile_type;

        if (!isAudioMuted) {
          playSpokenAudio(
            entry.text,
            nextRes.audio?.voice_name,
            profileType,
            () => {
              if (currentGen === activeGenerationIdRef.current) {
                setActiveSpeakerId(entry.speaker_id);
              }
            },
            () => {
              if (currentGen === activeGenerationIdRef.current) {
                setActiveSpeakerId(null);
                // Brisk, conversational pause (800ms)
                if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
                scheduleTimeoutRef.current = setTimeout(() => {
                  if (currentGen === activeGenerationIdRef.current) {
                    scheduleNextTurn(sId);
                  }
                }, 800);
              }
            }
          );
        } else {
          if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
          scheduleTimeoutRef.current = setTimeout(() => {
            if (currentGen === activeGenerationIdRef.current) {
              setActiveSpeakerId(null);
              scheduleNextTurn(sId);
            }
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Next turn generation error, recovering gracefully:', err);
      if (currentGen === activeGenerationIdRef.current) {
        if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
        scheduleTimeoutRef.current = setTimeout(() => {
          if (currentGen === activeGenerationIdRef.current) {
            scheduleNextTurn(sId);
          }
        }, 2500);
      }
    }
  };

  // 4. Student Submits Turn
  const handleStudentSubmit = async (customText?: string) => {
    if (isSubmittingTurnRef.current) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const raw = customText !== undefined
      ? customText
      : `${accumulatedTurnText} ${provisionalSpeech} ${studentInputText}`.trim();

    if (!sessionId || !raw.trim()) {
      setIsStudentSpeaking(false);
      setProvisionalSpeech('');
      setAccumulatedTurnText('');
      if (activeSpeakerIdRef.current === 'student') {
        setActiveSpeakerId(null);
      }
      return;
    }

    isSubmittingTurnRef.current = true;
    try {
      setProvisionalSpeech('');
      setAccumulatedTurnText('');
      setStudentInputText('');
      setActiveNudge(null);
      setIsStudentSpeaking(false);

      const wasInterruption = wasInterruptionRef.current;
      wasInterruptionRef.current = false;

      const res = await api.submitStudentTurn(sessionId, {
        text: raw.trim(),
        is_interruption: wasInterruption,
      });

      setTranscript((prev) => {
        if (prev.some((e) => e.entry_id === res.entry.entry_id)) return prev;
        return [...prev, res.entry];
      });

      setActiveSpeakerId(null);

      // Invalidate current generation & trigger next AI response after candidate speaks
      activeGenerationIdRef.current += 1;
      const nextGen = activeGenerationIdRef.current;

      if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
      scheduleTimeoutRef.current = setTimeout(() => {
        if (sessionId && nextGen === activeGenerationIdRef.current) {
          scheduleNextTurn(sessionId);
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error submitting student turn:', err);
    } finally {
      isSubmittingTurnRef.current = false;
    }
  };

  // 6. End Discussion & Generate Report
  const handleEndDiscussion = async () => {
    if (!sessionId || isEnding) return;
    setIsEnding(true);
    cancelSpokenAudio();
    if (timerRef.current) clearInterval(timerRef.current);
    if (scheduleTimeoutRef.current) clearTimeout(scheduleTimeoutRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognizerRef.current) recognizerRef.current.stop();
    if (volumeMeterRef.current) volumeMeterRef.current.stop();
    if (vadRef.current) vadRef.current.stop();

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
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                boxShadow: '0 0 20px rgba(225, 29, 72, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2' }}>Configure AI GD Room</h2>
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
                  background: 'rgba(26, 5, 14, 0.6)',
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
                        border: participantCount === cnt ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                        background: participantCount === cnt ? 'rgba(225, 29, 72, 0.22)' : 'rgba(26, 5, 14, 0.5)',
                        color: participantCount === cnt ? '#fff1f2' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
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
                    background: '#1a050e',
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
                    background: '#1a050e',
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
                    background: '#1a050e',
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
                    background: '#1a050e',
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
                background: 'linear-gradient(135deg, #e11d48, #be123c)',
                boxShadow: '0 4px 20px rgba(225, 29, 72, 0.35)',
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
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(26, 5, 14, 0.6)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>TOPIC:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff1f2', marginTop: '0.2rem' }}>"{topic}"</div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              <span>Duration: {durationSeconds / 60} mins</span> • <span>Format: {format}</span> • <span>AI Participants: {participantCount}</span>
            </div>
          </div>

          {/* AI Disclosure Warning */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              color: 'var(--accent-gold)',
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

          {/* Discussion Language Preference */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(26, 5, 14, 0.6)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Globe size={16} style={{ color: 'var(--accent-gold)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff1f2' }}>Preferred Discussion Language:</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              GD Arena participants and the AI Moderator understand and support English, Hindi, and Hinglish.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'en-IN', label: 'Hinglish / Indian English', badge: 'Recommended' },
                { id: 'hi-IN', label: 'Hindi / हिन्दी', badge: 'Native' },
                { id: 'en-US', label: 'English (US)', badge: 'Standard' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleLanguageChange(lang.id as any)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: speechLanguage === lang.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    background: speechLanguage === lang.id ? 'rgba(251, 191, 36, 0.15)' : 'rgba(26, 5, 14, 0.5)',
                    color: speechLanguage === lang.id ? '#fff1f2' : 'var(--text-secondary)',
                    fontWeight: speechLanguage === lang.id ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{lang.label}</span>
                  <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: speechLanguage === lang.id ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255,255,255,0.08)', color: speechLanguage === lang.id ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {lang.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Microphone & Hardware Check */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(26, 5, 14, 0.6)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mic size={16} style={{ color: micVolume > 0.05 ? 'var(--accent-emerald)' : 'var(--accent-gold)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff1f2' }}>Microphone Hardware Check:</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: micVolume > 0.05 ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: 600 }}>
                {micVolume > 0.05 ? '🟢 Audio Detected' : 'Listening for audio...'}
              </span>
            </div>

            {/* Volume Meter Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(5, micVolume * 100))}%`,
                  background: micVolume > 0.05 ? 'linear-gradient(90deg, #e11d48, #fbbf24)' : 'rgba(255,255,255,0.2)',
                  transition: 'width 0.1s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Speak into your mic to verify sound input. You can also type text during the discussion if needed.
            </p>
          </div>

          {/* Participant Room Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Participating Candidates in this Room:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
              <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(225, 29, 72, 0.12)', border: '1px solid rgba(225, 29, 72, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-rose)' }}>Moderator</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Impartial Floor Orchestrator</div>
              </div>
              {participants.map((p) => (
                <div key={p.id} style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(26, 5, 14, 0.6)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff1f2' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'capitalize' }}>
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
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(225, 29, 72, 0.4)',
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
          borderBottom: '1px solid rgba(244, 63, 94, 0.18)',
          backgroundColor: 'rgba(18, 3, 7, 0.95)',
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
              backgroundColor: 'var(--accent-rose)',
              boxShadow: '0 0 10px var(--accent-rose)',
            }}
          />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LIVE GD ARENA {activeSpeakerName ? `• ${activeSpeakerName} speaking` : ''}
            </span>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff1f2', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                background: isMicMuted ? 'rgba(244, 63, 94, 0.25)' : 'rgba(26, 5, 14, 0.6)',
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
                background: isAudioMuted ? 'rgba(244, 63, 94, 0.25)' : 'rgba(26, 5, 14, 0.6)',
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
              background: secondsRemaining <= 90 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(26, 5, 14, 0.6)',
              border: secondsRemaining <= 90 ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid var(--border-subtle)',
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
              border: '1px solid rgba(244, 63, 94, 0.35)',
              background: 'rgba(244, 63, 94, 0.18)',
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
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                color: 'var(--accent-gold)',
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
                border: activeSpeakerId === 'moderator_001' ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(225, 29, 72, 0.3)',
                  }}
                >
                  M
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff1f2' }}>Moderator</div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600 }}>IMPARTIAL HOST</span>
                </div>
              </div>
              {activeSpeakerId === 'moderator_001' && (
                <div className="waveform-container">
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginLeft: '6px' }}>Speaking...</span>
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
                    border: isSpeaking ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #be123c, #9f1239)',
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
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff1f2' }}>{p.name}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', textTransform: 'capitalize' }}>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginLeft: '6px' }}>Speaking...</span>
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
                background: 'rgba(46, 12, 25, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #e11d48, #fbbf24)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(225, 29, 72, 0.35)',
                  }}
                >
                  YOU
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff1f2' }}>Candidate (You)</div>
                    <span style={{ fontSize: '0.7rem', color: isMicMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                      {isMicMuted ? 'MIC MUTED' : 'MIC ACTIVE'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    {speechLanguage === 'en-IN' ? 'Hinglish' : speechLanguage === 'hi-IN' ? 'Hindi' : 'English'}
                  </span>
                </div>
              </div>

              {/* Real-time Voice & Streaming Speech */}
              {(accumulatedTurnText || provisionalSpeech) ? (
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(225, 29, 72, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                    <span className="speaking-pulse" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-rose)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 700 }}>Speaking Now:</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#fff1f2', fontStyle: 'italic', margin: 0 }}>
                    "{`${accumulatedTurnText} ${provisionalSpeech}`.trim()}"
                  </p>
                </div>
              ) : micVolume > 0.05 ? (
                <div className="waveform-container">
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginLeft: '6px' }}>Voice Detected</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready to speak ({speechLanguage === 'en-IN' ? 'Hinglish / English' : speechLanguage})</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Transcript & Interaction Panel */}
        <div
          style={{
            width: '420px',
            borderLeft: '1px solid rgba(244, 63, 94, 0.18)',
            backgroundColor: 'rgba(18, 3, 7, 0.85)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff1f2' }}>Discussion Transcript</span>
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
                    background: isStudent ? 'rgba(225, 29, 72, 0.15)' : isMod ? 'rgba(190, 18, 60, 0.15)' : 'rgba(26, 5, 14, 0.6)',
                    border: isStudent ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: isStudent ? 'var(--accent-rose)' : isMod ? 'var(--accent-gold)' : '#fff1f2' }}>
                      {entry.speaker_name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Turn {entry.sequence_number}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{entry.text}</p>
                </div>
              );
            })}

            {/* In-Place Progressive Provisional Speech Bubble */}
            {(accumulatedTurnText || provisionalSpeech || isStudentSpeaking) && (
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(225, 29, 72, 0.1)',
                  border: '1px dashed var(--accent-rose)',
                  boxShadow: '0 0 12px rgba(225, 29, 72, 0.15)',
                  transition: 'all 0.15s ease-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="speaking-pulse" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-rose)' }} />
                    <span style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>Candidate (You)</span>
                  </div>
                  <span style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 600 }}>Speaking in real-time...</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#fff1f2', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                  {(`${accumulatedTurnText} ${provisionalSpeech}`).trim() || 'Listening to your voice...'}
                </p>
              </div>
            )}
          </div>

          {/* Interaction & Voice Input Control Bar */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Automatic Barge-In Status Indicator (Natural speech interruption active) */}
            {activeSpeakerId && activeSpeakerId !== 'student' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <Zap size={13} style={{ flexShrink: 0 }} />
                <span>AI speaking — Speak naturally at any moment to interrupt automatically.</span>
              </div>
            )}

            {/* Microphone Error Notification */}
            {micError && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(244, 63, 94, 0.18)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: 'var(--accent-rose)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{micError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMicError(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Live Streaming Transcribing Feedback Bar */}
            {(accumulatedTurnText || provisionalSpeech) && (
              <div
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(225, 29, 72, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fff1f2', overflow: 'hidden' }}>
                  <span className="speaking-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-rose)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 700, flexShrink: 0 }}>Hearing:</span>
                  <span style={{ fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    "{`${accumulatedTurnText} ${provisionalSpeech}`.trim()}"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStudentSubmit()}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Send Turn
                </button>
              </div>
            )}

            {/* Language Selection & Mic Status Line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Globe size={13} style={{ color: 'var(--accent-gold)' }} />
                <span>Language:</span>
                <select
                  value={speechLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as any)}
                  style={{
                    background: '#1a050e',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.35rem',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="en-IN">Hinglish / Indian English (en-IN)</option>
                  <option value="hi-IN">Hindi / हिन्दी (hi-IN)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <span style={{ fontSize: '0.7rem', color: isMicMuted ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                {isMicMuted ? '🔇 Mic Muted' : '🎙️ Mic Active'}
              </span>
            </div>

            {/* Input Row: Mic Button + Text Box + Send */}
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !isMicMuted;
                  setIsMicMuted(nextMuted);
                  if (nextMuted && recognizerRef.current) {
                    recognizerRef.current.stop();
                  } else if (!nextMuted) {
                    setupSpeechRecognition(speechLanguage);
                  }
                }}
                title={isMicMuted ? 'Turn Microphone On' : 'Turn Microphone Off'}
                style={{
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isMicMuted ? '1px solid var(--border-subtle)' : '1px solid rgba(244, 63, 94, 0.5)',
                  background: isMicMuted ? 'rgba(26, 5, 14, 0.6)' : 'rgba(225, 29, 72, 0.25)',
                  color: isMicMuted ? 'var(--text-muted)' : 'var(--accent-rose)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                placeholder={isMicMuted ? 'Type your point (or click mic to speak)...' : 'Listening... Speak in Hindi/English or type'}
                value={studentInputText}
                onChange={(e) => setStudentInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStudentSubmit();
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(26, 5, 14, 0.6)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => handleStudentSubmit()}
                disabled={!studentInputText.trim() && !accumulatedTurnText.trim() && !provisionalSpeech.trim()}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: !studentInputText.trim() && !accumulatedTurnText.trim() && !provisionalSpeech.trim() ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #e11d48, #be123c)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: !studentInputText.trim() && !accumulatedTurnText.trim() && !provisionalSpeech.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
