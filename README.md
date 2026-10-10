# GD Arena — AI-Powered Group Discussion Practice Platform

[![CI Tests](https://img.shields.io/badge/tests-39%20passed-brightgreen.svg)](docs/TEST_PLAN.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/github-yogesshh--27%2FGD--Arena-black.svg)](https://github.com/yogesshh-27/GD-Arena)

**GD Arena** is an AI-powered, voice-first web application engineered for students preparing for high-stakes campus placement Group Discussions (GDs), competitive interview rounds, and communication assessments.

Simulates authentic group discussions with **3–5 distinct AI participants** and an impartial **AI Moderator**, supporting real-time voice, natural turn-taking, sub-second barge-in interruption, and **100% evidence-grounded performance feedback** backed by verbatim transcript quotes.

---

## 🌟 Key Features

1. **AI GD Practice Room (Core Feature)**:
   - **5 Distinct Archetypes**: *The Dominator* (assertive pace-setter), *The Data-Driven Analyst* (evidence-focused), *The Quiet Thinker* (concise impact), *The Constructive Collaborator* (synthesizer), and *The Off-Topic Drifter* (lateral tangents).
   - **Impartial Moderator**: Opens discussion, enforces time limits, encourages quiet candidates, and invites concluding summaries.
   - **Voice Engine & Sub-Second Barge-In**: Continuous speech recognition, multi-voice synthesis, and immediate audio cancellation when the candidate speaks.
2. **Evidence-Grounded Feedback (Non-Negotiable)**:
   - Evaluates performance across 9 placement criteria.
   - Every critique is programmatically validated against an **EXACT verbatim quote** from the recorded transcript. Fabricated quotes and hallucinatory assessments are strictly rejected.
   - Provides *"What You Could Have Said"* contextual alternative responses.
3. **Candidate Journey & Consistency Engine**:
   - 2-Step academic and communication onboarding.
   - 30-Second audio calibration assessment establishing a baseline.
   - Daily practice streaks with 52-week activity heatmap (Asia/Kolkata timezone rollover).
4. **Human GD Room (Peer Practice)**:
   - Real-time peer audio rooms powered by LiveKit WebRTC.
   - Host moderation controls, synchronized timers, and structured peer rubrics.
5. **High-Craft Editorial Design**:
   - Framed canvas layout inspired by editorial luxury templates with dark contrast bento grids and a 3D audio disc.
   - Clear disclosure banner: *"You are practising with AI-generated participants. Their voices and opinions are simulated for educational practice."*
6. **1-Click Demo Mode (`DEMO_MODE=true`)**:
   - Ready-to-use offline simulation out of the box with zero external paid credentials required.

---

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Speech API (STT/TTS).
- **Backend**: FastAPI (Python 3.10+), Pydantic v2, SQLite / PostgreSQL with SQLAlchemy & migrations.
- **Central Brain Package (`brain/`)**: Modular intelligence orchestrator, deterministic turn manager, transcript analyzer, and evidence validator.
- **Authentication**: JWT tokens + bcrypt password hashing. Pre-configured demo accounts (`demo@gdarena.dev`, `admin@gdarena.dev`).

---

## 🚀 Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/yogesshh-27/GD-Arena.git
cd GD-Arena
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Setup & Start Backend
```bash
# Install dependencies
pip install fastapi uvicorn pydantic python-jose passlib bcrypt

# Seed database with topics, personalities, and demo accounts
python -m backend.seed

# Launch FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 4. Setup & Start Frontend
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend available at: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 🧪 Automated Testing

Run the test suite (39 unit, integration, and E2E tests):
```bash
python -m pytest brain/tests/ backend/test_api.py -v
```

---

## 📚 Documentation Links

- [Test Plan & Acceptance Checks](docs/TEST_PLAN.md)
- [Status Matrix](docs/STATUS.md)
- [Known Limitations](docs/LIMITATIONS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Central Brain Architecture](brain/README.md)

---

## 📄 License
MIT License. Built for campus recruitment and student communication mastery.
