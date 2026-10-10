import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { createSpeechRecognizer, setupMicrophoneVolumeMeter } from '../services/speech';
import type { SpeechRecognitionHandler } from '../services/speech';
import { Square, Play, AlertCircle, Info, CheckCircle2, Sparkles } from 'lucide-react';

interface AssessmentPageProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const AssessmentPage: React.FC<AssessmentPageProps> = ({ onComplete, onSkip }) => {
  const topic = 'Should colleges focus more on practical skills than theoretical knowledge?';
  const DURATION_LIMIT = 30;

  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(DURATION_LIMIT);
  const [transcript, setTranscript] = useState('');
  const [isTextFallback, setIsTextFallback] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const recognizerRef = useRef<SpeechRecognitionHandler | null>(null);
  const volumeMeterRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    setMicError(null);
    setTranscript('');
    setSecondsRemaining(DURATION_LIMIT);
    setIsRecording(true);

    // Setup speech recognizer
    recognizerRef.current = createSpeechRecognizer(
      (text, isFinal) => {
        if (isFinal) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
        }
      },
      (err) => {
        setMicError(err);
        setIsTextFallback(true);
      }
    );

    recognizerRef.current.start();

    // Setup volume meter
    try {
      volumeMeterRef.current = await setupMicrophoneVolumeMeter((vol) => {
        setMicVolume(vol);
      });
    } catch (e: any) {
      setMicError('Microphone permission denied. Switched to text-input mode.');
      setIsTextFallback(true);
    }

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognizerRef.current) recognizerRef.current.stop();
    if (volumeMeterRef.current) {
      volumeMeterRef.current.stop();
      volumeMeterRef.current = null;
    }
    setMicVolume(0);
  };

  const handleSubmit = async () => {
    const textToSubmit = transcript.trim();
    if (!textToSubmit) {
      setMicError('Please speak or type a brief statement before submitting.');
      return;
    }

    setIsSubmitting(true);
    setMicError(null);
    try {
      const res = await api.submitBaselineAssessment({
        topic,
        transcript: textToSubmit,
        duration_seconds: DURATION_LIMIT - secondsRemaining || 25,
      });
      setResult(res);
    } catch (err: any) {
      setMicError(err.message || 'Calibration evaluation failed. You may continue to the dashboard.');
    } finally {
      setIsSubmitting(false);
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
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          padding: '2.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#233a2d',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(35, 58, 45, 0.4)',
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            Initial Voice Calibration Assessment
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Speak for 20–30 seconds on the topic below to establish your starting communication baseline.
          </p>
        </div>

        {/* Calibration Topic Card */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(35, 58, 45, 0.25)',
            border: '1px solid rgba(35, 58, 45, 0.6)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            CALIBRATION PROMPT
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '0.35rem' }}>
            "{topic}"
          </h3>
        </div>

        {micError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{micError}</span>
          </div>
        )}

        {/* Live Audio / Transcript Panel */}
        {!result ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'var(--accent-rose)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Square size={14} /> Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'linear-gradient(135deg, #e11d48, #be123c)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(225, 29, 72, 0.35)',
                    }}
                  >
                    <Play size={14} /> Start Speaking (Mic)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTextFallback(!isTextFallback)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {isTextFallback ? 'Switch to Mic' : 'Use Text Fallback'}
                </button>
              </div>

              {/* Timer indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remaining:</span>
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: secondsRemaining <= 5 ? 'var(--accent-rose)' : 'var(--accent-gold)',
                  }}
                >
                  {secondsRemaining}s
                </span>
              </div>
            </div>

            {/* Microphone Volume Level Bar */}
            {isRecording && !isTextFallback && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>Microphone Activity</span>
                  <span>{Math.round(micVolume * 100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(5, micVolume * 100)}%`,
                      background: '#10b981',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Transcription Box */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {isTextFallback ? 'Enter your initial thoughts on the topic:' : 'Live Speech Transcription:'}
              </label>
              {isTextFallback ? (
                <textarea
                  rows={4}
                  placeholder="Type your arguments regarding practical skills vs theoretical curriculum..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              ) : (
                <div
                  style={{
                    minHeight: '100px',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: transcript ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  {transcript || (isRecording ? 'Listening... Speak clearly into your microphone.' : 'Click "Start Speaking" and share your viewpoint.')}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                This is a rough baseline estimate from a short sample, not a psychometric or personality evaluation.
                Your profile will be saved even if you choose to skip or continue later.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Skip for now & go to Dashboard
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !transcript.trim()}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #1a2c22',
                  background: '#233a2d',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: !transcript.trim() ? 'not-allowed' : 'pointer',
                  opacity: !transcript.trim() ? 0.6 : 1,
                  boxShadow: '0 4px 15px rgba(35, 58, 45, 0.4)',
                }}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Baseline & Enter Dashboard'}
              </button>
            </div>
          </div>
        ) : (
          /* Assessment Results Card */
          <div>
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '1.5rem',
              }}
            >
              <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Baseline Established!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {result.baseline_summary}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clarity</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{Math.round(result.clarity_score)}%</div>
              </div>
              <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Topic Relevance</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{Math.round(result.relevance_score)}%</div>
              </div>
              <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speaking Pace</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)' }}>{Math.round(result.pace_wpm)} WPM</div>
              </div>
            </div>

            <button
              onClick={onComplete}
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
                boxShadow: '0 0 25px rgba(225, 29, 72, 0.35)',
              }}
            >
              Enter Practice Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
