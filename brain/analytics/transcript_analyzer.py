"""
Transcript Analyzer for GD Arena.

Performs objective analysis of discussion transcripts:
- Identifies student arguments, illustrative examples, agreements/disagreements
- Categorizes responses to peers
- Detects initiating and concluding attempts
- Detects missed opportunity windows
Strictly avoids psychoanalysis or subjective emotional claims.
"""

from typing import List
from brain.schemas import SpeakerType, TranscriptAnalysis, TranscriptEntry, TurnType


class TranscriptAnalyzer:
    """Analyzes discussion transcript content objectively."""

    AGREEMENT_MARKERS = ["i agree", "completely agree", "valid point", "building on", "support what", "true that"]
    DISAGREEMENT_MARKERS = ["however", "disagree", "on the contrary", "alternative perspective", "counterpoint", "drawback", "risk"]
    EXAMPLE_MARKERS = ["for example", "for instance", "such as", "case study", "in india", "take the example", "specifically"]

    def analyze(self, transcript_entries: List[TranscriptEntry], interruptions_recorded: int = 0) -> TranscriptAnalysis:
        analysis = TranscriptAnalysis()

        student_entries = [e for e in transcript_entries if e.speaker_type == SpeakerType.STUDENT]

        for entry in student_entries:
            text_lower = entry.text.lower()

            # Record substantive arguments (longer than 5 words)
            if len(entry.text.split()) >= 5:
                analysis.student_arguments.append(entry.text)

            # Detect examples
            if any(marker in text_lower for marker in self.EXAMPLE_MARKERS):
                analysis.relevant_examples.append(entry.text)

            # Detect agreements
            if any(marker in text_lower for marker in self.AGREEMENT_MARKERS):
                analysis.agreements.append(entry.text)

            # Detect disagreements
            if any(marker in text_lower for marker in self.DISAGREEMENT_MARKERS):
                analysis.disagreements.append(entry.text)

            # Responses to others
            if any(marker in text_lower for marker in self.AGREEMENT_MARKERS + self.DISAGREEMENT_MARKERS):
                analysis.responses_to_others.append(entry.text)

        if interruptions_recorded > 0:
            analysis.interruptions_recorded.append(f"{interruptions_recorded} interruption events logged.")

        # Identify missed opportunity windows (long stretches where student was silent)
        consecutive_other = 0
        for entry in transcript_entries:
            if entry.speaker_type != SpeakerType.STUDENT:
                consecutive_other += 1
                if consecutive_other == 4:
                    analysis.missed_opportunities.append(
                        f"Silent window around turn {entry.sequence_number} ({entry.speaker_name}'s statement)."
                    )
            else:
                consecutive_other = 0

        return analysis
