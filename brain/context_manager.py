"""
Context Manager for GD Arena.

Maintains the shared evolving discussion context across all participants:
- Preserves the core discussion topic and question
- Distinguishes student contributions from AI contributions
- Maintains recent verbatim turns
- Extracts key arguments, stances, and counterpoints
- Provides context summaries for LLM prompt windows without loss of grounding
"""

from typing import Dict, List, Optional
from brain.schemas import SpeakerType, TranscriptEntry


class DiscussionContext:
    """Encapsulates the shared memory of a discussion session."""

    def __init__(self, topic: str, custom_topic: Optional[str] = None) -> None:
        self.topic: str = topic
        self.custom_topic: Optional[str] = custom_topic
        self.main_question: str = f"What are the key perspectives, tradeoffs, and solutions regarding '{topic}'?"
        self.identified_arguments: List[Dict[str, str]] = []
        self.participant_stances: Dict[str, List[str]] = {}
        self.student_arguments: List[str] = []
        self.recent_turns_window_size: int = 8
        self.summary_cache: str = ""

    def register_turn(self, entry: TranscriptEntry) -> None:
        """Process and index a new transcript entry."""
        speaker_key = entry.speaker_name or entry.speaker_id

        # Record stance or argument
        if entry.speaker_type == SpeakerType.STUDENT:
            self.student_arguments.append(entry.text)
        elif entry.speaker_type == SpeakerType.PARTICIPANT:
            if speaker_key not in self.participant_stances:
                self.participant_stances[speaker_key] = []
            self.participant_stances[speaker_key].append(entry.text)

        # Record high-level argument record
        self.identified_arguments.append({
            "entry_id": entry.entry_id,
            "speaker": speaker_key,
            "speaker_type": entry.speaker_type.value,
            "text": entry.text,
            "turn_type": entry.turn_type.value,
        })

    def get_recent_transcript_formatted(self, transcript: List[TranscriptEntry], limit: int = 6) -> str:
        """Format the last N turns for prompt injection."""
        window = transcript[-limit:] if transcript else []
        if not window:
            return "No previous turns. The discussion has just begun."

        lines = []
        for t in window:
            speaker_label = f"{t.speaker_name} ({t.speaker_type.value})"
            lines.append(f"[{speaker_label}] (Turn {t.sequence_number}): \"{t.text}\"")
        return "\n".join(lines)

    def get_discussion_summary(self, transcript: List[TranscriptEntry]) -> str:
        """
        Produce a concise structural summary of the key themes covered so far
        to prevent repetitive generation.
        """
        if not transcript:
            return "Topic has been introduced. Floor is open."

        student_turns = [t for t in transcript if t.speaker_type == SpeakerType.STUDENT]
        ai_turns = [t for t in transcript if t.speaker_type == SpeakerType.PARTICIPANT]

        summary_parts = [
            f"Topic: {self.topic}",
            f"Total turns so far: {len(transcript)} (Student turns: {len(student_turns)}, AI turns: {len(ai_turns)})."
        ]

        if student_turns:
            summary_parts.append(
                f"Candidate's latest point: \"{student_turns[-1].text[:120]}...\""
            )

        # Highlight distinct participant points
        recent_ai = ai_turns[-3:] if ai_turns else []
        if recent_ai:
            recent_points = [f"{t.speaker_name}: \"{t.text[:80]}...\"" for t in recent_ai]
            summary_parts.append("Recent AI viewpoints: " + " | ".join(recent_points))

        return "\n".join(summary_parts)

    def get_participant_names_and_roles(self, participants: list) -> str:
        """Provide a cheat-sheet of other candidates in the room."""
        return ", ".join([f"{p.name} ({p.profile.profile_type.value})" for p in participants])


class ContextManager:
    """Manages discussion contexts across multiple active sessions."""

    def __init__(self) -> None:
        self._contexts: Dict[str, DiscussionContext] = {}

    def initialize_context(self, session_id: str, topic: str, custom_topic: Optional[str] = None) -> DiscussionContext:
        context = DiscussionContext(topic=topic, custom_topic=custom_topic)
        self._contexts[session_id] = context
        return context

    def get_context(self, session_id: str) -> DiscussionContext:
        if session_id not in self._contexts:
            raise KeyError(f"No discussion context found for session '{session_id}'.")
        return self._contexts[session_id]

    def remove_context(self, session_id: str) -> None:
        self._contexts.pop(session_id, None)
