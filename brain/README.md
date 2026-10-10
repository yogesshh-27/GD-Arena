# GD Arena — Central Brain Architecture

The `brain/` package serves as the core intelligence, decision-making, and orchestration layer for **GD Arena**, an AI-powered, voice-first Group Discussion practice platform for students preparing for campus placements and technical evaluations.

The brain is completely decoupled from the user interface and frontend components. It enforces discussion governance, orchestrates natural turn-taking between multiple AI candidates and an AI moderator, manages session lifecycles, and computes empirical, evidence-grounded placement feedback reports.

---

## 1. Directory Structure and Module Responsibilities

```text
brain/
├── __init__.py                 # Public package exports (Orchestrator, SessionManager, Config, schemas)
├── config.py                   # Centralized Pydantic BaseSettings loading from environment variables
├── schemas.py                  # Pydantic v2 data models for states, events, transcripts, and reports
├── orchestrator.py             # Central controller managing the end-to-end discussion lifecycle
├── session_manager.py          # Session state machine, lifecycle transitions, and transcript logging
├── context_manager.py          # Shared discussion memory, arguments tracking, and prompt summaries
├── turn_manager.py             # Deterministic speaker selection, concurrency locking, and interruptions
├── moderator.py                # AI Moderator handling opening, interventions, and closing rounds
├── participant_engine.py       # AI Participant engine driving personas and peer-to-peer dialogues
├── personalities.py            # 5 Central participant archetypes (Dominator, Analyst, etc.)
├── prompts/
│   ├── moderator.txt           # Prompt template for moderator instructions
│   ├── participant.txt         # Prompt template for participant personas
│   └── feedback.txt            # Prompt template for 9-criteria evaluation
├── services/
│   ├── llm_service.py          # Provider-independent LLM layer (DemoLLMService & GeminiLLMService)
│   ├── speech_to_text.py       # Provider-independent STT interface with text-fallback support
│   ├── text_to_speech.py       # Provider-independent TTS interface with cancellation support
│   └── event_service.py        # Asynchronous event bus for WebSocket and telemetry subscribers
├── analytics/
│   ├── transcript_analyzer.py  # Objective extraction of student arguments, examples, and agreements
│   ├── speaking_metrics.py     # Measurable speaking times, turn counts, and floor-share percentages
│   └── feedback_engine.py      # Placement feedback generator grounded in exact transcript quotes
├── rules/
│   ├── discussion_rules.py     # Governance rules (room limits, speaker concurrency, closing triggers)
│   └── evidence_rules.py       # Strict verbatim substring validator for feedback quotations
├── storage/
│   └── session_repository.py   # In-memory session store with clean BaseSessionRepository interface
└── tests/
    ├── test_session_manager.py # State machine and lifecycle tests
    ├── test_turn_manager.py    # Concurrency and scheduling tests
    ├── test_evidence_rules.py  # Verbatim quote and grounding tests
    ├── test_feedback_engine.py # Metrics calculation and feedback generation tests
    └── test_e2e_demo.py        # 15 verification criteria tests for hackathon demo mode
```

---

## 2. How the Orchestrator Controls the Discussion

The `BrainOrchestrator` (`brain/orchestrator.py`) is the single entry point for all discussion operations:

1. **`create_session(config)`**: Validates that participant counts (3–5) and durations conform to `discussion_rules.py`. Selects distinct AI participant profiles from `personalities.py`.
2. **`start_session(session_id)`**: Transitions status from `READY` to `ACTIVE`, invokes `ModeratorEngine` to deliver the opening statement, synthesizes TTS audio, logs the turn into the transcript, and broadcasts `session.started`.
3. **`submit_student_turn(session_id, text, audio_bytes, is_interruption)`**: Transcribes microphone audio or cleans text input, handles student interruptions, commits the turn with a stable `entry_id` (`turn_0001_...`), and updates the shared discussion context.
4. **`request_next_turn(session_id)`**: Calls `TurnManager` to determine whether an AI participant, candidate, or moderator should speak. Generates the response, synthesizes audio, and yields the turn.
5. **`interrupt_speaker(session_id)`**: Halts the active AI speaker immediately, cancels speech playback, and logs an interruption event.
6. **`end_session(session_id)`**: Delivers the moderator's neutral concluding synthesis, transitions status to `COMPLETED`, and generates the verified final report.

---

## 3. How Participant Personalities Work

Profiles are defined in `brain/personalities.py` with distinct behavioral traits:

1. **The Dominator (Vikram Mehta)**: Assertive and confident (speaking frequency `0.85`, interruption tendency `0.40`). Proposes decisive viewpoints but is constrained from monopolizing turns.
2. **The Data-Driven Analyst (Ananya Sharma)**: Structured and logical (speaking frequency `0.65`, agreement bias `-0.10`). Challenges ungrounded claims with tradeoffs and systemic reasoning.
3. **The Quiet Thinker (Rohan Verma)**: Measured and concise (speaking frequency `0.35`, interruption tendency `0.05`). Contributes impactful, short insights (1–3 sentences).
4. **The Constructive Collaborator (Pooja Nair)**: Bridge-builder (agreement bias `+0.50`). Connects diverse views with "Building on what X mentioned..." formulations.
5. **The Off-Topic Drifter (Kabir Sen)**: Introduces creative tangents or analogies (topic adherence `0.65`), allowing realistic moderator redirection.

---

## 4. How Turn-Taking Decisions Are Made

`brain/turn_manager.py` implements a deterministic scheduling algorithm rather than random rotations:

- **Single Active Speaker**: Maintains a concurrency lock (`is_floor_busy()`), preventing overlapping AI speech.
- **Moderator Priority**: If discussion time reaches the closing threshold (`closing_threshold_seconds = 90`), the Moderator is scheduled to initiate the closing round.
- **Candidate Opportunity Windows**: If AI participants take `max_consecutive_ai_turns` (default: 3) consecutive turns without student participation, the floor explicitly invites the candidate.
- **Priority Scoring**:
  $$\text{Score} = (\text{SpeakingFrequency} \times 3.0) + (\text{TurnsSinceLastSpoke} \times 0.8) - (\text{TotalTurnsTaken} \times 1.2)$$
- **Anti-Repetition**: The immediate last speaker receives a heavy penalty (`-100.0`) to prevent back-to-back self-repetition.

---

## 5. Speech Processing Integration

The speech layer uses provider-independent service abstractions:

- **`brain/services/speech_to_text.py`**:
  - Implements `BaseSpeechToText`.
  - In demo mode or when testing without audio hardware, `process_text_fallback` accepts direct textual student submissions.
  - When audio bytes are provided, `transcribe_audio_chunk` handles transcription.
- **`brain/services/text_to_speech.py`**:
  - Implements `BaseTextToSpeech`.
  - Calculates speech durations based on natural speaking pace (140 WPM).
  - Associates distinct voice names with each participant persona.
  - Supports `cancel_playback` to immediately stop audio when a speaker is interrupted.

---

## 6. How Transcript Evidence is Validated

`brain/rules/evidence_rules.py` enforces strict academic integrity:

- **Verbatim Quote Match**: Every quote referenced in a feedback item must appear as an **exact, case-sensitive substring** inside the referenced student transcript entry.
- **Identity & Session Check**: The referenced `transcript_entry_id` must belong to the active session and the student candidate.
- **Graceful Sanitization**: If an LLM fabricates a quote or references a non-existent turn, the `EvidenceValidator` demotes the item to `insufficient_evidence` and strips invalid quotes.

---

## 7. How to Add a New Personality

To introduce a new personality:
1. Add an enum value to `PersonalityProfile` in `brain/schemas.py`.
2. Add a `ParticipantProfile` definition to `PERSONALITY_CATALOG` in `brain/personalities.py`.
3. Specify `speaking_frequency`, `interruption_tendency`, `agreement_bias`, `voice_name`, and persona prompt instructions.

---

## 8. How to Add a New AI or Speech Provider

- **LLM**: Subclass `BaseLLMService` in `brain/services/llm_service.py` and register it in `get_llm_service()`.
- **STT**: Subclass `BaseSpeechToText` in `brain/services/speech_to_text.py`.
- **TTS**: Subclass `BaseTextToSpeech` in `brain/services/text_to_speech.py`.

---

## 9. How to Enable Demo Mode

Demo mode runs out of the box with zero external configuration or paid keys:
```env
DEMO_MODE=true
```
In demo mode:
- All LLM responses are generated deterministically based on topic, context, and participant personas.
- Text-input fallback and simulated speech metadata are active.
- End-to-end GD practice, WebSocket streaming, and report generation function fully.

---

## 10. Running Tests

Run the comprehensive test suite with:
```bash
python -m pytest brain/tests/ backend/test_api.py -v
```

All 34 test cases cover:
- Session creation and lifecycle
- Boundary checks on participant counts (3–5)
- Personality stability
- Single active speaker enforcement
- Speech interruptions and cancellations
- Transcript sequence numbers and stable IDs
- Speaking metrics calculation
- Verbatim evidence validation and demotion
- Demo mode end-to-end execution
- FastAPI REST routes and health checks

---

## 11. Current Limitations & Future Roadmap

- **In-Memory Storage**: Current session storage is held in RAM; restarting the server clears historical sessions. (A SQLite repository can implement `BaseSessionRepository`).
- **Live Streaming Audio Buffers**: Audio chunks are currently simulated or transferred in Base64 blocks rather than raw Opus WebRTC audio pipelines.
