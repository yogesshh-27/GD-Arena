"""
Speech-to-Text (STT) Service Layer for GD Arena Brain.

Provides a provider-independent interface BaseSpeechToText for handling microphone
audio chunks, text-input fallback, and transcription event synthesis.
"""

from abc import ABC, abstractmethod
import asyncio
from typing import AsyncGenerator, Dict, Optional
from brain.config import config


class SpeechToTextError(Exception):
    """Raised when speech recognition fails."""
    pass


class BaseSpeechToText(ABC):
    """Abstract interface for speech transcription."""

    @abstractmethod
    async def transcribe_audio_chunk(
        self,
        session_id: str,
        speaker_id: str,
        audio_bytes: bytes,
        is_final: bool = True,
        language: str = "en-US",
    ) -> Dict[str, str]:
        """
        Transcribe an audio buffer.
        Returns dict with keys: 'text', 'language_detected', 'is_final'.
        """
        pass

    @abstractmethod
    async def process_text_fallback(
        self,
        session_id: str,
        speaker_id: str,
        input_text: str,
    ) -> Dict[str, str]:
        """
        Processes direct student text input when microphone is disabled or unavailable.
        """
        pass


class DemoSpeechToText(BaseSpeechToText):
    """
    Development and offline fallback speech recognition service.
    Handles text inputs and mock audio buffers without external paid APIs.
    """

    async def transcribe_audio_chunk(
        self,
        session_id: str,
        speaker_id: str,
        audio_bytes: bytes,
        is_final: bool = True,
        language: str = "en-US",
    ) -> Dict[str, str]:
        await asyncio.sleep(0.05)

        if not audio_bytes:
            return {"text": "", "language_detected": language, "is_final": is_final}

        # In demo mode, decode utf-8 if textual bytes sent, otherwise return a clear placeholder
        try:
            decoded = audio_bytes.decode("utf-8").strip()
            if decoded:
                return {
                    "text": decoded,
                    "language_detected": "en-IN" if config.support_hinglish else language,
                    "is_final": is_final,
                }
        except UnicodeDecodeError:
            pass

        return {
            "text": "[Audio chunk received - speech transcribed via demo STT adapter]",
            "language_detected": language,
            "is_final": is_final,
        }

    async def process_text_fallback(
        self,
        session_id: str,
        speaker_id: str,
        input_text: str,
    ) -> Dict[str, str]:
        """Clean and return text input submitted via developer or UI fallback."""
        clean = input_text.strip()
        if not clean:
            raise SpeechToTextError("Received empty text input.")

        return {
            "text": clean,
            "language_detected": "en-US",
            "is_final": True,
        }


def get_stt_service() -> BaseSpeechToText:
    """Factory returning active STT service."""
    return DemoSpeechToText()
