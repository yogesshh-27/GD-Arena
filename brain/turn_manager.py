"""
Turn Manager for GD Arena.

Deterministic turn-taking and speaker-selection engine:
- Guarantees exactly one active speaker at a time
- Prevents simultaneous AI speech
- Balances speaking participation while honoring personality tendencies
- Prioritizes student opportunity windows and moderator interventions
- Supports interruption and speech cancellation
"""

from typing import Dict, List, Optional
import random
from brain.config import config
from brain.schemas import (
    ParticipantConfig,
    PersonalityProfile,
    SessionConfig,
    SpeakerDecision,
    SpeakerType,
    TranscriptEntry,
    TurnType,
)


class TurnManager:
    """Calculates and enforces GD speaker turns."""

    def __init__(
        self,
        max_consecutive_ai_turns: int = 3,
        pause_between_turns_seconds: float = 1.5,
    ) -> None:
        self.max_consecutive_ai_turns = max_consecutive_ai_turns
        self.pause_between_turns_seconds = pause_between_turns_seconds
        self.active_speaker_id: Optional[str] = None
        self.active_speaker_type: Optional[SpeakerType] = None
        self.consecutive_ai_turns_count: int = 0

    def set_active_speaker(self, speaker_id: Optional[str], speaker_type: Optional[SpeakerType] = None) -> None:
        """Mark a speaker as actively speaking (locking the floor)."""
        self.active_speaker_id = speaker_id
        self.active_speaker_type = speaker_type

    def clear_active_speaker(self) -> None:
        """Release the floor."""
        self.active_speaker_id = None
        self.active_speaker_type = None

    def is_floor_busy(self) -> bool:
        """Check if an active speaker currently holds the floor."""
        return self.active_speaker_id is not None

    def decide_next_speaker(
        self,
        participants: List[ParticipantConfig],
        transcript_history: List[TranscriptEntry],
        elapsed_seconds: float,
        total_duration_seconds: float,
        is_closing_phase: bool = False,
    ) -> SpeakerDecision:
        """
        Determines the next speaker deterministically based on:
        - Closing timeline checks
        - Student opportunity balance
        - Recency and personality weight scoring
        - Moderator intervention criteria
        """
        # Rule 1: If closing phase triggered or time expired, Moderator directs closing
        time_remaining = total_duration_seconds - elapsed_seconds
        if time_remaining <= config.closing_threshold_seconds or is_closing_phase:
            # Check if moderator has already introduced closing
            closing_turns = [
                t for t in transcript_history
                if t.speaker_type == SpeakerType.MODERATOR and t.turn_type == TurnType.CLOSING
            ]
            if not closing_turns:
                return SpeakerDecision(
                    speaker_id="moderator_001",
                    speaker_name="Moderator",
                    speaker_type=SpeakerType.MODERATOR,
                    reason="Time threshold reached; initiating formal closing round.",
                    confidence=1.0,
                    recommended_turn_type=TurnType.CLOSING,
                )

        # Rule 2: If no one has spoken yet, Moderator opens
        if not transcript_history:
            return SpeakerDecision(
                speaker_id="moderator_001",
                speaker_name="Moderator",
                speaker_type=SpeakerType.MODERATOR,
                reason="Discussion start; opening statement required.",
                confidence=1.0,
                recommended_turn_type=TurnType.OPENING,
            )

        last_entry = transcript_history[-1]
        last_speaker_id = last_entry.speaker_id

        # Rule 3: Count consecutive AI turns since student last spoke
        consecutive_ai = 0
        for entry in reversed(transcript_history):
            if entry.speaker_type == SpeakerType.STUDENT:
                break
            if entry.speaker_type == SpeakerType.PARTICIPANT:
                consecutive_ai += 1

        self.consecutive_ai_turns_count = consecutive_ai

        # If AI participants have taken too many consecutive turns, invite student
        if self.consecutive_ai_turns_count >= self.max_consecutive_ai_turns:
            return SpeakerDecision(
                speaker_id="student",
                speaker_name="Candidate",
                speaker_type=SpeakerType.STUDENT,
                reason=f"Candidate opportunity window opened after {consecutive_ai} consecutive AI turns.",
                confidence=0.9,
                recommended_turn_type=TurnType.STATEMENT,
            )

        # Rule 4: Select best AI participant using multi-factor priority score
        # Calculate turn counts per participant
        turn_counts: Dict[str, int] = {p.id: 0 for p in participants}
        for entry in transcript_history:
            if entry.speaker_id in turn_counts:
                turn_counts[entry.speaker_id] += 1

        scores: Dict[str, float] = {}
        for p in participants:
            # Prevent immediate self-repetition
            if p.id == last_speaker_id:
                scores[p.id] = -100.0
                continue

            base_freq = p.profile.speaking_frequency  # 0.1 - 1.0
            turns_taken = turn_counts.get(p.id, 0)

            # Recency penalty: check how many turns ago this participant spoke
            turns_since_last_spoke = 10
            for idx, entry in enumerate(reversed(transcript_history)):
                if entry.speaker_id == p.id:
                    turns_since_last_spoke = idx
                    break

            # Formula: high freq + turns since last spoke - turns already taken
            score = (base_freq * 3.0) + (turns_since_last_spoke * 0.8) - (turns_taken * 1.2)
            scores[p.id] = score

        # Pick participant with highest score
        best_p = max(participants, key=lambda p: scores.get(p.id, -999.0))

        # Determine turn type (counterargument vs statement)
        rec_type = TurnType.COUNTERARGUMENT if best_p.profile.profile_type == PersonalityProfile.ANALYST else TurnType.STATEMENT

        return SpeakerDecision(
            speaker_id=best_p.id,
            speaker_name=best_p.name,
            speaker_type=SpeakerType.PARTICIPANT,
            reason=f"Selected {best_p.name} ({best_p.profile.profile_type.value}) based on balance score {scores[best_p.id]:.2f}.",
            confidence=0.85,
            recommended_turn_type=rec_type,
        )

    def handle_interruption(self, session_id: str, interrupting_speaker_id: str) -> Optional[str]:
        """
        Processes an interruption event.
        Returns the ID of the interrupted speaker whose audio is to be cancelled.
        """
        interrupted = self.active_speaker_id
        # Swap active speaker to the interrupter
        self.active_speaker_id = interrupting_speaker_id
        return interrupted
