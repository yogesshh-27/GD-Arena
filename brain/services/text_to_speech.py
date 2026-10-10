"""
Text-to-Speech (TTS) Service Layer for GD Arena Brain.

Provides a provider-independent interface BaseTextToSpeech for converting AI participant
and moderator statements into audio, mapping distinct voices to personas, and supporting
cancellation when candidate interruptions occur.
"""

from abc import ABC, abstractmethod
import asyncio
from typing import Dict, Optional


class TextToSpeechError(Exception):
    """Raised when speech synthesis fails."""
    pass


class BaseTextToSpeech(ABC):
    """Abstract speech synthesis interface."""

    @abstractmethod
    async def synthesize_speech(
        self,
        session_id: str,
        speaker_id: str,
        speaker_name: str,
        text: str,
        voice_name: Optional[str] = None,
    ) -> Dict[str, any]:
        """
        Synthesize speech from text.
        Returns dict containing audio metadata (e.g., audio_url/bytes, duration_seconds, voice_name).
        """
        pass

    @abstractmethod
    async def cancel_playback(self, session_id: str, speaker_id: str) -> None:
        """Cancel playback when an active speaker is interrupted."""
        pass


class DemoTextToSpeech(BaseTextToSpeech):
    """
    Demo / fallback TTS service that calculates accurate durations, provides
    mock audio payloads or text-only audio metadata without external network latency or costs.
    """

    def __init__(self) -> None:
        self._cancelled_speakers: Dict[str, str] = {}

    async def synthesize_speech(
        self,
        session_id: str,
        speaker_id: str,
        speaker_name: str,
        text: str,
        voice_name: Optional[str] = None,
    ) -> Dict[str, any]:
        await asyncio.sleep(0.02)

        # Clear any prior cancellation
        if session_id in self._cancelled_speakers and self._cancelled_speakers[session_id] == speaker_id:
            del self._cancelled_speakers[session_id]

        words = len(text.split())
        est_duration = max(1.5, words * (60.0 / 140.0))

        return {
            "session_id": session_id,
            "speaker_id": speaker_id,
            "speaker_name": speaker_name,
            "voice_name": voice_name or "en-US-Default",
            "audio_format": "audio/mp3",
            "duration_seconds": round(est_duration, 2),
            "audio_data_base64": None,  # Text-only mode or simulated audio marker
            "is_synthesized": True,
        }

    async def cancel_playback(self, session_id: str, speaker_id: str) -> None:
        self._cancelled_speakers[session_id] = speaker_id


def get_tts_service() -> BaseTextToSpeech:
    """Factory returning active TTS service."""
    return DemoTextToSpeech()
