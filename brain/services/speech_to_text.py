"""
Speech-to-Text (STT) Service Layer for GD Arena Brain.

Provides a provider-independent interface BaseSpeechToText for handling microphone
audio chunks, streaming provisional/partial transcription, text-input fallback,
and transcription event synthesis.
"""

from abc import ABC, abstractmethod
import asyncio
from typing import Any, AsyncGenerator, Dict, Optional
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
    ) -> Dict[str, Any]:
        """
        Transcribe an audio buffer.
        Returns dict with keys: 'text', 'language_detected', 'is_final', 'is_provisional'.
        """
        pass

    @abstractmethod
    async def process_text_fallback(
        self,
        session_id: str,
        speaker_id: str,
        input_text: str,
    ) -> Dict[str, Any]:
        """
        Processes direct student text input when microphone is disabled or unavailable.
        """
        pass

    @abstractmethod
    async def stream_transcribe(
        self,
        session_id: str,
        speaker_id: str,
        audio_stream: AsyncGenerator[bytes, None],
        language: str = "en-US",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream audio chunks and yield progressive partial and finalized transcript updates.
        """
        pass


class DemoSpeechToText(BaseSpeechToText):
    """
    Development and offline fallback speech recognition service.
    Handles streaming partial results, text inputs, and mock audio buffers without external paid APIs.
    """

    def __init__(self) -> None:
        self._partial_buffers: Dict[str, str] = {}

    async def transcribe_audio_chunk(
        self,
        session_id: str,
        speaker_id: str,
        audio_bytes: bytes,
        is_final: bool = True,
        language: str = "en-US",
    ) -> Dict[str, Any]:
        await asyncio.sleep(0.02)

        if not audio_bytes:
            return {
                "text": "",
                "language_detected": language,
                "is_final": is_final,
                "is_provisional": not is_final,
            }

        # In demo mode, decode utf-8 if textual bytes sent
        try:
            decoded = audio_bytes.decode("utf-8").strip()
            if decoded:
                key = f"{session_id}:{speaker_id}"
                if not is_final:
                    self._partial_buffers[key] = decoded
                else:
                    self._partial_buffers.pop(key, None)

                return {
                    "text": decoded,
                    "language_detected": "en-IN" if config.support_hinglish else language,
                    "is_final": is_final,
                    "is_provisional": not is_final,
                }
        except UnicodeDecodeError:
            pass

        key = f"{session_id}:{speaker_id}"
        if not is_final:
            partial_text = "[transcribing candidate speech...]"
            self._partial_buffers[key] = partial_text
            return {
                "text": partial_text,
                "language_detected": language,
                "is_final": False,
                "is_provisional": True,
            }
        else:
            self._partial_buffers.pop(key, None)
            return {
                "text": "[Audio chunk received - speech transcribed via demo STT adapter]",
                "language_detected": language,
                "is_final": True,
                "is_provisional": False,
            }

    async def process_text_fallback(
        self,
        session_id: str,
        speaker_id: str,
        input_text: str,
    ) -> Dict[str, Any]:
        """Clean and return text input submitted via developer or UI fallback."""
        clean = input_text.strip()
        if not clean:
            raise SpeechToTextError("Received empty text input.")

        return {
            "text": clean,
            "language_detected": "en-US",
            "is_final": True,
            "is_provisional": False,
        }

    async def stream_transcribe(
        self,
        session_id: str,
        speaker_id: str,
        audio_stream: AsyncGenerator[bytes, None],
        language: str = "en-US",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Simulates progressive real-time streaming recognition for incoming chunks."""
        words = ["I", "think", "artificial intelligence", "can significantly improve", "campus placements."]
        curr = ""
        idx = 0

        async for _ in audio_stream:
            if idx < len(words):
                curr = " ".join(words[: idx + 1])
                is_last = idx == len(words) - 1
                yield {
                    "text": curr,
                    "language_detected": language,
                    "is_final": is_last,
                    "is_provisional": not is_last,
                }
                idx += 1
                await asyncio.sleep(0.05)


def get_stt_service() -> BaseSpeechToText:
    """Factory returning active STT service."""
    return DemoSpeechToText()
