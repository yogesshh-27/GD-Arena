"""
Unit tests for SessionManager and SessionState lifecycle.
"""

import pytest
from brain.schemas import (
    DiscussionPhase,
    PersonalityProfile,
    SessionConfig,
    SessionStatus,
    SpeakerType,
    TurnType,
)
from brain.personalities import select_participants_for_session
from brain.session_manager import InvalidSessionStateError, SessionManager, SessionNotFoundError


@pytest.mark.asyncio
async def test_session_creation_and_lifecycle():
    sm = SessionManager()
    config = SessionConfig(
        topic="Is Artificial Intelligence a threat to entry-level jobs?",
        participant_count=4,
        duration_seconds=600,
        student_name="Candidate Rahul",
    )
    participants = select_participants_for_session(count=4)

    # 1. Create session
    session = await sm.create_session(config=config, participants=participants)
    assert session.session_id.startswith("gd_session_")
    assert session.status == SessionStatus.READY
    assert session.phase == DiscussionPhase.SETUP
    assert len(session.participants) == 4

    # 2. Transition to ACTIVE
    await sm.transition_status(session.session_id, SessionStatus.ACTIVE)
    assert session.status == SessionStatus.ACTIVE
    assert session.phase == DiscussionPhase.ACTIVE
    assert session.started_at is not None

    # 3. Add transcript entries
    e1 = await sm.add_transcript_entry(
        session_id=session.session_id,
        speaker_id="moderator_001",
        speaker_name="Moderator",
        speaker_type=SpeakerType.MODERATOR,
        text="Welcome to the group discussion.",
        turn_type=TurnType.OPENING,
    )
    assert e1.sequence_number == 1
    assert e1.entry_id.startswith("turn_0001_")
    assert len(session.transcript) == 1

    e2 = await sm.add_transcript_entry(
        session_id=session.session_id,
        speaker_id="student",
        speaker_name="Candidate Rahul",
        speaker_type=SpeakerType.STUDENT,
        text="Thank you. I believe AI will augment rather than eliminate jobs.",
        turn_type=TurnType.STATEMENT,
    )
    assert e2.sequence_number == 2
    assert e2.entry_id.startswith("turn_0002_")

    # 4. Transition to CLOSING then COMPLETED
    await sm.transition_status(session.session_id, SessionStatus.CLOSING)
    assert session.status == SessionStatus.CLOSING

    await sm.transition_status(session.session_id, SessionStatus.COMPLETED)
    assert session.status == SessionStatus.COMPLETED
    assert session.phase == DiscussionPhase.REPORT
    assert session.ended_at is not None


@pytest.mark.asyncio
async def test_completed_session_rejects_new_turns():
    sm = SessionManager()
    config = SessionConfig(topic="Renewable Energy Adoption", participant_count=3)
    participants = select_participants_for_session(count=3)
    session = await sm.create_session(config=config, participants=participants)
    await sm.transition_status(session.session_id, SessionStatus.ACTIVE)
    await sm.transition_status(session.session_id, SessionStatus.COMPLETED)

    # Attempting to add turns to COMPLETED session must fail
    with pytest.raises(InvalidSessionStateError):
        await sm.add_transcript_entry(
            session_id=session.session_id,
            speaker_id="student",
            speaker_name="Student",
            speaker_type=SpeakerType.STUDENT,
            text="Trying to speak after session finished.",
        )


@pytest.mark.asyncio
async def test_invalid_session_transitions():
    sm = SessionManager()
    config = SessionConfig(topic="Cryptocurrency Regulations", participant_count=3)
    session = await sm.create_session(config=config, participants=select_participants_for_session(3))

    # Cannot jump directly from READY to COMPLETED without ACTIVE/ERROR
    with pytest.raises(InvalidSessionStateError):
        await sm.transition_status(session.session_id, SessionStatus.COMPLETED)


@pytest.mark.asyncio
async def test_session_not_found():
    sm = SessionManager()
    with pytest.raises(SessionNotFoundError):
        sm.get_session("non_existent_session_id")
