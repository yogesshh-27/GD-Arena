"""
Unit tests for FeedbackEngine, SpeakingMetrics, and TranscriptAnalyzer.
"""

import pytest
from brain.analytics.feedback_engine import FeedbackEngine
from brain.analytics.speaking_metrics import SpeakingMetricsCalculator
from brain.analytics.transcript_analyzer import TranscriptAnalyzer
from brain.schemas import SessionStatus, SpeakerType, TranscriptEntry


def test_speaking_metrics_computation():
    calculator = SpeakingMetricsCalculator()
    entries = [
        TranscriptEntry(
            entry_id="t1",
            session_id="s1",
            speaker_id="student",
            speaker_name="Rahul",
            speaker_type=SpeakerType.STUDENT,
            text="I would like to open this discussion on remote work efficiency.",  # 10 words
            sequence_number=1,
            is_measured_timing=True,
            duration_seconds=4.0,
        ),
        TranscriptEntry(
            entry_id="t2",
            session_id="s1",
            speaker_id="ai_1",
            speaker_name="Vikram",
            speaker_type=SpeakerType.PARTICIPANT,
            text="Remote work improves autonomy but impairs cross-team communication.",  # 8 words
            sequence_number=2,
            is_measured_timing=True,
            duration_seconds=3.5,
        ),
    ]

    metrics = calculator.compute(entries, interruptions_count=1)
    assert metrics.student_turn_count == 1
    assert metrics.turns_by_participant["Rahul"] == 1
    assert metrics.turns_by_participant["Vikram"] == 1
    assert metrics.word_count_by_participant["Rahul"] == 11
    assert metrics.word_count_by_participant["Vikram"] == 8
    assert metrics.timing_type == "measured"
    assert metrics.interruptions_count == 1
    assert round(metrics.student_share_words_percent, 1) == 57.9


def test_transcript_analyzer():
    analyzer = TranscriptAnalyzer()
    entries = [
        TranscriptEntry(
            entry_id="t1",
            session_id="s1",
            speaker_id="student",
            speaker_name="Rahul",
            speaker_type=SpeakerType.STUDENT,
            text="I completely agree with Vikram, for example in IT firms hybrid models thrive.",
            sequence_number=1,
        )
    ]
    analysis = analyzer.analyze(entries)
    assert len(analysis.student_arguments) == 1
    assert len(analysis.agreements) == 1
    assert len(analysis.relevant_examples) == 1


@pytest.mark.asyncio
async def test_feedback_engine_end_to_end():
    engine = FeedbackEngine()
    entries = [
        TranscriptEntry(
            entry_id="t1",
            session_id="s1",
            speaker_id="student",
            speaker_name="Candidate",
            speaker_type=SpeakerType.STUDENT,
            text="Initiating discussion: AI automation creates shifts in employment paradigms.",
            sequence_number=1,
        )
    ]
    metrics = SpeakingMetricsCalculator().compute(entries)
    analysis = TranscriptAnalyzer().analyze(entries)

    report = await engine.generate_feedback_report(
        session_id="s1",
        student_name="Candidate",
        topic="AI and Employment",
        status=SessionStatus.COMPLETED,
        duration_seconds=300.0,
        metrics=metrics,
        analysis=analysis,
        transcript_entries=entries,
    )
    assert report.session_id == "s1"
    assert len(report.feedback) == 9
    assert report.overall_score >= 1.0 and report.overall_score <= 5.0
    for item in report.feedback:
        assert item.status in ("validated", "insufficient_evidence")
