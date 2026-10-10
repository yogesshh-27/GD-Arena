/**
 * Speech Recognition (STT), Speech Synthesis (TTS), and Voice Activity Detection (VAD) Services.
 * Provides browser Web Speech API implementation with sub-second barge-in cancellation,
 * progressive in-place provisional transcription, and audio activity detection.
 */

// Active utterance token to prevent stale audio completion callbacks from triggering next turns
let currentSpeechToken = 0;

// Browser Speech Synthesis (TTS)
export function playSpokenAudio(
  text: string,
  voiceName?: string,
  profileType?: string,
  onStart?: () => void,
  onEnd?: () => void
): number {
  const token = ++currentSpeechToken;

  if (!('speechSynthesis' in window)) {
    if (onStart) onStart();
    setTimeout(() => {
      if (token === currentSpeechToken && onEnd) onEnd();
    }, Math.max(1200, (text.split(' ').length / 160) * 60 * 1000));
    return token;
  }

  // Cancel any ongoing utterance immediately (barge-in protection)
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Archetype-distinct voice character modulation
  if (profileType === 'DOMINATOR') {
    utterance.pitch = 0.85;
    utterance.rate = 1.12;
  } else if (profileType === 'DATA_DRIVEN') {
    utterance.pitch = 1.15;
    utterance.rate = 1.05;
  } else if (profileType === 'QUIET_CONTRIBUTOR') {
    utterance.pitch = 0.95;
    utterance.rate = 0.92;
  } else if (profileType === 'CREATIVE') {
    utterance.pitch = 1.25;
    utterance.rate = 1.08;
  } else if (profileType === 'OFF_TOPIC') {
    utterance.pitch = 1.05;
    utterance.rate = 1.0;
  } else {
    // Moderator / Default
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
  }

  // Pick suitable browser voice
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    if (voiceName) {
      const match = voices.find((v) => v.name.toLowerCase().includes(voiceName.toLowerCase()));
      if (match) {
        utterance.voice = match;
      }
    }
    // If no direct name match, cycle through voices for acoustic variety
    if (!utterance.voice && voices.length > 1) {
      const hash = (profileType || 'MODERATOR').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      utterance.voice = voices[hash % voices.length];
    }
  }

  utterance.onstart = () => {
    if (token === currentSpeechToken && onStart) onStart();
  };

  utterance.onend = () => {
    // Only invoke onEnd if this utterance was NOT cancelled
    if (token === currentSpeechToken && onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    // If cancelled / interrupted, do NOT trigger onEnd to prevent next AI turn
    if (e.error === 'interrupted' || e.error === 'canceled') {
      return;
    }
    if (token === currentSpeechToken && onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return token;
}

export function cancelSpokenAudio(): void {
  // Invalidate any active speech token so completed callbacks are discarded
  currentSpeechToken++;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Browser Speech Recognition (STT)
export interface SpeechRecognitionHandler {
  start: () => void;
  stop: () => void;
  reset: () => void;
  setLanguage: (lang: string) => void;
  isAvailable: boolean;
  isListening: () => boolean;
}

export interface StreamingSpeechCallbacks {
  onProvisional?: (interimText: string) => void;
  onFinalSegment?: (finalSegment: string, totalAccumulated: string) => void;
  onTranscript?: (text: string, isFinal: boolean, totalAccumulated?: string) => void;
  onError?: (err: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export function createSpeechRecognizer(
  onTranscriptOrCallbacks: ((text: string, isFinal: boolean, totalAccumulated?: string) => void) | StreamingSpeechCallbacks,
  legacyOnError?: (err: string) => void,
  defaultLang: string = 'en-IN'
): SpeechRecognitionHandler {
  const callbacks: StreamingSpeechCallbacks =
    typeof onTranscriptOrCallbacks === 'function'
      ? { onTranscript: onTranscriptOrCallbacks, onError: legacyOnError }
      : onTranscriptOrCallbacks;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (callbacks.onError) {
      callbacks.onError('Web Speech API is not supported in this browser. Please use Chrome/Edge or text input.');
    }
    return {
      start: () => {},
      stop: () => {},
      reset: () => {},
      setLanguage: () => {},
      isAvailable: false,
      isListening: () => false,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = defaultLang;

  let activeListening = false;
  let restartTimeout: any = null;
  let accumulatedFinal = '';

  recognition.onspeechstart = () => {
    if (callbacks.onSpeechStart) callbacks.onSpeechStart();
  };

  recognition.onspeechend = () => {
    if (callbacks.onSpeechEnd) callbacks.onSpeechEnd();
  };

  recognition.onresult = (event: any) => {
    let interim = '';
    let finalChunk = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i];
      if (item.isFinal) {
        finalChunk += item[0].transcript;
      } else {
        interim += item[0].transcript;
      }
    }

    if (finalChunk.trim()) {
      const segment = finalChunk.trim();
      accumulatedFinal = accumulatedFinal ? `${accumulatedFinal} ${segment}` : segment;
      if (callbacks.onFinalSegment) {
        callbacks.onFinalSegment(segment, accumulatedFinal);
      }
      if (callbacks.onTranscript) {
        callbacks.onTranscript(segment, true, accumulatedFinal);
      }
      if (callbacks.onProvisional) {
        callbacks.onProvisional('');
      }
    } else if (interim.trim()) {
      const provisional = interim.trim();
      if (callbacks.onProvisional) {
        callbacks.onProvisional(provisional);
      }
      if (callbacks.onTranscript) {
        callbacks.onTranscript(provisional, false, accumulatedFinal);
      }
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      // Normal browser timeout during silence; onend will keep it alive
      return;
    }
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      activeListening = false;
      if (callbacks.onError) {
        callbacks.onError('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
      }
      return;
    }
    if (event.error === 'audio-capture') {
      activeListening = false;
      if (callbacks.onError) callbacks.onError('No microphone hardware detected.');
      return;
    }
    if (event.error === 'aborted') {
      return;
    }
    console.warn('Speech recognition warning:', event.error);
  };

  recognition.onend = () => {
    // If user has not stopped listening, auto-restart to prevent silent timeouts in Chrome/Edge
    if (activeListening) {
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        if (activeListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }
      }, 300);
    }
  };

  return {
    start: () => {
      activeListening = true;
      try {
        recognition.start();
      } catch (err) {
        // Already active
      }
    },
    stop: () => {
      activeListening = false;
      clearTimeout(restartTimeout);
      try {
        recognition.stop();
      } catch (err) {
        // Already stopped
      }
    },
    reset: () => {
      accumulatedFinal = '';
    },
    setLanguage: (lang: string) => {
      recognition.lang = lang;
      if (activeListening) {
        try {
          recognition.stop();
        } catch {}
      }
    },
    isAvailable: true,
    isListening: () => activeListening,
  };
}

// Voice Activity Detection (VAD) & Web Audio Volume Meter
export interface VADHandler {
  stop: () => void;
  resetSilenceTimer: () => void;
}

export interface VADOptions {
  onVolumeChange?: (volume: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (silenceDurationMs: number) => void;
  speechThreshold?: number;     // Volume needed to trigger speech (default: 0.07)
  silenceThreshold?: number;    // Volume below which is considered silence (default: 0.04)
  minSpeechFrames?: number;     // Consecutive frames needed to confirm speech (default: 4, ~60ms)
  silenceTimeoutMs?: number;    // Silence duration before onSpeechEnd fires (default: 1800ms)
}

export async function setupMicrophoneVAD(options: VADOptions): Promise<VADHandler> {
  const {
    onVolumeChange,
    onSpeechStart,
    onSpeechEnd,
    speechThreshold = 0.07,
    silenceThreshold = 0.04,
    minSpeechFrames = 4,
    silenceTimeoutMs = 1800,
  } = options;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isRunning = true;
    let consecutiveSpeechFrames = 0;
    let isSpeaking = false;
    let lastSpeechTimestamp = 0;
    let silenceTimer: any = null;

    const checkAudio = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1.0, avg / 128.0);

      if (onVolumeChange) {
        onVolumeChange(normalized);
      }

      const now = performance.now();

      if (normalized >= speechThreshold) {
        consecutiveSpeechFrames++;
        if (consecutiveSpeechFrames >= minSpeechFrames) {
          lastSpeechTimestamp = now;
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }

          if (!isSpeaking) {
            isSpeaking = true;
            if (onSpeechStart) {
              onSpeechStart();
            }
          }
        }
      } else if (normalized <= silenceThreshold) {
        consecutiveSpeechFrames = 0;
        if (isSpeaking && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (isSpeaking && isRunning) {
              isSpeaking = false;
              const silenceDuration = Math.round(performance.now() - lastSpeechTimestamp);
              if (onSpeechEnd) {
                onSpeechEnd(silenceDuration);
              }
            }
            silenceTimer = null;
          }, silenceTimeoutMs);
        }
      } else {
        // In-between threshold: keep state, maintain current speech timestamp if speaking
        if (isSpeaking) {
          lastSpeechTimestamp = now;
        }
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();

    return {
      stop: () => {
        isRunning = false;
        if (silenceTimer) clearTimeout(silenceTimer);
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
      },
      resetSilenceTimer: () => {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
        lastSpeechTimestamp = performance.now();
      },
    };
  } catch (err) {
    throw new Error('Microphone access denied or unavailable.');
  }
}

// Backward compatible wrapper
export async function setupMicrophoneVolumeMeter(
  onVolumeChange: (volume: number) => void
): Promise<{ stop: () => void }> {
  return setupMicrophoneVAD({ onVolumeChange });
}
