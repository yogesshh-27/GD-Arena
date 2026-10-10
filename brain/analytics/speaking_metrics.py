"""
Speaking Metrics Engine for GD Arena.

Calculates empirical statistics across discussion participants:
- Exact turns, word counts, and speaking durations
- Distinguishes measured audio timings from estimated WPM timings
- Computes student share of floor time and words
- Analyzes candidate participation distribution across discussion phases
"""

from typing import Dict, List
from brain.schemas import SpeakingMetrics, SpeakerType, TranscriptEntry


class SpeakingMetricsCalculator:
    """Computes participation analytics from transcript logs."""

    def compute(
        self,
        transcript_entries: List[TranscriptEntry],
        interruptions_count: int = 0
    ) -> SpeakingMetrics:
        if not transcript_entries:
            return SpeakingMetrics(
                speaking_time_by_participant={},
                turns_by_participant={},
                word_count_by_participant={},
                student_share_words_percent=0.0,
                student_share_time_percent=0.0,
                average_turn_length_words=0.0,
                student_turn_count=0,
                interruptions_count=interruptions_count,
                student_participation_distribution=[],
                timing_type="estimated",
            )

        turns_by_part: Dict[str, int] = {}
        words_by_part: Dict[str, int] = {}
        time_by_part: Dict[str, float] = {}

        has_measured_timing = any(e.is_measured_timing for e in transcript_entries)
        timing_type = "measured" if has_measured_timing else "estimated"

        total_words = 0
        total_time = 0.0
        student_words = 0
        student_time = 0.0
        student_turns = 0

        for entry in transcript_entries:
            speaker_key = entry.speaker_name or entry.speaker_id
            words = len(entry.text.split())
            duration = entry.duration_seconds if entry.duration_seconds is not None else max(1.0, words * (60.0 / 140.0))

            turns_by_part[speaker_key] = turns_by_part.get(speaker_key, 0) + 1
            words_by_part[speaker_key] = words_by_part.get(speaker_key, 0) + words
            time_by_part[speaker_key] = round(time_by_part.get(speaker_key, 0.0) + duration, 2)

            total_words += words
            total_time += duration

            if entry.speaker_type == SpeakerType.STUDENT:
                student_words += words
                student_time += duration
                student_turns += 1

        student_share_words = round((student_words / total_words * 100.0), 2) if total_words > 0 else 0.0
        student_share_time = round((student_time / total_time * 100.0), 2) if total_time > 0.0 else 0.0
        avg_turn_length = round(student_words / student_turns, 1) if student_turns > 0 else 0.0

        # Bucketize participation into 4 quartiles
        distribution: List[Dict[str, any]] = []
        n_entries = len(transcript_entries)
        quartile_size = max(1, n_entries // 4)

        for q in range(4):
            start_idx = q * quartile_size
            end_idx = min(n_entries, (q + 1) * quartile_size) if q < 3 else n_entries
            bucket_entries = transcript_entries[start_idx:end_idx]
            student_in_bucket = sum(1 for e in bucket_entries if e.speaker_type == SpeakerType.STUDENT)
            distribution.append({
                "phase_name": f"Quartile {q + 1}",
                "student_turns": student_in_bucket,
                "total_turns": len(bucket_entries),
            })

        return SpeakingMetrics(
            speaking_time_by_participant=time_by_part,
            turns_by_participant=turns_by_part,
            word_count_by_participant=words_by_part,
            student_share_words_percent=student_share_words,
            student_share_time_percent=student_share_time,
            average_turn_length_words=avg_turn_length,
            student_turn_count=student_turns,
            interruptions_count=interruptions_count,
            student_participation_distribution=distribution,
            timing_type=timing_type,
        )
