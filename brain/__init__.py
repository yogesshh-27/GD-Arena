"""
GD Arena Brain Package.

Central intelligence and orchestration layer for voice-first group discussions.
"""

from brain.config import config, BrainConfig
from brain.orchestrator import BrainOrchestrator
from brain.session_manager import SessionManager, SessionState
from brain.turn_manager import TurnManager
from brain.moderator import ModeratorEngine
from brain.participant_engine import ParticipantEngine
from brain.context_manager import ContextManager
from brain.personalities import (
    PERSONALITY_CATALOG,
    select_participants_for_session,
    get_profile_by_type,
    get_all_profiles,
)
from brain.schemas import (
    SessionConfig,
    SessionStatus,
    DiscussionPhase,
    SpeakerType,
    TurnType,
    PersonalityProfile,
    ParticipantConfig,
    TranscriptEntry,
    ParticipantResponse,
    SpeakerDecision,
    DiscussionEvent,
    FeedbackItem,
    SpeakingMetrics,
    FinalReport,
)

__all__ = [
    "config",
    "BrainConfig",
    "BrainOrchestrator",
    "SessionManager",
    "SessionState",
    "TurnManager",
    "ModeratorEngine",
    "ParticipantEngine",
    "ContextManager",
    "PERSONALITY_CATALOG",
    "select_participants_for_session",
    "get_profile_by_type",
    "get_all_profiles",
    "SessionConfig",
    "SessionStatus",
    "DiscussionPhase",
    "SpeakerType",
    "TurnType",
    "PersonalityProfile",
    "ParticipantConfig",
    "TranscriptEntry",
    "ParticipantResponse",
    "SpeakerDecision",
    "DiscussionEvent",
    "FeedbackItem",
    "SpeakingMetrics",
    "FinalReport",
]
