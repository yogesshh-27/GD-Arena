"""
Centralized Configuration for GD Arena Brain.

Loads settings from environment variables with safe defaults.
Supports DEMO_MODE for running end-to-end discussions without paid API credentials.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class BrainConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Operational Modes
    demo_mode: bool = Field(default=True, description="When True, uses simulated AI and speech services")
    environment: str = Field(default="development", description="Environment: development, test, production")

    # LLM Settings
    llm_provider: str = Field(default="groq", description="Provider: groq, gemini, openai, or mock")
    llm_model: str = Field(default="llama-3.3-70b-versatile", description="Model name (e.g. llama-3.3-70b-versatile, llama-3.1-8b-instant, gemini-2.0-flash)")
    groq_api_key: Optional[str] = Field(default=None, description="Groq API key for real-time low-latency inference")
    gemini_api_key: Optional[str] = Field(default=None, description="Google Gemini API key")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key if configured")
    llm_timeout_seconds: float = Field(default=15.0, description="Timeout for LLM generation")
    llm_max_retries: int = Field(default=2, description="Max retries for transient model failures")

    # Discussion Rules & Timers
    default_duration_seconds: int = Field(default=600, description="Default GD duration (10 mins)")
    min_participants: int = Field(default=3, description="Minimum AI participants")
    max_participants: int = Field(default=5, description="Maximum AI participants")
    closing_threshold_seconds: int = Field(default=90, description="Seconds before end to trigger closing round")
    speaking_pace_wpm: int = Field(default=140, description="Estimated words per minute for timing calculations")
    max_consecutive_ai_turns: int = Field(default=3, description="Max consecutive AI turns before prompting student")
    pause_between_turns_seconds: float = Field(default=1.5, description="Configurable pause between turns")

    # Speech-to-Text Settings
    stt_provider: str = Field(default="demo", description="STT provider: demo, whisper, deepgram, google")
    stt_language: str = Field(default="en-IN", description="Primary transcription language (en-IN supports Indian English and Hinglish)")
    support_hinglish: bool = Field(default=True, description="Flag indicating Hindi-English code-switching support")

    # Text-to-Speech Settings
    tts_provider: str = Field(default="demo", description="TTS provider: demo, edge_tts, elevenlabs")
    tts_default_voice: str = Field(default="en-US-GuyNeural", description="Fallback voice")

    # Storage Settings
    storage_type: str = Field(default="in_memory", description="Session repository backend: in_memory, sqlite")


config = BrainConfig()
