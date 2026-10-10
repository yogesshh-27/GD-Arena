"""
Evidence Validation Rules for GD Arena.

Ensures that all feedback items produced by the feedback engine are strictly grounded
in empirical transcript records:
- Referenced entry must exist in the session transcript
- Referenced speaker must match the expected candidate/student
- Quoted string must appear verbatim (exact substring) within the referenced transcript entry
- Ratings must be on the validated 1-5 scale
- Automatically sets feedback status to 'insufficient_evidence' if validation fails
"""

from typing import Dict, List, Tuple
from brain.schemas import FeedbackItem, SpeakerType, TranscriptEntry


class EvidenceValidationError(Exception):
    """Raised when evidence validation fails."""
    pass


class EvidenceValidator:
    """Validates grounding of feedback items against the discussion transcript."""

    def __init__(self, min_rating: int = 1, max_rating: int = 5) -> None:
        self.min_rating = min_rating
        self.max_rating = max_rating

    def validate_feedback_item(
        self,
        item: FeedbackItem,
        session_id: str,
        transcript_entries: List[TranscriptEntry],
        target_speaker_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Validate a single FeedbackItem.
        Returns (is_valid, reason).
        """
        # 1. Rating scale check
        if not (self.min_rating <= item.rating <= self.max_rating):
            return False, f"Rating {item.rating} is outside valid scale [{self.min_rating}, {self.max_rating}]."

        # 2. If status is already insufficient_evidence and no evidence provided, that's acceptable
        if item.status == "insufficient_evidence" and not item.evidence:
            return True, "Valid insufficient_evidence declaration."

        # 3. For evaluated criteria, at least one evidence quote must be provided
        if not item.evidence:
            return False, f"Criterion '{item.criterion}' has rating {item.rating} but provided no evidence quotes."

        entry_map: Dict[str, TranscriptEntry] = {e.entry_id: e for e in transcript_entries}

        for ev in item.evidence:
            # Check entry exists
            if ev.transcript_entry_id not in entry_map:
                return False, f"Referenced entry_id '{ev.transcript_entry_id}' does not exist in transcript."

            entry = entry_map[ev.transcript_entry_id]

            # Check session alignment
            if entry.session_id != session_id:
                return False, f"Entry '{ev.transcript_entry_id}' belongs to session '{entry.session_id}', not '{session_id}'."

            # Check target speaker type / ID
            if target_speaker_id and entry.speaker_id != target_speaker_id:
                return False, f"Entry '{ev.transcript_entry_id}' speaker is '{entry.speaker_id}', expected '{target_speaker_id}'."
            elif entry.speaker_type != SpeakerType.STUDENT:
                return False, f"Entry '{ev.transcript_entry_id}' speaker type is '{entry.speaker_type}', expected STUDENT."

            # Check verbatim quote match (exact substring)
            quote_clean = ev.quote.strip()
            if not quote_clean:
                return False, f"Empty quote in evidence for entry '{ev.transcript_entry_id}'."

            if quote_clean not in entry.text:
                return False, (
                    f"Fabricated or paraphrased quote detected: '{quote_clean}' "
                    f"does not appear verbatim in entry text: '{entry.text}'."
                )

        return True, "Evidence verified successfully."

    def sanitize_feedback_items(
        self,
        feedback_items: List[FeedbackItem],
        session_id: str,
        transcript_entries: List[TranscriptEntry],
        target_speaker_id: Optional[str] = None
    ) -> List[FeedbackItem]:
        """
        Validates all items. If an item fails evidence validation, marks its status as
        'insufficient_evidence' and strips invalid quotes to maintain strict academic integrity.
        """
        sanitized: List[FeedbackItem] = []
        for item in feedback_items:
            is_valid, reason = self.validate_feedback_item(
                item=item,
                session_id=session_id,
                transcript_entries=transcript_entries,
                target_speaker_id=target_speaker_id
            )
            if is_valid:
                item.status = "validated"
                sanitized.append(item)
            else:
                # Demote gracefully to insufficient evidence rather than crashing or inventing quotes
                demoted = FeedbackItem(
                    criterion=item.criterion,
                    rating=3,  # Neutral default for insufficient evidence
                    feedback=f"Insufficient verifiable evidence in transcript for this dimension. ({reason})",
                    evidence=[],
                    improvement="Contribute more distinct points during the discussion to allow detailed assessment.",
                    status="insufficient_evidence"
                )
                sanitized.append(demoted)

        return sanitized
