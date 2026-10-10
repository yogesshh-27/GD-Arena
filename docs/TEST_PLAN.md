# Test Plan & Verification Matrix — GD Arena

## 1. Automated Test Suite (39 Tests Passed)

The codebase contains a comprehensive automated test suite covering unit, integration, and E2E API flows:

```bash
python -m pytest brain/tests/ backend/test_api.py -v
```

### Test Coverage Breakdown:
1. `brain/tests/test_turn_manager.py`:
   - Single active speaker lock.
   - Anti-repetition penalties.
   - Candidate opportunity balancing under dominator load.
   - Closing round transitions and summarization invites.
2. `brain/tests/test_evidence_engine.py`:
   - Verbatim transcript quote verification against stored turns.
   - Rejection of fabricated quotes or hallucinatory feedback.
   - Handling sessions with insufficient evidence per category.
3. `brain/tests/test_orchestrator.py`:
   - Full lifecycle from `CREATED` -> `READY` -> `ACTIVE` -> `CONCLUDED`.
   - AI participant generation with persona prompts.
   - Sub-second barge-in cancellation and speaker turn truncation.
4. `backend/test_api.py`:
   - Authentication endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
   - Session REST endpoints (`/api/sessions`, `/api/sessions/{id}/start`, `/api/sessions/{id}/next-turn`, `/api/sessions/{id}/end`).
   - Human peer room lifecycle (`/api/human-rooms`, `/api/human-rooms/{id}/join`, `/api/human-rooms/{id}/feedback`).

---

## 2. Browser E2E Acceptance Checks

Executed directly in browser with active developer tooling:

1. **Landing Page (`/`)**:
   - Hero headline: *"Ace the GD in a single afternoon"*.
   - Outer framed editorial canvas (`arena-root-frame` + `arena-canvas`).
   - Interconnected circuit candidate chips (`Vikram · Dominator`, `Priya · Data Thinker`).
   - Centerpiece 3D Voice Disc with gentle floating physics and pulse glow.
   - Dual-card preview of live discussion and verbatim evidence audit.
   - Mandatory AI disclosure pill banner clearly visible.
2. **Authentication (`/auth`)**:
   - 1-Click quick fill buttons for `Demo Student` and `Demo Admin`.
   - Secure JWT token handling, persistent session recovery.
3. **Candidate Onboarding & 30s Baseline Assessment**:
   - Academic details collection (college, degree, year, branch).
   - Communication experience and self-confidence assessment.
   - 30-second audio calibration prompt with live waveform and text input fallback.
4. **Dashboard (`/dashboard`)**:
   - Active streak tracking (Asia/Kolkata timezone rollover).
   - 52-week activity heatmap.
   - Performance dimension averages across communication categories.
   - Quick action pathways for AI GD Practice and Human Peer Room.
5. **AI GD Room (`/ai-room`)**:
   - Room configuration: 3–5 participants, difficulty, format, AI patience.
   - Pre-discussion equipment check and AI disclosure confirmation.
   - Impartial Moderator opening turn and floor invitation.
   - Live speech transcription & text input.
   - Barge-in button with immediate audio cancellation.
   - Auto report generation on session end.
6. **Performance Report (`/report`)**:
   - 9 Placement dimensions scored (0–100 rubric).
   - Every substantive evaluation grounded in an EXACT verbatim quote from the transcript.
   - "What You Could Have Said" contextual placement suggestions.
   - Actionable 3-point improvement plan.
7. **Human GD Room (`/human-room`)**:
   - Public and private room creation with passkey.
   - Participant capacity enforcement and leave/join events.
