"""
Unit tests for Evidence Validation Rules.
"""

from brain.rules.evidence_rules import EvidenceValidator
from brain.schemas import EvidenceReference, FeedbackItem, SpeakerType, TranscriptEntry


def test_valid_evidence_passes():
    validator = EvidenceValidator()
    session_id = "test_sess_01"
    entry = TranscriptEntry(
        entry_id="turn_001",
        session_id=session_id,
        speaker_id="student",
        speaker_name="Candidate",
        speaker_type=SpeakerType.STUDENT,
        text="Digital transformation requires both technological infrastructure and workforce reskilling.",
        sequence_number=1,
    )

    item = FeedbackItem(
        criterion="idea_quality",
        rating=4,
        feedback="Clear argument presenting dual pillars of transformation.",
        evidence=[
            EvidenceReference(
                transcript_entry_id="turn_001",
                quote="technological infrastructure and workforce reskilling",
            )
        ],
        improvement="Provide an industry case study.",
    )

    is_valid, reason = validator.validate_feedback_item(
        item=item,
        session_id=session_id,
        transcript_entries=[entry],
        target_speaker_id="student",
    )
    assert is_valid is True
    assert "verified" in reason.lower()


def test_fabricated_quote_fails():
    validator = EvidenceValidator()
    session_id = "test_sess_01"
    entry = TranscriptEntry(
        entry_id="turn_001",
        session_id=session_id,
        speaker_id="student",
        speaker_name="Candidate",
        speaker_type=SpeakerType.STUDENT,
        text="We should focus on green hydrogen adoption in heavy industry.",
        sequence_number=1,
    )

    item = FeedbackItem(
        criterion="idea_quality",
        rating=4,
        feedback="Good point.",
        evidence=[
            EvidenceReference(
                transcript_entry_id="turn_001",
                quote="We must subsidize solar panels everywhere immediately",  # Fabricated!
            )
        ],
        improvement="None",
    )

    is_valid, reason = validator.validate_feedback_item(
        item=item,
        session_id=session_id,
        transcript_entries=[entry],
        target_speaker_id="student",
    )
    assert is_valid is False
    assert "fabricated" in reason.lower() or "verbatim" in reason.lower()


def test_wrong_entry_id_fails():
    validator = EvidenceValidator()
    session_id = "test_sess_01"
    entry = TranscriptEntry(
        entry_id="turn_001",
        session_id=session_id,
        speaker_id="student",
        speaker_name="Candidate",
        speaker_type=SpeakerType.STUDENT,
        text="A valid statement here.",
        sequence_number=1,
    )

    item = FeedbackItem(
        criterion="starting_discussion",
        rating=3,
        feedback="OK point.",
        evidence=[
            EvidenceReference(
                transcript_entry_id="turn_999",  # Non-existent
                quote="A valid statement here.",
            )
        ],
        improvement="None",
    )

    is_valid, reason = validator.validate_feedback_item(
        item=item,
        session_id=session_id,
        transcript_entries=[entry],
    )
    assert is_valid is False
    assert "does not exist" in reason.lower()


def test_sanitizer_demotes_invalid_item_to_insufficient_evidence():
    validator = EvidenceValidator()
    session_id = "test_sess_01"
    entry = TranscriptEntry(
        entry_id="turn_001",
        session_id=session_id,
        speaker_id="student",
        speaker_name="Candidate",
        speaker_type=SpeakerType.STUDENT,
        text="Real speech by student.",
        sequence_number=1,
    )

    invalid_item = FeedbackItem(
        criterion="building_on_others",
        rating=5,
        feedback="Superb collaboration.",
        evidence=[
            EvidenceReference(
                transcript_entry_id="turn_001",
                quote="Invented sentence that was never spoken.",
            )
        ],
        improvement="Keep it up.",
    )

    sanitized = validator.sanitize_feedback_items(
        feedback_items=[invalid_item],
        session_id=session_id,
        transcript_entries=[entry],
    )
    assert len(sanitized) == 1
    assert sanitized[0].status == "insufficient_evidence"
    assert sanitized[0].evidence == []
