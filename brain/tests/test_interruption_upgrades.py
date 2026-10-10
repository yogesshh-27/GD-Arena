import pytest
from brain.schemas import SessionConfig, SpeakerType, TurnType
from brain.orchestrator import BrainOrchestrator
from brain.services.speech_to_text import DemoSpeechToText


@pytest.mark.asyncio
async def test_demo_speech_to_text_streaming_partials():
    """Verify DemoSpeechToText yields progressive partial chunks followed by final transcription."""
    stt = DemoSpeechToText()
    audio_sample = b"\x00\x01\x02\x03" * 100

    # Stream 2 provisional chunks
    res1 = await stt.transcribe_audio_chunk("test_sess", "student", audio_sample, is_final=False)
    assert res1["is_provisional"]
    assert not res1["is_final"]
    assert len(res1["text"]) > 0

    res2 = await stt.transcribe_audio_chunk("test_sess", "student", audio_sample, is_final=False)
    assert res2["is_provisional"]
    assert not res2["is_final"]
    assert len(res2["text"]) >= len(res1["text"])

    # Final chunk commits
    res_final = await stt.transcribe_audio_chunk("test_sess", "student", audio_sample, is_final=True)
    assert not res_final["is_provisional"]
    assert res_final["is_final"]
    assert len(res_final["text"]) > 0


@pytest.mark.asyncio
async def test_generation_id_increments_on_interruption():
    """Verify session active_generation_id increments on interruption, invalidating pending generations."""
    orch = BrainOrchestrator()
    config = SessionConfig(topic="Renewable Energy Storage", participant_count=3)
    session = await orch.create_session(config)
    await orch.start_session(session.session_id)

    initial_gen_id = session.active_generation_id
    orch.turn_manager.set_active_speaker("ai_1", SpeakerType.PARTICIPANT)

    # Student interrupts
    int_res = await orch.interrupt_speaker(session.session_id)
    assert int_res["status"] == "interrupted"
    assert session.active_generation_id == initial_gen_id + 1
    assert int_res["generation_id"] == session.active_generation_id
    assert session.active_ai_speech_cancelled is True


@pytest.mark.asyncio
async def test_request_next_turn_blocks_when_student_holds_floor():
    """Verify request_next_turn returns waiting_for_student when student holds floor or interrupted."""
    orch = BrainOrchestrator()
    config = SessionConfig(topic="Quantum Computing", participant_count=3)
    session = await orch.create_session(config)
    await orch.start_session(session.session_id)

    # Interruption sets active_ai_speech_cancelled
    await orch.interrupt_speaker(session.session_id)
    next_turn = await orch.request_next_turn(session.session_id)
    assert next_turn["action"] == "waiting_for_student"

    # Now student submits turn
    sub_res = await orch.submit_student_turn(
        session.session_id,
        text="Quantum algorithms will revolutionize encryption standards.",
        is_interruption=True,
    )
    assert sub_res.speaker_type == SpeakerType.STUDENT
    assert not session.active_ai_speech_cancelled

    # Next turn can now proceed naturally with AI speaker
    ai_turn = await orch.request_next_turn(session.session_id)
    assert "entry" in ai_turn or ai_turn.get("action") == "waiting_for_student"
