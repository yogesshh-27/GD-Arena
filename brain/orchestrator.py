"""
Central Orchestrator for GD Arena Brain.

Coordinates the entire discussion operational lifecycle:
- Session setup and participant provisioning
- Opening statements and floor management
- Student turn submission and speech transcription
- Next-speaker selection and AI candidate turn generation
- Text-to-speech audio synthesis and interruption management
- Closing phase triggers and final evidence-grounded performance reporting
- Resilient exception containment preventing session termination on single service hiccups
"""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from brain.analytics.feedback_engine import FeedbackEngine
from brain.analytics.speaking_metrics import SpeakingMetricsCalculator
from brain.analytics.transcript_analyzer import TranscriptAnalyzer
from brain.config import config
from brain.context_manager import ContextManager
from brain.moderator import ModeratorEngine
from brain.participant_engine import ParticipantEngine
from brain.personalities import select_participants_for_session
from brain.rules.discussion_rules import DiscussionRules
from brain.schemas import (
    FinalReport,
    ParticipantConfig,
    ParticipantResponse,
    SessionConfig,
    SessionStatus,
    SpeakerDecision,
    SpeakerType,
    TranscriptEntry,
    TurnType,
)
from brain.services.event_service import EventService
from brain.services.llm_service import BaseLLMService, get_llm_service
from brain.services.speech_to_text import BaseSpeechToText, get_stt_service
from brain.services.text_to_speech import BaseTextToSpeech, get_tts_service
from brain.session_manager import SessionManager, SessionState
from brain.turn_manager import TurnManager

logger = logging.getLogger("brain.orchestrator")


class BrainOrchestrator:
    """The central intelligence and execution engine for GD Arena."""

    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        event_service: Optional[EventService] = None,
        llm_service: Optional[BaseLLMService] = None,
        stt_service: Optional[BaseSpeechToText] = None,
        tts_service: Optional[BaseTextToSpeech] = None,
    ) -> None:
        self.session_manager = session_manager or SessionManager()
        self.event_service = event_service or EventService()
        self.llm_service = llm_service or get_llm_service()
        self.stt_service = stt_service or get_stt_service()
        self.tts_service = tts_service or get_tts_service()

        self.context_manager = ContextManager()
        self.moderator_engine = ModeratorEngine(self.llm_service)
        self.participant_engine = ParticipantEngine(self.llm_service)
        self.turn_manager = TurnManager(
            max_consecutive_ai_turns=config.max_consecutive_ai_turns,
            pause_between_turns_seconds=config.pause_between_turns_seconds,
        )
        self.discussion_rules = DiscussionRules(
            min_participants=config.min_participants,
            max_participants=config.max_participants,
            closing_threshold_seconds=config.closing_threshold_seconds,
            pause_between_turns_seconds=config.pause_between_turns_seconds,
        )

        self.metrics_calculator = SpeakingMetricsCalculator()
        self.transcript_analyzer = TranscriptAnalyzer()
        self.feedback_engine = FeedbackEngine(self.llm_service)

    async def create_session(
        self,
        session_config: SessionConfig,
        session_id: Optional[str] = None
    ) -> SessionState:
        """Validate config and provision an isolated GD session with distinct AI participants."""
        self.discussion_rules.validate_session_config(session_config)

        # Provision participants adhering to selected personalities
        participants = select_participants_for_session(
            count=session_config.participant_count,
            requested_types=session_config.selected_profiles,
        )

        session = await self.session_manager.create_session(
            config=session_config,
            participants=participants,
            session_id=session_id,
        )

        self.context_manager.initialize_context(
            session_id=session.session_id,
            topic=session_config.topic,
            custom_topic=session_config.custom_topic,
        )

        await self.event_service.publish(
            session_id=session.session_id,
            event_type="session.created",
            payload={"topic": session_config.topic, "participants": [p.name for p in participants]},
        )

        return session

    async def start_session(self, session_id: str) -> Dict[str, Any]:
        """Activate discussion and deliver moderator opening statement."""
        session = self.session_manager.get_session(session_id)
        await self.session_manager.transition_status(session_id, SessionStatus.ACTIVE)

        # Generate moderator opening statement
        opening_text = await self.moderator_engine.generate_opening_statement(
            config=session.config,
            participants=session.participants,
        )

        # Record opening in transcript
        entry = await self.session_manager.add_transcript_entry(
            session_id=session_id,
            speaker_id="moderator_001",
            speaker_name=session.moderator_name,
            speaker_type=SpeakerType.MODERATOR,
            text=opening_text,
            turn_type=TurnType.OPENING,
        )

        context = self.context_manager.get_context(session_id)
        context.register_turn(entry)

        # Synthesize audio for moderator
        audio_meta = await self.tts_service.synthesize_speech(
            session_id=session_id,
            speaker_id="moderator_001",
            speaker_name=session.moderator_name,
            text=opening_text,
        )

        await self.event_service.publish(
            session_id=session_id,
            event_type="session.started",
            payload={"entry": entry.model_dump(), "audio": audio_meta},
        )

        return {"entry": entry, "audio": audio_meta}

    async def submit_student_turn(
        self,
        session_id: str,
        text: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        is_interruption: bool = False,
    ) -> TranscriptEntry:
        """
        Accept candidate speech (transcribed text or raw microphone bytes).
        Updates shared context and logs turn.
        """
        session = self.session_manager.get_session(session_id)

        if not self.discussion_rules.can_submit_turn(session.status):
            raise ValueError(f"Cannot submit turn while session is in {session.status.value} state.")

        # If microphone audio chunk was provided, transcribe via STT
        if audio_bytes is not None:
            stt_result = await self.stt_service.transcribe_audio_chunk(
                session_id=session_id,
                speaker_id="student",
                audio_bytes=audio_bytes,
            )
            spoken_text = stt_result.get("text", "").strip()
        elif text is not None:
            stt_result = await self.stt_service.process_text_fallback(
                session_id=session_id,
                speaker_id="student",
                input_text=text,
            )
            spoken_text = stt_result.get("text", "").strip()
        else:
            raise ValueError("Either 'text' or 'audio_bytes' must be provided.")

        if not spoken_text:
            raise ValueError("Student spoken content is empty.")

        # Interruption handling
        if (is_interruption or self.turn_manager.is_floor_busy()) and self.turn_manager.active_speaker_id != "student":
            interrupted_id = self.turn_manager.handle_interruption(session_id, "student")
            if interrupted_id and interrupted_id != "student":
                await self.tts_service.cancel_playback(session_id, interrupted_id)
                await self.session_manager.record_interruption(session_id)
                await self.event_service.publish(
                    session_id=session_id,
                    event_type="speech.interrupted",
                    payload={
                        "interrupted_speaker_id": interrupted_id,
                        "interrupter": "student",
                        "generation_id": session.active_generation_id,
                    },
                )

        self.turn_manager.set_active_speaker("student", SpeakerType.STUDENT)

        entry = await self.session_manager.add_transcript_entry(
            session_id=session_id,
            speaker_id="student",
            speaker_name=session.config.student_name,
            speaker_type=SpeakerType.STUDENT,
            text=spoken_text,
            turn_type=TurnType.STATEMENT,
            is_measured_timing=audio_bytes is not None,
        )

        context = self.context_manager.get_context(session_id)
        context.register_turn(entry)

        # Clear floor and reset cancelled flag after candidate completes turn
        session.active_ai_speech_cancelled = False
        self.turn_manager.clear_active_speaker()

        await self.event_service.publish(
            session_id=session_id,
            event_type="transcript.final",
            payload={"entry": entry.model_dump()},
        )

        return entry

    async def request_next_turn(self, session_id: str) -> Dict[str, Any]:
        """
        Evaluates who should speak next and triggers their spoken response.
        Supports participant-to-participant dialogue and moderator interventions.
        """
        session = self.session_manager.get_session(session_id)

        if not self.discussion_rules.can_submit_turn(session.status):
            return {"status": "inactive", "message": f"Session is in {session.status.value}."}

        # Calculate discussion elapsed time
        elapsed = 0.0
        if session.started_at:
            elapsed = (datetime.now(timezone.utc) - session.started_at).total_seconds()

        # Check closing status
        if self.discussion_rules.is_closing_round_due(elapsed, session.config.duration_seconds):
            if session.status != SessionStatus.CLOSING:
                await self.session_manager.transition_status(session_id, SessionStatus.CLOSING)

        context = self.context_manager.get_context(session_id)

        # Floor check: If student holds floor or AI was interrupted, do not generate AI turn
        if self.turn_manager.active_speaker_id == "student" or session.active_ai_speech_cancelled:
            return {
                "action": "waiting_for_student",
                "reason": "Candidate currently holds the floor.",
                "generation_id": session.active_generation_id,
            }

        # Turn manager chooses next speaker
        decision: SpeakerDecision = self.turn_manager.decide_next_speaker(
            participants=session.participants,
            transcript_history=session.transcript,
            elapsed_seconds=elapsed,
            total_duration_seconds=session.config.duration_seconds,
            is_closing_phase=(session.status == SessionStatus.CLOSING),
        )

        # If turn manager invites student, return waiting indicator
        if decision.speaker_type == SpeakerType.STUDENT:
            await self.event_service.publish(
                session_id=session_id,
                event_type="speaker.changed",
                payload={"speaker_id": "student", "speaker_name": "Candidate", "action": "candidate_prompt"},
            )
            return {"decision": decision, "action": "waiting_for_student", "generation_id": session.active_generation_id}

        # If Moderator is selected
        if decision.speaker_type == SpeakerType.MODERATOR:
            if decision.recommended_turn_type == TurnType.CLOSING:
                text = await self.moderator_engine.generate_closing_call(session.config.topic)
            else:
                text = await self.moderator_engine.generate_intervention(
                    topic=session.config.topic,
                    reason=decision.reason,
                )

            entry = await self.session_manager.add_transcript_entry(
                session_id=session_id,
                speaker_id="moderator_001",
                speaker_name=session.moderator_name,
                speaker_type=SpeakerType.MODERATOR,
                text=text,
                turn_type=decision.recommended_turn_type,
            )
            context.register_turn(entry)

            audio_meta = await self.tts_service.synthesize_speech(
                session_id=session_id,
                speaker_id="moderator_001",
                speaker_name=session.moderator_name,
                text=text,
            )

            await self.event_service.publish(
                session_id=session_id,
                event_type="moderator.intervention",
                payload={"entry": entry.model_dump(), "audio": audio_meta},
            )

            return {
                "decision": decision,
                "entry": entry,
                "audio": audio_meta,
                "generation_id": session.active_generation_id,
            }

        # Otherwise, an AI participant was selected
        participant = next((p for p in session.participants if p.id == decision.speaker_id), None)
        if not participant:
            participant = session.participants[0]

        self.turn_manager.set_active_speaker(participant.id, SpeakerType.PARTICIPANT)
        gen_id = session.active_generation_id

        response: ParticipantResponse = await self.participant_engine.generate_response(
            participant=participant,
            context=context,
            transcript_history=session.transcript,
        )

        # Verify not interrupted before committing entry
        if session.active_ai_speech_cancelled or session.active_generation_id != gen_id:
            session.active_ai_speech_cancelled = False
            self.turn_manager.clear_active_speaker()
            return {
                "decision": decision,
                "status": "cancelled_due_to_interruption",
                "generation_id": session.active_generation_id,
            }

        entry = await self.session_manager.add_transcript_entry(
            session_id=session_id,
            speaker_id=participant.id,
            speaker_name=participant.name,
            speaker_type=SpeakerType.PARTICIPANT,
            text=response.content,
            turn_type=TurnType.COUNTERARGUMENT if response.intent == "counterargument" else TurnType.STATEMENT,
            duration_seconds=response.estimated_duration_seconds,
        )
        context.register_turn(entry)

        # Text-to-speech audio synthesis
        audio_meta = await self.tts_service.synthesize_speech(
            session_id=session_id,
            speaker_id=participant.id,
            speaker_name=participant.name,
            text=response.content,
            voice_name=participant.assigned_voice,
        )

        self.turn_manager.clear_active_speaker()

        await self.event_service.publish(
            session_id=session_id,
            event_type="participant.response",
            payload={"entry": entry.model_dump(), "audio": audio_meta, "intent": response.intent},
        )

        return {"decision": decision, "entry": entry, "audio": audio_meta, "generation_id": gen_id}

    async def interrupt_speaker(self, session_id: str) -> Dict[str, Any]:
        """Interrupts currently speaking AI participant and locks the floor for the candidate."""
        session = self.session_manager.get_session(session_id)
        current = self.turn_manager.active_speaker_id
        await self.session_manager.record_interruption(session_id)

        if current and current != "student":
            await self.tts_service.cancel_playback(session_id, current)
            self.turn_manager.clear_active_speaker()
            await self.event_service.publish(
                session_id=session_id,
                event_type="speech.interrupted",
                payload={
                    "interrupted_speaker_id": current,
                    "interrupter": "student",
                    "generation_id": session.active_generation_id,
                },
            )
            return {
                "status": "interrupted",
                "interrupted_speaker_id": current,
                "generation_id": session.active_generation_id,
            }

        self.turn_manager.clear_active_speaker()
        return {
            "status": "floor_transferred_to_student",
            "generation_id": session.active_generation_id,
        }

    async def end_session(self, session_id: str) -> FinalReport:
        """Concludes GD session and delivers formal conclusion."""
        session = self.session_manager.get_session(session_id)

        # Deliver moderator conclusion if not yet concluded
        conclusion_text = await self.moderator_engine.generate_conclusion(session.config.topic)
        entry = await self.session_manager.add_transcript_entry(
            session_id=session_id,
            speaker_id="moderator_001",
            speaker_name=session.moderator_name,
            speaker_type=SpeakerType.MODERATOR,
            text=conclusion_text,
            turn_type=TurnType.CONCLUSION,
        )
        context = self.context_manager.get_context(session_id)
        context.register_turn(entry)

        await self.session_manager.transition_status(session_id, SessionStatus.COMPLETED)
        report = await self.generate_report(session_id)

        await self.event_service.publish(
            session_id=session_id,
            event_type="session.completed",
            payload={"report": report.model_dump()},
        )

        return report

    async def generate_report(self, session_id: str) -> FinalReport:
        """Compute speaking metrics, analyze transcript, and generate evidence-verified feedback."""
        session = self.session_manager.get_session(session_id)

        metrics = self.metrics_calculator.compute(
            transcript_entries=session.transcript,
            interruptions_count=session.interruption_count,
        )

        analysis = self.transcript_analyzer.analyze(
            transcript_entries=session.transcript,
            interruptions_recorded=session.interruption_count,
        )

        elapsed = 0.0
        if session.started_at:
            end = session.ended_at or datetime.now(timezone.utc)
            elapsed = (end - session.started_at).total_seconds()

        report = await self.feedback_engine.generate_feedback_report(
            session_id=session_id,
            student_name=session.config.student_name,
            topic=session.config.topic,
            status=session.status,
            duration_seconds=elapsed,
            metrics=metrics,
            analysis=analysis,
            transcript_entries=session.transcript,
            is_partial=(session.status != SessionStatus.COMPLETED),
        )

        await self.event_service.publish(
            session_id=session_id,
            event_type="report.ready",
            payload={"overall_score": report.overall_score},
        )

        return report
