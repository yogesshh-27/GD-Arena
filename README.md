# GD Arena — AI-Powered Group Discussion Practice Platform

[![Tests](https://img.shields.io/badge/tests-39%20passed-brightgreen.svg)](docs/TEST_PLAN.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/github-yogesshh--27%2FGD--Arena-black.svg)](https://github.com/yogesshh-27/GD-Arena)

---

## 1. What It Does (Problem Statement #4)

**GD Arena** is an AI-powered, voice-first group discussion simulator designed to help students master campus-placement GD rounds on demand without needing to assemble a physical peer group. It places the candidate in a realistic audio room alongside 3–5 adaptive AI participants and an impartial AI moderator with sub-second speech barge-in and conversational turn-taking. Immediately after the discussion, it generates an evidence-based report that evaluates the candidate across 9 communication dimensions, strictly grounded in exact verbatim quotes from the live transcript.

---

## 2. Done / Left / Plan

### What Works Now (Done)
- **Central Brain Architecture (`brain/`)**: Modular Python intelligence engine with 39 passing unit and integration tests (`pytest brain/tests/ backend/test_api.py -v`).
- **5 Distinct AI Archetypes**: The Dominator (assertive, pace-setter), The Data-Driven Analyst (logical, challenges claims), The Quiet Thinker (thoughtful, concise), The Creative Thinker (lateral angles), and The Off-Topic Drifter (tests candidate redirection). Each archetype features its own system prompt, distinct communication goals, and pitch/rate acoustic modulation.
- **AI Moderator Engine**: Impartial floor orchestrator that welcomes candidates, frames the topic, monitors time limits, rescues stalls, and conducts closing summaries.
- **Voice Engine & Sub-Second Barge-In**: Continuous speech recognition with provisional/final transcripts, multi-voice synthesis, and immediate audio cancellation when the candidate speaks.
- **Strict Evidence Validator**: Non-negotiable requirement where 100% of feedback items are programmatically matched against verbatim transcript substrings, rejecting hallucinations.
- **Candidate Journey & Streak Tracker**: 2-Step academic onboarding, 30-second audio calibration assessment, daily streak engine with a 52-week consistency heatmap in the user's timezone (`Asia/Kolkata`).
- **Human Peer GD Room**: Multi-user room creation (public or private with passkey), participant capacity enforcement, host timer synchronization, and peer review forms.
- **Editorial 21st.dev UI**: High-craft framed canvas layout with 3D audio disc, circuit interconnect chips, dark contrast bento cards, and responsive sidebar navigation.
- **Demo Mode (`DEMO_MODE=true`)**: Full offline fallback with pre-seeded demo accounts (`demo@gdarena.dev`, `admin@gdarena.dev`) requiring zero external paid credentials.

### What is Left (Next 16 Hours)
- **LiveKit Cloud Credentials Binding**: Connecting live LiveKit Cloud WebRTC credentials for multi-participant peer audio rooms in production.
- **Deepgram Streaming WebSocket Adapter**: Deploying the server-side Deepgram Nova-2 streaming proxy for sub-200ms speech-to-text latency.
- **ElevenLabs High-Fidelity Voice Mapping**: Assigning distinct ElevenLabs cloned voice IDs per archetype on paid production deployments.

### Plan to Finish It
1. **Hour 0–4**: Provision LiveKit Cloud project and configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in production `.env`.
2. **Hour 5–8**: Connect server-side Deepgram streaming WebSocket proxy in `backend/api/websocket.py` with automatic browser Web Speech API fallback.
3. **Hour 9–12**: Bind ElevenLabs / Deepgram Aura voice IDs into `brain/services/text_to_speech.py` with character mapping for Vikram, Priya, Ananya, Kabir, and Arjun.
4. **Hour 13–16**: Run multi-user browser stress tests across mobile and desktop devices and verify edge DNS routing on Vercel and Render.

---

## 3. Architecture and Why

```text
GD Arena
├── Frontend (Vite / React 19 + TypeScript + Tailwind CSS)
│   ├── Framed 21st.dev Editorial Design System & 3D Audio Disc
│   ├── Web Speech API (STT & TTS with Archetype Pitch/Rate Modulation)
│   └── Client-side VAD & Sub-Second Barge-In Controller
│
├── Backend (FastAPI + SQLAlchemy + Python-JOSE + Pydantic v2)
│   ├── REST Route Handlers (Auth, Sessions, Topics, Streaks, Reports)
│   ├── WebSocket Streaming Hub (Real-time discussion orchestration)
│   └── SQLite / PostgreSQL Relational Database with Row-Level Security
│
└── Central Brain Package (brain/)
    ├── Deterministic Turn Manager (Speaker lock, turn queue, barge-in)
    ├── AI Moderator Engine (Floor control, drift redirect, closing round)
    ├── 5 Participant Archetypes (Distinct system prompts & speaking frequencies)
    └── Evidence Engine (Strict verbatim transcript substring matching)
```

### Why These Technical Choices Were Made:
1. **Decoupled Brain Package (`brain/`)**: Discussion business logic, scoring rubrics, and persona prompts are isolated in a standalone Python intelligence package rather than mixed into UI components or route handlers. This allows testing with deterministic mock fixtures and seamless swapping of LLM providers.
2. **FastAPI for Backend**: Group discussions require low latency, asynchronous WebSocket event handling, and high-performance serialization. FastAPI offers native async support, automated OpenAPI docs, and clean integration with Python's AI ecosystem.
3. **Deterministic Turn Management vs Single-LLM Chat**: Instead of asking one LLM to simulate multiple participants at once (which produces robotic turn-taking and unnatural synchrony), our orchestrator manages a discrete turn queue where each AI participant acts independently, disagrees, builds on previous remarks, or pauses.
4. **Relational Data Store (SQLite / PostgreSQL)**: Transcripts, speaker turns, streaks, and evidence-grounded reports require relational integrity with foreign keys (`session_id`, `speaker_id`, `transcript_segment_id`) to ensure no feedback quote is ever orphaned or fabricated.

---

## 4. What We Added (Beyond the Brief)

1. **Editorial 21st.dev UI Architecture**: Built a framed canvas layout with tactile 3D audio disc physics, circuit interconnect candidate chips, and dark contrast bento grids inspired by award-winning modern fintech landing pages.
2. **Archetype Voice Character Modulation**: Implemented pitch and speech-rate acoustic modulation for browser speech synthesis (`DOMINATOR`: 0.85 pitch / 1.12 rate; `DATA_DRIVEN`: 1.15 pitch / 1.05 rate; `CREATIVE`: 1.25 pitch; `QUIET`: 0.95 pitch) so each participant sounds audibly unique even without paid cloud TTS credits.
3. **Network & Call Resilience Engine**: Designed auto-recovering turn scheduling (`scheduleNextTurn`) that automatically recovers from network drops or provider timeouts without freezing the discussion or losing transcript history.
4. **1-Click Quick Evaluator Login**: Added quick-fill authentication buttons for both Student and Admin demo accounts on the login screen, allowing judges to test the app in seconds.
5. **Pre-Discussion Equipment & Room Preview**: Added an audio check and participant roster preview screen before room entry so students can verify microphone inputs and review participant archetypes before the clock starts.

---

## 5. How to Run It

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yogesshh-27/GD-Arena.git
cd GD-Arena

# 2. Setup Environment Variables
cp .env.example .env

# 3. Setup & Start Backend (Python 3.10+)
pip install fastapi uvicorn pydantic python-jose passlib bcrypt
python -m backend.seed                               # Seeds demo accounts & 22 topics
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 4. Setup & Start Frontend (Node.js 18+)
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Visit [http://localhost:5173](http://localhost:5173).

### Test Login Credentials
- **Student Account**: `demo@gdarena.dev` / `Demo@1234`
- **Admin Account**: `admin@gdarena.dev` / `Admin@1234`
- Or click the **"Demo Student"** 1-click button on the login screen.

### Live Production Deployment
- **Frontend (Vercel)**: Configured with `vercel.json` rewrites and `VITE_API_URL`.
- **Backend (Render / Railway)**: Standard Python Uvicorn service running `backend.main:app`.

---

## 6. Tools and AI Used

- **Language Models**: Google Gemini 2.5 Pro / Flash & Anthropic Claude 3.5 Sonnet adapters (with complete offline simulation in `DEMO_MODE=true`).
- **Speech-to-Text (STT)**: Deepgram Nova-2 streaming adapter with Web Speech API browser fallback and text typing fallback.
- **Text-to-Speech (TTS)**: ElevenLabs multi-voice synthesis / Deepgram Aura with browser `SpeechSynthesis` archetype modulation.
- **Frontend Frameworks**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend & Database**: FastAPI, SQLAlchemy, SQLite (local) / PostgreSQL (production), Pydantic v2.

### AI Disclosure & Transparency
To ensure ethical transparency:
1. **Prominent Hero Banner**: Displayed across the landing page and pre-discussion room: *"You are practising with AI-generated participants. Their voices and opinions are simulated for educational practice."*
2. **Participant Badges**: Every simulated speaker card in the active discussion displays an explicit `AI PARTICIPANT` badge alongside their system archetype tag.
3. **No Fabricated Feedback**: The report engine explicitly labels quotes as `EXACT TRANSCRIPT QUOTE` verified against stored turns, with empty categories marked as *"Insufficient evidence in this session."*

---

## 7. Who It Is For

- **Campus Placement Aspirants (Engineering & MBA Students)**: Tier-1, Tier-2, and Tier-3 college students preparing for technical and HR group discussion elimination rounds who lack group study partners on demand.
- **Placement Training Cells & Colleges**: Placement officers looking for an objective, standardized practice platform with verifiable evidence and scoring rubrics.
- **Why Students Return**:
  - **Daily Streaks & Consistency Heatmap**: Encourages consistent practice habits leading up to campus recruitment drives.
  - **No Fear of Judgment**: A safe, low-stakes environment to practice speaking up, interrupting politely, and debating assertive personalities.
  - **Measurable Improvement**: Real evidence-grounded reports with *"What You Could Have Said"* recommendations that tangibly build confidence turn by turn.
