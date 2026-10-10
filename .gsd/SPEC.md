# SPEC.md — GD Arena Project Specification

> **Status**: `FINALIZED`

## Vision
GD Arena is a voice-first, AI-powered Group Discussion practice platform built for students preparing for campus placements, interviews, and communication assessments. It provides realistic simulations with 3–5 distinct AI participants and an impartial AI moderator, real-time human rooms, live speech-to-text, natural turn-taking with barge-in interruption, and evidence-grounded performance evaluation reports.

## Goals
1. Provide an AI GD Room with 3–5 distinct AI participant personalities and a dedicated AI moderator.
2. Deliver real-time voice streaming with client-side VAD, STT, TTS, and sub-second barge-in cancellation.
3. Compute evidence-based performance feedback across 9 core GD dimensions where every quote is verbatim matched to the transcript.
4. Support Human GD Rooms with real-time audio rooms and peer feedback.
5. Provide a comprehensive student dashboard with streaks, performance analytics, and topic libraries.
6. Support a demo mode for zero-credential offline evaluation.

## Non-Goals (Out of Scope)
- Automated psychoanalysis or emotional state inference.
- Storing uncompressed raw audio permanently on disk.
- Self-granting admin privileges by student accounts.

## Users
- Engineering and management college students preparing for campus recruitment GD rounds.
- Instructors/Admins reviewing aggregate practice trends and managing topic catalogs.

## Constraints
- Python 3.14 backend / Brain Orchestrator with FastAPI + WebSockets.
- Modern React / Next.js / TypeScript frontend with Tailwind CSS and Lucide icons.
- Sub-second audio playback cancellation upon student barge-in.
- Verbatim evidence validation: no fabricated feedback quotes.

## Success Criteria
- [ ] End-to-end user journey: Landing -> Auth -> Onboarding -> Baseline Assessment -> Dashboard.
- [ ] AI GD Room running with live speech, distinct participant voices, and barge-in interruption.
- [ ] 100% verified quotes in post-GD reports against session transcript entries.
- [ ] Streak calculation accurately updating once per active day in user timezone.
- [ ] Human GD Room creation, joining, and peer feedback workflow.
