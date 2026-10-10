/**
 * Speech Recognition (STT), Speech Synthesis (TTS), and Audio Activity Services.
 * Provides browser Web Speech API implementation with text fallbacks and sub-second barge-in cancellation.
 */

// Browser Speech Synthesis (TTS)
export function playSpokenAudio(
  text: string,
  voiceName?: string,
  profileType?: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!('speechSynthesis' in window)) {
    if (onStart) onStart();
    setTimeout(() => {
      if (onEnd) onEnd();
    }, Math.max(1200, (text.split(' ').length / 160) * 60 * 1000));
    return;
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
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

export function cancelSpokenAudio(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Browser Speech Recognition (STT)
export interface SpeechRecognitionHandler {
  start: () => void;
  stop: () => void;
  setLanguage: (lang: string) => void;
  isAvailable: boolean;
  isListening: () => boolean;
}

export function createSpeechRecognizer(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (err: string) => void,
  defaultLang: string = 'en-IN'
): SpeechRecognitionHandler {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError('Web Speech API is not supported in this browser. Please use Chrome/Edge or text input.');
    return {
      start: () => {},
      stop: () => {},
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

  recognition.onresult = (event: any) => {
    let interim = '';
    let finalStr = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const item = event.results[i];
      if (item.isFinal) {
        finalStr += item[0].transcript;
      } else {
        interim += item[0].transcript;
      }
    }

    if (finalStr.trim()) {
      onTranscript(finalStr.trim(), true);
    } else if (interim.trim()) {
      onTranscript(interim.trim(), false);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'no-speech') {
      // Normal browser timeout during silence; onend will keep it alive
      return;
    }
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      activeListening = false;
      if (onError) onError('Microphone access was denied. Please allow microphone permissions in your browser URL bar.');
      return;
    }
    if (event.error === 'audio-capture') {
      activeListening = false;
      if (onError) onError('No microphone hardware detected.');
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

// Web Audio API Microphone Volume Meter (for VAD & Visualizer)
export async function setupMicrophoneVolumeMeter(
  onVolumeChange: (volume: number) => void
): Promise<{ stop: () => void }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isRunning = true;

    const checkVolume = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1.0, avg / 128.0);
      onVolumeChange(normalized);
      requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return {
      stop: () => {
        isRunning = false;
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
      },
    };
  } catch (err) {
    throw new Error('Microphone access denied or unavailable.');
  }
}
