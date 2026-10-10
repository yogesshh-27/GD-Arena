# LIMITATIONS.md — GD Arena Known Limitations

This document transparently records any architectural boundaries, provider trade-offs, and features operating under simulation in accordance with GD Arena engineering standards.

## 1. Speech Synthesis & Interruption (Barge-in)
- **Local Fallback Mode**: In `DEMO_MODE=true` or without an external speech synthesis API key, TTS audio is represented using browser SpeechSynthesis or timing metadata markers.
- **Barge-in Latency**: When a student interrupts while an AI is speaking, the orchestrator cancels speech synthesis and drops queued audio chunks within ~100–250ms on the client. External cloud TTS providers with stream buffering may experience slight provider-side cancel delays, but frontend audio output is halted immediately.

## 2. Speech-to-Text Recognition
- **Microphone Hardware Access**: If microphone permission is denied or no audio input device is present, the application gracefully provides a text-input fallback.
- **Browser Web Speech API**: In environments without a Deepgram API key, the client uses the native browser Web Speech API with provisional and final transcript flags.

## 3. Human GD Audio
- **LiveKit / WebRTC Audio**: WebRTC peer-to-peer audio requires valid LiveKit credentials. In offline demo mode, human room lobby management, chat, presence, and peer feedback operate with simulated network participants.

## 4. Assessment Calibration
- The initial 20–30 second speaking assessment produces a preliminary baseline of clarity, pacing, and idea structure from a short sample; it does not constitute a psychometric or comprehensive placement evaluation.
