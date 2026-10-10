"""
Unit tests for TurnManager.
"""

from brain.personalities import select_participants_for_session
from brain.schemas import SpeakerDecision, SpeakerType, TranscriptEntry, TurnType
from brain.turn_manager import TurnManager


def test_turn_manager_concurrency_lock():
    tm = TurnManager()
    assert not tm.is_floor_busy()

    tm.set_active_speaker("speaker_01", SpeakerType.PARTICIPANT)
    assert tm.is_floor_busy()
    assert tm.active_speaker_id == "speaker_01"

    tm.clear_active_speaker()
    assert not tm.is_floor_busy()


def test_moderator_opens_empty_session():
    tm = TurnManager()
    participants = select_participants_for_session(count=4)
    decision = tm.decide_next_speaker(
        participants=participants,
        transcript_history=[],
        elapsed_seconds=0.0,
        total_duration_seconds=600.0,
    )
    assert decision.speaker_type == SpeakerType.MODERATOR
    assert decision.recommended_turn_type == TurnType.OPENING


def test_student_opportunity_window_after_consecutive_ai_turns():
    tm = TurnManager(max_consecutive_ai_turns=3)
    participants = select_participants_for_session(count=3)

    # 3 consecutive AI turns in history
    history = [
        TranscriptEntry(
            entry_id="turn_1",
            session_id="s1",
            speaker_id="p1",
            speaker_name="P1",
            speaker_type=SpeakerType.PARTICIPANT,
            text="First AI point.",
            sequence_number=1,
        ),
        TranscriptEntry(
            entry_id="turn_2",
            session_id="s1",
            speaker_id="p2",
            speaker_name="P2",
            speaker_type=SpeakerType.PARTICIPANT,
            text="Second AI point.",
            sequence_number=2,
        ),
        TranscriptEntry(
            entry_id="turn_3",
            session_id="s1",
            speaker_id="p3",
            speaker_name="P3",
            speaker_type=SpeakerType.PARTICIPANT,
            text="Third AI point.",
            sequence_number=3,
        ),
    ]

    decision = tm.decide_next_speaker(
        participants=participants,
        transcript_history=history,
        elapsed_seconds=100.0,
        total_duration_seconds=600.0,
    )
    assert decision.speaker_type == SpeakerType.STUDENT
    assert decision.speaker_id == "student"


def test_avoid_immediate_consecutive_ai_self_repetition():
    tm = TurnManager()
    participants = select_participants_for_session(count=3)
    p1 = participants[0]

    history = [
        TranscriptEntry(
            entry_id="turn_1",
            session_id="s1",
            speaker_id=p1.id,
            speaker_name=p1.name,
            speaker_type=SpeakerType.PARTICIPANT,
            text="Statement by P1.",
            sequence_number=1,
        )
    ]

    decision = tm.decide_next_speaker(
        participants=participants,
        transcript_history=history,
        elapsed_seconds=50.0,
        total_duration_seconds=600.0,
    )
    # The chosen speaker must not be p1
    assert decision.speaker_id != p1.id


def test_interruption_handling():
    tm = TurnManager()
    tm.set_active_speaker("speaker_ai_1", SpeakerType.PARTICIPANT)

    interrupted = tm.handle_interruption("session_1", "student")
    assert interrupted == "speaker_ai_1"
    assert tm.active_speaker_id == "student"
