"""
Discussion Rules and Validation Policies for GD Arena.

Encapsulates all governance rules for group discussions:
- Room configuration limits (3-5 AI participants, 1 moderator)
- Lifecycle rules and turn submission permissions
- Concurrency rules (single active speaker)
- Closing phase triggers
- Idempotency and anti-duplication
"""

from typing import List, Optional
from brain.schemas import SessionConfig, SessionStatus, SpeakerType, TranscriptEntry


class DiscussionRuleViolation(Exception):
    """Raised when a GD rule or policy is violated."""
    pass


class DiscussionRules:
    """Configurable governance engine for GD sessions."""

    def __init__(
        self,
        min_participants: int = 3,
        max_participants: int = 5,
        min_duration_seconds: int = 60,
        max_duration_seconds: int = 3600,
        closing_threshold_seconds: int = 90,
        pause_between_turns_seconds: float = 1.5,
    ) -> None:
        self.min_participants = min_participants
        self.max_participants = max_participants
        self.min_duration_seconds = min_duration_seconds
        self.max_duration_seconds = max_duration_seconds
        self.closing_threshold_seconds = closing_threshold_seconds
        self.pause_between_turns_seconds = pause_between_turns_seconds

    def validate_session_config(self, config: SessionConfig) -> None:
        """Validate session parameters before initialization."""
        if not (self.min_participants <= config.participant_count <= self.max_participants):
            raise DiscussionRuleViolation(
                f"Participant count must be between {self.min_participants} and {self.max_participants}. "
                f"Received {config.participant_count}."
            )

        if not (self.min_duration_seconds <= config.duration_seconds <= self.max_duration_seconds):
            raise DiscussionRuleViolation(
                f"Duration must be between {self.min_duration_seconds}s and {self.max_duration_seconds}s. "
                f"Received {config.duration_seconds}s."
            )

        if not config.topic or len(config.topic.strip()) < 3:
            raise DiscussionRuleViolation("Discussion topic must be at least 3 non-whitespace characters.")

    def can_submit_turn(self, status: SessionStatus) -> bool:
        """Verify if session can accept a new turn."""
        if status in (SessionStatus.COMPLETED, SessionStatus.ERROR):
            return False
        if status not in (SessionStatus.ACTIVE, SessionStatus.CLOSING):
            return False
        return True

    def validate_single_active_speaker(
        self,
        current_active_speaker_id: Optional[str],
        incoming_speaker_id: str,
        is_interruption: bool = False
    ) -> None:
        """Ensure only one AI speaker talks at a time unless an interruption is explicitly flagged."""
        if current_active_speaker_id and current_active_speaker_id != incoming_speaker_id:
            if not is_interruption:
                raise DiscussionRuleViolation(
                    f"Speaker '{current_active_speaker_id}' is currently active. "
                    f"Incoming turn from '{incoming_speaker_id}' cannot overlap without interruption."
                )

    def is_closing_round_due(self, elapsed_seconds: float, total_duration_seconds: float) -> bool:
        """Check if time remaining is within the closing threshold."""
        remaining = total_duration_seconds - elapsed_seconds
        return remaining <= self.closing_threshold_seconds

    def is_duplicate_transcript_entry(
        self,
        new_entry: TranscriptEntry,
        existing_entries: List[TranscriptEntry]
    ) -> bool:
        """Prevent duplicate submissions caused by network retries or repeated speech events."""
        if not existing_entries:
            return False
        last = existing_entries[-1]
        # Same speaker, identical text within last turn
        if last.speaker_id == new_entry.speaker_id and last.text.strip().lower() == new_entry.text.strip().lower():
            return True
        return False
