"""
Session Manager for GD Arena.

Encapsulates complete discussion session state, lifecycle transitions,
turn sequencing, transcript recording, and session isolation.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from brain.schemas import (
    DiscussionPhase,
    ParticipantConfig,
    SessionConfig,
    SessionStatus,
    SpeakerType,
    TranscriptEntry,
    TurnType,
)
from brain.storage.session_repository import BaseSessionRepository, InMemorySessionRepository


class InvalidSessionStateError(Exception):
    """Raised when an invalid state transition or operation on session state is attempted."""
    pass


class SessionNotFoundError(Exception):
    """Raised when a requested session ID does not exist."""
    pass


class SessionState:
    """Internal model representing the complete runtime state of a GD session."""

    def __init__(
        self,
        session_id: str,
        config: SessionConfig,
        participants: List[ParticipantConfig],
        moderator_name: str = "Moderator",
    ) -> None:
        self.session_id: str = session_id
        self.config: SessionConfig = config
        self.participants: List[ParticipantConfig] = participants
        self.moderator_name: str = moderator_name
        self.status: SessionStatus = SessionStatus.CREATED
        self.phase: DiscussionPhase = DiscussionPhase.SETUP

        self.created_at: datetime = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.ended_at: Optional[datetime] = None

        self.current_speaker_id: Optional[str] = None
        self.current_speaker_name: Optional[str] = None
        self.current_speaker_type: Optional[SpeakerType] = None

        self.transcript: List[TranscriptEntry] = []
        self.events_log: List[dict] = []
        self.sequence_counter: int = 0

        # Speaking tracking
        self.speaking_turn_counts: Dict[str, int] = {p.id: 0 for p in participants}
        self.speaking_turn_counts["student"] = 0
        self.speaking_turn_counts["moderator"] = 0

        self.word_counts: Dict[str, int] = {p.id: 0 for p in participants}
        self.word_counts["student"] = 0
        self.word_counts["moderator"] = 0

        self.speaking_time_seconds: Dict[str, float] = {p.id: 0.0 for p in participants}
        self.speaking_time_seconds["student"] = 0.0
        self.speaking_time_seconds["moderator"] = 0.0

        self.interruption_count: int = 0
        self.active_ai_speech_cancelled: bool = False

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "topic": self.config.topic,
            "custom_topic": self.config.custom_topic,
            "duration_seconds": self.config.duration_seconds,
            "participant_count": self.config.participant_count,
            "participants": [p.model_dump() for p in self.participants],
            "moderator_name": self.moderator_name,
            "status": self.status.value,
            "phase": self.phase.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "current_speaker_id": self.current_speaker_id,
            "current_speaker_name": self.current_speaker_name,
            "current_speaker_type": self.current_speaker_type.value if self.current_speaker_type else None,
            "transcript": [e.model_dump() for e in self.transcript],
            "sequence_counter": self.sequence_counter,
            "speaking_turn_counts": self.speaking_turn_counts,
            "word_counts": self.word_counts,
            "speaking_time_seconds": self.speaking_time_seconds,
            "interruption_count": self.interruption_count,
        }


class SessionManager:
    """Manages discussion state machines and coordinates with session repository."""

    VALID_TRANSITIONS = {
        SessionStatus.CREATED: [SessionStatus.READY, SessionStatus.ERROR],
        SessionStatus.READY: [SessionStatus.ACTIVE, SessionStatus.ERROR, SessionStatus.PAUSED],
        SessionStatus.ACTIVE: [SessionStatus.CLOSING, SessionStatus.PAUSED, SessionStatus.COMPLETED, SessionStatus.ERROR],
        SessionStatus.PAUSED: [SessionStatus.ACTIVE, SessionStatus.COMPLETED, SessionStatus.ERROR],
        SessionStatus.CLOSING: [SessionStatus.COMPLETED, SessionStatus.PAUSED, SessionStatus.ERROR],
        SessionStatus.COMPLETED: [],  # Terminal state
        SessionStatus.ERROR: [SessionStatus.READY, SessionStatus.ACTIVE, SessionStatus.COMPLETED],  # Recoverable
    }

    def __init__(self, repository: Optional[BaseSessionRepository] = None) -> None:
        self.repository = repository or InMemorySessionRepository()
        self._active_sessions: Dict[str, SessionState] = {}

    async def create_session(
        self,
        config: SessionConfig,
        participants: List[ParticipantConfig],
        session_id: Optional[str] = None
    ) -> SessionState:
        """Initialize a new isolated GD session."""
        sid = session_id or f"gd_session_{uuid.uuid4().hex[:12]}"
        if sid in self._active_sessions or await self.repository.session_exists(sid):
            raise InvalidSessionStateError(f"Session with ID '{sid}' already exists.")

        session = SessionState(session_id=sid, config=config, participants=participants)
        session.status = SessionStatus.READY
        session.phase = DiscussionPhase.SETUP
        self._active_sessions[sid] = session
        await self.repository.save_session(sid, session.to_dict())
        return session

    def get_session(self, session_id: str) -> SessionState:
        """Fetch active session state synchronously from in-memory cache."""
        if session_id not in self._active_sessions:
            raise SessionNotFoundError(f"Session '{session_id}' not found.")
        return self._active_sessions[session_id]

    async def transition_status(self, session_id: str, new_status: SessionStatus) -> None:
        """Perform verified state transition."""
        session = self.get_session(session_id)
        current = session.status

        if current == new_status:
            return

        allowed = self.VALID_TRANSITIONS.get(current, [])
        if new_status not in allowed:
            raise InvalidSessionStateError(
                f"Invalid transition from {current.value} to {new_status.value} for session '{session_id}'."
            )

        session.status = new_status
        now = datetime.now(timezone.utc)

        if new_status == SessionStatus.ACTIVE and session.started_at is None:
            session.started_at = now
            session.phase = DiscussionPhase.ACTIVE
        elif new_status == SessionStatus.CLOSING:
            session.phase = DiscussionPhase.CLOSING
        elif new_status == SessionStatus.COMPLETED:
            session.ended_at = now
            session.phase = DiscussionPhase.REPORT
            session.current_speaker_id = None
            session.current_speaker_name = None

        await self.repository.save_session(session_id, session.to_dict())

    async def add_transcript_entry(
        self,
        session_id: str,
        speaker_id: str,
        speaker_name: str,
        speaker_type: SpeakerType,
        text: str,
        turn_type: TurnType = TurnType.STATEMENT,
        is_measured_timing: bool = False,
        duration_seconds: Optional[float] = None
    ) -> TranscriptEntry:
        """Record an immutable turn in the transcript with stable ID and sequence number."""
        session = self.get_session(session_id)

        if session.status in (SessionStatus.COMPLETED, SessionStatus.ERROR):
            raise InvalidSessionStateError(
                f"Cannot add transcript entry to session '{session_id}' in state {session.status.value}."
            )

        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Transcript entry text cannot be empty.")

        session.sequence_counter += 1
        entry_id = f"turn_{session.sequence_counter:04d}_{uuid.uuid4().hex[:6]}"

        words = len(clean_text.split())
        calculated_duration = duration_seconds if duration_seconds is not None else max(1.0, words * (60.0 / 140.0))

        entry = TranscriptEntry(
            entry_id=entry_id,
            session_id=session_id,
            speaker_id=speaker_id,
            speaker_name=speaker_name,
            speaker_type=speaker_type,
            text=clean_text,
            sequence_number=session.sequence_counter,
            turn_type=turn_type,
            is_measured_timing=is_measured_timing,
            duration_seconds=calculated_duration,
        )

        session.transcript.append(entry)

        # Update metrics tracking
        session.speaking_turn_counts[speaker_id] = session.speaking_turn_counts.get(speaker_id, 0) + 1
        session.word_counts[speaker_id] = session.word_counts.get(speaker_id, 0) + words
        session.speaking_time_seconds[speaker_id] = (
            session.speaking_time_seconds.get(speaker_id, 0.0) + calculated_duration
        )

        session.current_speaker_id = speaker_id
        session.current_speaker_name = speaker_name
        session.current_speaker_type = speaker_type

        await self.repository.save_session(session_id, session.to_dict())
        return entry

    async def set_active_speaker(
        self,
        session_id: str,
        speaker_id: Optional[str],
        speaker_name: Optional[str] = None,
        speaker_type: Optional[SpeakerType] = None
    ) -> None:
        """Update current active speaker."""
        session = self.get_session(session_id)
        session.current_speaker_id = speaker_id
        session.current_speaker_name = speaker_name
        session.current_speaker_type = speaker_type
        await self.repository.save_session(session_id, session.to_dict())

    async def record_interruption(self, session_id: str) -> None:
        """Record an interruption event and flag audio cancellation."""
        session = self.get_session(session_id)
        session.interruption_count += 1
        session.active_ai_speech_cancelled = True
        await self.repository.save_session(session_id, session.to_dict())
