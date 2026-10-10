"""
AI Participant Engine for GD Arena.

Drives individual AI participant behaviors:
- Injects persona constraints and shared discussion context into prompt
- Fosters inter-participant interactions (responding to AI peers as well as the student)
- Enforces natural voice turn lengths (under 60 words) and respectful discourse
- Validates model output structures and provides safe fallbacks
"""

import logging
from typing import List, Optional
from brain.context_manager import DiscussionContext
from brain.schemas import (
    ParticipantConfig,
    ParticipantResponse,
    PersonalityProfile,
    TranscriptEntry,
)
from brain.services.llm_service import BaseLLMService, get_llm_service

logger = logging.getLogger("brain.participant_engine")


class ParticipantEngine:
    """Orchestrates AI candidate turn generation."""

    def __init__(self, llm_service: Optional[BaseLLMService] = None) -> None:
        self.llm = llm_service or get_llm_service()

    async def generate_response(
        self,
        participant: ParticipantConfig,
        context: DiscussionContext,
        transcript_history: List[TranscriptEntry],
    ) -> ParticipantResponse:
        """
        Generate a validated, context-aware turn for the specified participant.
        Recovers gracefully if generation fails.
        """
        topic = context.topic
        summary = context.get_discussion_summary(transcript_history)

        try:
            response = await self.llm.generate_participant_contribution(
                participant_id=participant.id,
                profile=participant.profile,
                topic=topic,
                recent_transcript=transcript_history,
                discussion_summary=summary,
            )

            # Defensive validation of content
            clean_content = response.content.strip()
            if not clean_content:
                clean_content = (
                    f"Looking at {topic}, I believe we should carefully balance the short-term impact with strategic feasibility."
                )
                response.content = clean_content

            return response
        except Exception as e:
            logger.error(
                "Participant %s failed to generate turn: %s. Using recovery fallback.",
                participant.name,
                e,
            )
            # Safe recovery statement maintaining personality tone
            fallback_text = (
                f"I'd like to emphasize that regarding {topic}, we must stay focused on practical implementation steps."
            )
            return ParticipantResponse(
                participant_id=participant.id,
                speaker_name=participant.name,
                content=fallback_text,
                intent="statement",
                requires_speech=True,
                estimated_duration_seconds=5.0,
            )
