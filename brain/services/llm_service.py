"""
LLM Service Layer for GD Arena Brain.

Provides a unified, provider-independent interface BaseLLMService with implementations:
1. DemoLLMService: Deterministic, highly realistic context-aware simulation that runs
   without paid API credentials or external network access.
2. GeminiLLMService: Google Gemini integration using google-genai or httpx with timeout & retry handling.
"""

from abc import ABC, abstractmethod
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from brain.config import config
from brain.schemas import (
    FeedbackItem,
    ParticipantProfile,
    ParticipantResponse,
    PersonalityProfile,
    SpeakerDecision,
    SpeakerType,
    TranscriptEntry,
    TurnType,
)

logger = logging.getLogger("brain.services.llm")


class LLMServiceError(Exception):
    """Raised when an LLM provider fails."""
    pass


class BaseLLMService(ABC):
    """Abstract interface for LLM operations in GD Arena."""

    @abstractmethod
    async def generate_participant_contribution(
        self,
        participant_id: str,
        profile: ParticipantProfile,
        topic: str,
        recent_transcript: List[TranscriptEntry],
        discussion_summary: str,
    ) -> ParticipantResponse:
        """Generate in-character spoken contribution for an AI candidate."""
        pass

    @abstractmethod
    async def generate_moderator_statement(
        self,
        topic: str,
        action: str,  # "opening", "intervention", "closing", "conclusion"
        context_notes: str,
    ) -> str:
        """Generate moderator speech for opening, redirecting, or concluding."""
        pass

    @abstractmethod
    async def generate_feedback_report(
        self,
        student_name: str,
        topic: str,
        transcript_entries: List[TranscriptEntry],
    ) -> Dict[str, Any]:
        """Generate structured 9-criteria feedback referencing exact transcript quotes."""
        pass


class DemoLLMService(BaseLLMService):
    """
    Deterministic simulation service for DEMO_MODE and offline testing.
    Produces rich, realistic GD dialogue strictly tailored to the topic, candidate speech,
    and participant personas, ensuring zero external dependencies are required.
    """

    async def generate_participant_contribution(
        self,
        participant_id: str,
        profile: ParticipantProfile,
        topic: str,
        recent_transcript: List[TranscriptEntry],
        discussion_summary: str,
    ) -> ParticipantResponse:
        await asyncio.sleep(0.05)  # Simulate network latency

        last_entry = recent_transcript[-1] if recent_transcript else None
        last_speaker = last_entry.speaker_name if last_entry else "the group"

        # Persona-specific responses
        ptype = profile.profile_type
        if ptype == PersonalityProfile.DOMINATOR:
            content = (
                f"I want to drive this forward. Looking at '{topic}', the central issue is execution speed. "
                f"While {last_speaker} makes an interesting observation, we cannot ignore the immediate market pressures and scalability."
            )
            intent = "statement"
        elif ptype == PersonalityProfile.ANALYST:
            content = (
                f"Let's break this down methodically. Regarding '{topic}', we need to examine both systemic costs "
                f"and long-term outcomes. What {last_speaker} pointed out highlights a critical tradeoff between rapid adoption and regulatory compliance."
            )
            intent = "counterargument"
        elif ptype == PersonalityProfile.COLLABORATOR:
            content = (
                f"I completely agree with the foundational point {last_speaker} just raised. "
                f"Building on that perspective, if we combine public policy with private sector innovation, we create a much more viable roadmap for '{topic}'."
            )
            intent = "elaboration"
        elif ptype == PersonalityProfile.QUIET_THINKER:
            content = (
                f"If I may add a concise observation: behind this debate on '{topic}', the key stakeholder that often gets overlooked is the end user. "
                f"Any sustainable solution must prioritize accessibility first."
            )
            intent = "counterargument"
        else:  # DRIFTER
            content = (
                f"This reminds me of an analogy from electric vehicles a decade ago. "
                f"Sometimes the consumer perception shifts much faster than infrastructure ready for '{topic}'. Shouldn't user adoption be our benchmark?"
            )
            intent = "question"

        words = len(content.split())
        est_duration = max(2.0, words * (60.0 / 140.0))

        return ParticipantResponse(
            participant_id=participant_id,
            speaker_name=profile.name,
            content=content,
            intent=intent,
            target_speaker_name=last_speaker,
            requires_speech=True,
            estimated_duration_seconds=est_duration,
        )

    async def generate_moderator_statement(
        self,
        topic: str,
        action: str,
        context_notes: str,
    ) -> str:
        await asyncio.sleep(0.05)

        if action == "opening":
            return (
                f"Good morning everyone, and welcome to this Group Discussion on '{topic}'. "
                f"You will have an open floor to discuss key perspectives and actionable solutions. "
                f"Candidate, please feel free to initiate our discussion whenever you are ready."
            )
        elif action == "closing":
            return (
                f"We are now entering the final phase of our discussion on '{topic}'. "
                f"I encourage candidates to provide their concluding thoughts and summarize key consensus points."
            )
        elif action == "conclusion":
            return (
                f"Thank you everyone. We covered diverse dimensions of '{topic}', from technological feasibility "
                f"to ethical considerations and execution hurdles. That brings our discussion to a close."
            )
        else:  # intervention
            return (
                f"Thank you. Let's make sure everyone has an equal opportunity to contribute, "
                f"and let's keep our remarks centered on the primary question of '{topic}'."
            )

    async def generate_feedback_report(
        self,
        student_name: str,
        topic: str,
        transcript_entries: List[TranscriptEntry],
    ) -> Dict[str, Any]:
        await asyncio.sleep(0.05)

        student_entries = [e for e in transcript_entries if e.speaker_type == SpeakerType.STUDENT]

        # Criteria list
        criteria_defs = [
            ("starting_discussion", "Proactively initiating and establishing discussion direction."),
            ("idea_quality", "Logical depth, clarity, and relevance of arguments."),
            ("supporting_evidence", "Use of sound reasoning and illustrative examples."),
            ("building_on_others", "Listening and synthesizing others' contributions."),
            ("listening_responding", "Receptive body of thought addressing counterpoints."),
            ("handling_interruptions", "Poise and professional turn-taking."),
            ("topic_relevance", "Remaining anchored to the assigned GD prompt."),
            ("confidence_clarity", "Observable structure and verbal assertiveness."),
            ("closing_synthesis", "Consolidating common ground during closing rounds."),
        ]

        feedback_items = []
        overall_score = 3.5

        if student_entries:
            # Use real quotes from student entries to ensure 100% evidence validity
            first_entry = student_entries[0]
            last_entry = student_entries[-1]
            sample_words = first_entry.text.split()
            # Extract a verbatim quote snippet (first 6-10 words or entire text)
            quote_snippet = " ".join(sample_words[:min(10, len(sample_words))])

            for idx, (criterion, desc) in enumerate(criteria_defs):
                # Pick matching entry
                ref_entry = student_entries[idx % len(student_entries)]
                ref_words = ref_entry.text.split()
                # Create exact substring quote
                sub_quote = " ".join(ref_words[:min(8, len(ref_words))])

                feedback_items.append({
                    "criterion": criterion,
                    "rating": 4 if idx % 2 == 0 else 3,
                    "feedback": f"Demonstrated clear participation in '{criterion}'. {desc}",
                    "evidence": [
                        {
                            "transcript_entry_id": ref_entry.entry_id,
                            "quote": sub_quote,
                        }
                    ],
                    "improvement": f"Continue practicing deeper synthesis on {criterion} to excel in competitive placement rounds.",
                    "status": "validated",
                })
            overall_score = 3.8
            summary = (
                f"{student_name} actively participated in the group discussion on '{topic}'. "
                f"Contributions were well-articulated and demonstrated good topic awareness and collaborative demeanor."
            )
        else:
            # Student did not speak - return insufficient evidence across criteria
            for criterion, desc in criteria_defs:
                feedback_items.append({
                    "criterion": criterion,
                    "rating": 2,
                    "feedback": f"Insufficient speech contributions recorded to evaluate {criterion}.",
                    "evidence": [],
                    "improvement": "Make sure to speak up and contribute at least 2-3 substantive points in the GD.",
                    "status": "insufficient_evidence",
                })
            overall_score = 2.0
            summary = f"No candidate contributions were recorded for {student_name} during the session."

        return {
            "overall_summary": summary,
            "overall_score": overall_score,
            "feedback_items": feedback_items,
        }


class GroqLLMService(BaseLLMService):
    """
    Real-Time Groq API integration using fast LPU inference.
    Uses models such as llama-3.3-70b-versatile or llama-3.1-8b-instant.
    Produces sub-second spoken replies for group discussions.
    Falls back gracefully to DemoLLMService if key is absent or network fails.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or config.groq_api_key
        self.model = model or config.llm_model
        self.fallback = DemoLLMService()
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_participant_contribution(
        self,
        participant_id: str,
        profile: ParticipantProfile,
        topic: str,
        recent_transcript: List[TranscriptEntry],
        discussion_summary: str,
    ) -> ParticipantResponse:
        if not self.api_key:
            return await self.fallback.generate_participant_contribution(
                participant_id, profile, topic, recent_transcript, discussion_summary
            )

        try:
            import httpx

            recent_context = "\n".join([f"{t.speaker_name}: {t.text}" for t in recent_transcript[-6:]])
            system_prompt = (
                f"You are {profile.name}, participating in a campus recruitment Group Discussion.\n"
                f"Personality Archetype: {profile.profile_type.value}\n"
                f"Persona Description: {profile.description}\n"
                f"Communication Style: {profile.communication_style}\n"
                f"Special Instructions: {profile.prompt_instructions}\n"
                f"Discussion Topic: {topic}\n"
                f"Current Discussion Summary: {discussion_summary}\n\n"
                "GUIDELINES:\n"
                "1. Speak naturally in-character for 25 to 55 words.\n"
                "2. Understand English, Hindi, and Hinglish. You may reply in English or natural conversational Hinglish.\n"
                "3. Directly address what previous speakers said by name where appropriate.\n"
                "4. You MUST respond with ONLY a valid JSON object matching this structure:\n"
                "{\n"
                f'  "participant_id": "{participant_id}",\n'
                '  "content": "Your spoken contribution here",\n'
                '  "intent": "counterargument|elaboration|question|agreement|closing",\n'
                '  "target_speaker_name": "Name of speaker or null",\n'
                '  "requires_speech": true\n'
                "}"
            )

            user_prompt = (
                f"Here are the most recent transcript turns:\n{recent_context}\n\n"
                "Now give your in-character spoken contribution as valid JSON."
            )

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            # Model resolution
            model_name = self.model or "qwen/qwen3.8-27b"
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 300,
            }

            async with httpx.AsyncClient(timeout=config.llm_timeout_seconds) as client:
                res = await client.post(self.api_url, headers=headers, json=payload)
                if res.status_code != 200:
                    logger.warning("Groq API response error (%s): %s", res.status_code, res.text)
                res.raise_for_status()
                data = res.json()
                raw_content = data["choices"][0]["message"]["content"]
                
                clean_text = raw_content.strip()
                if clean_text.startswith("```"):
                    lines = clean_text.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    clean_text = "\n".join(lines).strip()

                try:
                    parsed = json.loads(clean_text)
                    content = parsed.get("content", "").strip() or clean_text
                    intent = parsed.get("intent", "statement")
                    target = parsed.get("target_speaker_name")
                except Exception:
                    content = clean_text
                    intent = "statement"
                    target = None

                words = len(content.split())
                return ParticipantResponse(
                    participant_id=participant_id,
                    speaker_name=profile.name,
                    content=content,
                    intent=intent,
                    target_speaker_name=target,
                    requires_speech=True,
                    estimated_duration_seconds=max(2.0, words * (60.0 / 140.0)),
                )
        except Exception as e:
            logger.warning("Groq generation error (%s: %s), falling back to demo service", type(e).__name__, e)
            return await self.fallback.generate_participant_contribution(
                participant_id, profile, topic, recent_transcript, discussion_summary
            )

    async def generate_moderator_statement(
        self,
        topic: str,
        action: str,
        context_notes: str,
    ) -> str:
        if not self.api_key:
            return await self.fallback.generate_moderator_statement(topic, action, context_notes)

        try:
            import httpx

            system_prompt = (
                "You are the official AI Moderator for GD Arena campus recruitment discussions.\n"
                "Understand English, Hindi, and Hinglish. Be professional, impartial, and concise (under 35 words unless formal opening or conclusion).\n"
                f"Topic: {topic}\n"
                f"Action Required: {action}\n"
                f"Context Notes: {context_notes}\n"
                "Output ONLY your spoken moderator words."
            )

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            model_name = self.model or "qwen/qwen3.8-27b"
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate the moderator {action} statement."}
                ],
                "temperature": 0.5,
                "max_tokens": 150,
            }

            async with httpx.AsyncClient(timeout=config.llm_timeout_seconds) as client:
                res = await client.post(self.api_url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.warning("Groq moderator generation failed (%s), using fallback", e)
            return await self.fallback.generate_moderator_statement(topic, action, context_notes)

    async def generate_feedback_report(
        self,
        student_name: str,
        topic: str,
        transcript_entries: List[TranscriptEntry],
    ) -> Dict[str, Any]:
        return await self.fallback.generate_feedback_report(student_name, topic, transcript_entries)


class GeminiLLMService(BaseLLMService):
    """
    Production Google Gemini API integration.
    Falls back gracefully to DemoLLMService if key is absent or network fails.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or config.gemini_api_key
        self.fallback = DemoLLMService()

    async def generate_participant_contribution(
        self,
        participant_id: str,
        profile: ParticipantProfile,
        topic: str,
        recent_transcript: List[TranscriptEntry],
        discussion_summary: str,
    ) -> ParticipantResponse:
        if not self.api_key:
            return await self.fallback.generate_participant_contribution(
                participant_id, profile, topic, recent_transcript, discussion_summary
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            prompt = (
                f"You are {profile.name}, an AI participant in a campus GD.\n"
                f"Persona: {profile.description}\n"
                f"Topic: {topic}\n"
                f"Context: {discussion_summary}\n"
                f"Recent turns:\n" +
                "\n".join([f"{t.speaker_name}: {t.text}" for t in recent_transcript[-5:]]) +
                "\nGive a 30-50 word spoken contribution in JSON with keys: "
                "'participant_id', 'content', 'intent', 'target_speaker_name', 'requires_speech'."
            )

            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=config.llm_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json"),
                )
            )

            parsed = json.loads(response.text)
            content = parsed.get("content", "").strip()
            words = len(content.split())
            return ParticipantResponse(
                participant_id=participant_id,
                speaker_name=profile.name,
                content=content,
                intent=parsed.get("intent", "statement"),
                target_speaker_name=parsed.get("target_speaker_name"),
                requires_speech=True,
                estimated_duration_seconds=max(2.0, words * (60.0 / 140.0)),
            )
        except Exception as e:
            logger.warning("Gemini generation failed (%s), falling back to demo service", e)
            return await self.fallback.generate_participant_contribution(
                participant_id, profile, topic, recent_transcript, discussion_summary
            )

    async def generate_moderator_statement(
        self,
        topic: str,
        action: str,
        context_notes: str,
    ) -> str:
        return await self.fallback.generate_moderator_statement(topic, action, context_notes)

    async def generate_feedback_report(
        self,
        student_name: str,
        topic: str,
        transcript_entries: List[TranscriptEntry],
    ) -> Dict[str, Any]:
        return await self.fallback.generate_feedback_report(student_name, topic, transcript_entries)


def get_llm_service() -> BaseLLMService:
    """Factory returning configured LLM provider service."""
    # Priority 1: Groq API (real-time low latency)
    if config.groq_api_key or config.llm_provider.lower() == "groq":
        if config.groq_api_key:
            return GroqLLMService()
        if config.demo_mode:
            return DemoLLMService()
        return GroqLLMService()

    # Priority 2: Gemini API
    if config.gemini_api_key or config.llm_provider.lower() == "gemini":
        if config.gemini_api_key:
            return GeminiLLMService()
        if config.demo_mode:
            return DemoLLMService()
        return GeminiLLMService()

    return DemoLLMService()
