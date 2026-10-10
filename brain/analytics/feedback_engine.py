"""
Feedback Engine for GD Arena.

Generates placement-ready, actionable evaluations across the 9 core GD dimensions.
Enforces strict empirical evidence grounding:
- Calls LLM / Demo service to generate assessments
- Cross-references each quoted snippet with actual student transcript entries
- Validates quotes using EvidenceValidator
- Gracefully marks unevidenced dimensions as 'insufficient_evidence'
"""

from typing import List, Optional
from brain.rules.evidence_rules import EvidenceValidator
from brain.schemas import (
    FeedbackItem,
    FinalReport,
    SpeakingMetrics,
    TranscriptAnalysis,
    TranscriptEntry,
    SessionStatus,
)
from brain.services.llm_service import BaseLLMService, get_llm_service


class FeedbackEngine:
    """Evaluates student discussion performance with evidence validation."""

    def __init__(self, llm_service: Optional[BaseLLMService] = None) -> None:
        self.llm = llm_service or get_llm_service()
        self.validator = EvidenceValidator()

    async def generate_feedback_report(
        self,
        session_id: str,
        student_name: str,
        topic: str,
        status: SessionStatus,
        duration_seconds: float,
        metrics: SpeakingMetrics,
        analysis: TranscriptAnalysis,
        transcript_entries: List[TranscriptEntry],
        is_partial: bool = False,
    ) -> FinalReport:
        """Produce the comprehensive final performance report."""
        raw_result = await self.llm.generate_feedback_report(
            student_name=student_name,
            topic=topic,
            transcript_entries=transcript_entries,
        )

        raw_items = [FeedbackItem(**item) for item in raw_result.get("feedback_items", [])]

        # Strictly validate all feedback items against empirical transcript entries
        sanitized_items = self.validator.sanitize_feedback_items(
            feedback_items=raw_items,
            session_id=session_id,
            transcript_entries=transcript_entries,
            target_speaker_id="student",
        )

        overall_score = float(raw_result.get("overall_score", 3.0))
        summary = raw_result.get(
            "overall_summary",
            f"Performance assessment for {student_name} on the topic of '{topic}'."
        )

        return FinalReport(
            session_id=session_id,
            topic=topic,
            status=status,
            duration_seconds=duration_seconds,
            metrics=metrics,
            analysis=analysis,
            feedback=sanitized_items,
            overall_score=min(5.0, max(1.0, overall_score)),
            overall_summary=summary,
            is_partial=is_partial,
        )
