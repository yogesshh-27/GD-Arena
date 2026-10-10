# ROADMAP.md — GD Arena Development Plan

> **Current Phase**: Phase 1 Foundation
> **Milestone**: v1.0 Production-Ready Release

## Must-Haves
- [ ] Landing page with AI practice disclosure and value props
- [ ] Authentication with student and admin roles
- [ ] 2-step onboarding and 20-30s baseline audio assessment
- [ ] Full dashboard with daily streaks and performance cards
- [ ] AI GD Room with live turn-taking, barge-in interruption, and distinct AI voices
- [ ] Evidence-grounded post-GD reports with verbatim transcript quotes
- [ ] Human GD Room with real-time peer discussion and feedback
- [ ] Progress analytics with category breakdown and streaks

## Phases

### Phase 1: Foundation
**Status**: 🔄 In Progress
**Objective**: Establish project layout, database schema & migrations, auth system, landing page, student onboarding flow, and initial baseline speech assessment with text fallback.

### Phase 2: Dashboard
**Status**: ⬜ Not Started
**Objective**: Build vertical navigation sidebar, profile card, streak tracking with heatmap and daily increment rules, performance overview cards, recent activity, and quick-action entries.

### Phase 3: AI GD Room
**Status**: ⬜ Not Started
**Objective**: Build topic library & custom topic generator, room setup wizard, 3-5 AI participant cards with speaking waveforms, real-time WebSocket orchestration, STT/TTS streaming, and sub-second barge-in cancellation.

### Phase 4: Reports & Analytics Persistence
**Status**: ⬜ Not Started
**Objective**: Automate report generation from real transcript records, validate exact quote grounding, display 9-criterion rubrics, "What You Could Have Said" suggestions, and action plan.

### Phase 5: Human GD Room
**Status**: ⬜ Not Started
**Objective**: Room lobby, discovery, capacity limits, live room audio/presence, host controls, and peer feedback submission.

### Phase 6: Progress & Analytics
**Status**: ⬜ Not Started
**Objective**: Score trends, speaking share analytics over time, practice recommendations, and Hinglish/language filters.

### Phase 7: Hardening, Security & Verification
**Status**: ⬜ Not Started
**Objective**: Browser verification of all user flows, rate-limiting, RBAC checks, `.env.example`, README, DEPLOYMENT.md, TEST_PLAN.md, and LIMITATIONS.md.
