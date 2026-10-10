"""
AI Moderator for GD Arena.

Implements dedicated impartial moderator orchestration:
- Welcomes group and delivers formal opening statement
- Explains format and invites student to start
- Intervenes when participants monopolize or drift off-topic
- Encourages quieter candidates to share views
- Coordinates time warnings and closing statements
- Delivers final neutral conclusion
"""

from typing import List, Optional
from brain.schemas import ParticipantConfig, SessionConfig, SpeakerType, TurnType
from brain.services.llm_service import BaseLLMService, get_llm_service


class ModeratorEngine:
    """Manages moderator behaviors and statement generation."""

    def __init__(self, llm_service: Optional[BaseLLMService] = None) -> None:
        self.llm = llm_service or get_llm_service()
        self.moderator_id = "moderator_001"
        self.moderator_name = "Moderator"

    async def generate_opening_statement(self, config: SessionConfig, participants: List[ParticipantConfig]) -> str:
        """Deliver initial opening statement and rules."""
        context_notes = (
            f"Participants: {', '.join([p.name for p in participants])}. "
            f"Candidate: {config.student_name}. Duration: {config.duration_seconds // 60} minutes."
        )
        return await self.llm.generate_moderator_statement(
            topic=config.topic,
            action="opening",
            context_notes=context_notes,
        )

    async def generate_intervention(self, topic: str, reason: str, target_name: Optional[str] = None) -> str:
        """Intervene neutrally to redirect conversation or balance speaking time."""
        context_notes = f"Reason: {reason}. Target: {target_name or 'group'}."
        return await self.llm.generate_moderator_statement(
            topic=topic,
            action="intervention",
            context_notes=context_notes,
        )

    async def generate_closing_call(self, topic: str) -> str:
        """Call for final concluding rounds as time winds down."""
        return await self.llm.generate_moderator_statement(
            topic=topic,
            action="closing",
            context_notes="Time expiring. Invite concise final consensus points.",
        )

    async def generate_conclusion(self, topic: str, key_themes: Optional[str] = None) -> str:
        """Deliver neutral post-discussion synthesis."""
        return await self.llm.generate_moderator_statement(
            topic=topic,
            action="conclusion",
            context_notes=key_themes or "Comprehensive balanced discussion concluded.",
        )
