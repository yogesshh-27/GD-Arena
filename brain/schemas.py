"""
Typed, validated data structures for GD Arena Brain.

Uses Pydantic v2 for robust validation, serialization, and typing across all modules.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SessionStatus(str, Enum):
    CREATED = "CREATED"
    READY = "READY"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSING = "CLOSING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


class DiscussionPhase(str, Enum):
    SETUP = "SETUP"
    OPENING = "OPENING"
    ACTIVE = "ACTIVE"
    CLOSING = "CLOSING"
    REPORT = "REPORT"


class SpeakerType(str, Enum):
    STUDENT = "STUDENT"
    PARTICIPANT = "PARTICIPANT"
    MODERATOR = "MODERATOR"


class TurnType(str, Enum):
    OPENING = "OPENING"
    STATEMENT = "STATEMENT"
    COUNTERARGUMENT = "COUNTERARGUMENT"
    QUESTION = "QUESTION"
    REBUTTAL = "REBUTTAL"
    REDIRECTION = "REDIRECTION"
    CLOSING = "CLOSING"
    CONCLUSION = "CONCLUSION"


class PersonalityProfile(str, Enum):
    DOMINATOR = "dominator"
    ANALYST = "analyst"
    QUIET_THINKER = "quiet_thinker"
    COLLABORATOR = "collaborator"
    DRIFTER = "drifter"


class ParticipantProfile(BaseModel):
    id: str = Field(..., description="Unique profile identifier")
    name: str = Field(..., description="Display name of the participant")
    profile_type: PersonalityProfile = Field(..., description="Personality enum")
    description: str = Field(..., description="Brief personality summary")
    communication_style: str = Field(..., description="Style of speaking")
    speaking_frequency: float = Field(..., ge=0.1, le=1.0, description="Propensity to volunteer for turns (0.1 to 1.0)")
    argumentation_style: str = Field(..., description="How they structure points")
    interruption_tendency: float = Field(..., ge=0.0, le=1.0, description="Likelihood to interject")
    agreement_bias: float = Field(..., ge=-1.0, le=1.0, description="-1 (highly disagreeing) to 1 (highly agreeable)")
    topic_relevance_adherence: float = Field(..., ge=0.1, le=1.0, description="Adherence to main theme")
    prompt_instructions: str = Field(..., description="System instructions injected into LLM context")
    voice_name: Optional[str] = Field(default=None, description="Assigned TTS voice identifier")


class ParticipantConfig(BaseModel):
    id: str
    name: str
    profile: ParticipantProfile
    assigned_voice: Optional[str] = None


class SessionConfig(BaseModel):
    topic: str = Field(..., min_length=3, description="Topic of the group discussion")
    custom_topic: Optional[str] = Field(default=None, description="Custom prompt or background context if any")
    participant_count: int = Field(default=4, ge=3, le=5, description="Number of AI participants (3-5)")
    selected_profiles: Optional[List[PersonalityProfile]] = Field(
        default=None, 
        description="Explicitly requested participant profiles; randomly chosen if None"
    )
    duration_seconds: int = Field(default=600, ge=60, le=3600, description="Discussion duration in seconds")
    language: str = Field(default="en-US", description="Primary discussion language")
    discussion_format: str = Field(default="standard_campus_gd", description="GD format style")
    student_name: str = Field(default="Candidate", description="Name of student candidate")


class TranscriptEntry(BaseModel):
    entry_id: str = Field(..., description="Stable unique ID for evidence referencing")
    session_id: str = Field(..., description="Session identifier")
    speaker_id: str = Field(..., description="ID of speaker")
    speaker_name: str = Field(..., description="Display name")
    speaker_type: SpeakerType = Field(..., description="STUDENT, PARTICIPANT, or MODERATOR")
    text: str = Field(..., min_length=1, description="Spoken transcript text")
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = Field(default=None)
    sequence_number: int = Field(..., ge=1, description="Monotonically increasing sequence number")
    turn_type: TurnType = Field(default=TurnType.STATEMENT)
    is_measured_timing: bool = Field(default=False, description="True if measured from audio, False if estimated from WPM")
    duration_seconds: Optional[float] = Field(default=None, description="Duration in seconds")


class ParticipantResponse(BaseModel):
    participant_id: str
    speaker_name: str
    content: str
    intent: str = Field(default="argument", description="statement, counterargument, question, elaboration")
    target_argument_id: Optional[str] = None
    target_speaker_name: Optional[str] = None
    requires_speech: bool = True
    estimated_duration_seconds: float = 5.0


class SpeakerDecision(BaseModel):
    speaker_id: str
    speaker_name: str
    speaker_type: SpeakerType
    reason: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    recommended_turn_type: TurnType = TurnType.STATEMENT


class DiscussionEvent(BaseModel):
    event_id: str
    session_id: str
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payload: Dict[str, Any] = Field(default_factory=dict)


class EvidenceReference(BaseModel):
    transcript_entry_id: str
    quote: str


class FeedbackItem(BaseModel):
    criterion: str = Field(..., description="Evaluation dimension, e.g. starting_discussion, building_on_others")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 (Needs Improvement) to 5 (Outstanding)")
    feedback: str = Field(..., description="Actionable observations")
    evidence: List[EvidenceReference] = Field(default_factory=list, description="Direct quotes from student turns")
    improvement: str = Field(..., description="Actionable advice for placement interviews")
    status: str = Field(default="validated", description="validated or insufficient_evidence")


class SpeakingMetrics(BaseModel):
    speaking_time_by_participant: Dict[str, float] = Field(default_factory=dict)
    turns_by_participant: Dict[str, int] = Field(default_factory=dict)
    word_count_by_participant: Dict[str, int] = Field(default_factory=dict)
    student_share_words_percent: float = Field(default=0.0)
    student_share_time_percent: float = Field(default=0.0)
    average_turn_length_words: float = Field(default=0.0)
    student_turn_count: int = Field(default=0)
    interruptions_count: int = Field(default=0)
    student_participation_distribution: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Bucketized participation timeline"
    )
    timing_type: str = Field(default="estimated", description="measured or estimated")


class TranscriptAnalysis(BaseModel):
    student_arguments: List[str] = Field(default_factory=list)
    relevant_examples: List[str] = Field(default_factory=list)
    responses_to_others: List[str] = Field(default_factory=list)
    agreements: List[str] = Field(default_factory=list)
    disagreements: List[str] = Field(default_factory=list)
    off_topic_contributions: List[str] = Field(default_factory=list)
    interruptions_recorded: List[str] = Field(default_factory=list)
    missed_opportunities: List[str] = Field(default_factory=list)


class FinalReport(BaseModel):
    session_id: str
    topic: str
    status: SessionStatus
    duration_seconds: float
    metrics: SpeakingMetrics
    analysis: TranscriptAnalysis
    feedback: List[FeedbackItem]
    overall_score: float = Field(..., ge=1.0, le=5.0)
    overall_summary: str
    is_partial: bool = Field(default=False, description="True if discussion ended prematurely")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProviderError(BaseModel):
    provider: str
    error_type: str
    message: str
    recoverable: bool = True
