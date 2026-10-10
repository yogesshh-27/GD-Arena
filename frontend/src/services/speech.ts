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
  isAvailable: boolean;
}

export function createSpeechRecognizer(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (err: string) => void
): SpeechRecognitionHandler {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => {
        if (onError) onError('Web Speech API is not supported in this browser. Please use text input.');
      },
      stop: () => {},
      isAvailable: false,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

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
    if (onError && event.error !== 'no-speech') {
      onError(`Speech recognition error: ${event.error}`);
    }
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch {
        // Recognition already active
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Recognition already stopped
      }
    },
    isAvailable: true,
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
