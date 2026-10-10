"""
SQLAlchemy relational models for GD Arena.
Implements users, profiles, preferences, assessments, topics, personalities,
sessions, transcript segments, metrics, reports, streaks, human rooms, and feedback.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="student", nullable=False)  # "student", "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    assessment = relationship("InitialAssessment", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("GDSession", back_populates="user", cascade="all, delete-orphan")
    streak = relationship("ActivityStreak", back_populates="user", uselist=False, cascade="all, delete-orphan")
    activity_days = relationship("ActivityDay", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    college = Column(String(255), nullable=True)
    year = Column(String(50), nullable=True)  # First, Second, Third, Fourth, Other
    course = Column(String(100), nullable=True)  # B.Tech, MCA, MBA, etc.
    branch = Column(String(100), nullable=True)
    experience_areas = Column(Text, nullable=True)  # JSON or comma-separated
    gd_confidence = Column(String(50), default="Beginner")  # Beginner, Intermediate, Advanced
    baseline_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="profile")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    preferred_language = Column(String(50), default="English")
    live_captions = Column(Boolean, default=True)
    silent_nudges = Column(Boolean, default=True)
    ai_patience = Column(String(50), default="Normal")  # Short, Normal, Patient
    timezone = Column(String(100), default="Asia/Kolkata")

    user = relationship("User", back_populates="preferences")


class InitialAssessment(Base):
    __tablename__ = "initial_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    topic = Column(String(500), nullable=False)
    transcript = Column(Text, nullable=False)
    duration_seconds = Column(Float, default=30.0)
    clarity_score = Column(Float, default=70.0)
    relevance_score = Column(Float, default=75.0)
    pace_wpm = Column(Float, default=130.0)
    baseline_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="assessment")


class GDTopic(Base):
    __tablename__ = "gd_topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(500), nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Technology, Education, Business, Social, Abstract, Case-Based
    difficulty = Column(String(50), default="Intermediate")  # Beginner, Intermediate, Advanced
    format = Column(String(50), default="General")  # General, Case-Based, Abstract, Controversial
    description = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class AIPersonality(Base):
    __tablename__ = "ai_personalities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_key = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    communication_style = Column(String(255), nullable=False)
    speaking_frequency = Column(Float, default=0.6)
    argumentation_style = Column(String(255), nullable=False)
    interruption_tendency = Column(Float, default=0.1)
    agreement_bias = Column(Float, default=0.0)
    topic_relevance = Column(Float, default=0.9)
    prompt_instructions = Column(Text, nullable=False)
    voice_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)


class GDSession(Base):
    __tablename__ = "gd_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("gd_topics.id", ondelete="SET NULL"), nullable=True)
    topic_title = Column(String(500), nullable=False)
    session_type = Column(String(50), default="ai")  # "ai" or "human"
    status = Column(String(50), default="CREATED", nullable=False)
    participant_count = Column(Integer, default=4)
    duration_seconds = Column(Integer, default=600)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="sessions")
    participants = relationship("SessionParticipant", back_populates="session", cascade="all, delete-orphan")
    transcript = relationship("TranscriptSegment", back_populates="session", cascade="all, delete-orphan")
    report = relationship("PerformanceReport", back_populates="session", uselist=False, cascade="all, delete-orphan")


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("gd_sessions.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    participant_type = Column(String(50), nullable=False)  # student, participant, moderator
    personality_key = Column(String(100), nullable=True)
    voice_name = Column(String(100), nullable=True)

    session = relationship("GDSession", back_populates="participants")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("gd_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_id = Column(String(100), nullable=False)
    speaker_name = Column(String(255), nullable=False)
    speaker_type = Column(String(50), nullable=False)
    text = Column(Text, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    turn_type = Column(String(50), default="STATEMENT")
    start_ts = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_ts = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    is_final = Column(Boolean, default=True)

    session = relationship("GDSession", back_populates="transcript")


class PerformanceReport(Base):
    __tablename__ = "performance_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("gd_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)
    overall_summary = Column(Text, nullable=False)
    scores_json = Column(Text, nullable=False)  # JSON dictionary of category scores
    feedback_items_json = Column(Text, nullable=False)  # JSON array of evidence-backed items
    strengths_json = Column(Text, nullable=True)
    improvements_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    session = relationship("GDSession", back_populates="report")


class ActivityStreak(Base):
    __tablename__ = "activity_streaks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    total_active_days = Column(Integer, default=0, nullable=False)
    total_sessions = Column(Integer, default=0, nullable=False)
    last_active_date = Column(String(10), nullable=True)  # YYYY-MM-DD in user timezone

    user = relationship("User", back_populates="streak")


class ActivityDay(Base):
    __tablename__ = "activity_days"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    sessions_count = Column(Integer, default=1, nullable=False)

    user = relationship("User", back_populates="activity_days")


class HumanRoom(Base):
    __tablename__ = "human_rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    host_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_title = Column(String(500), nullable=False)
    language = Column(String(50), default="English")
    max_participants = Column(Integer, default=6)
    duration_seconds = Column(Integer, default=900)
    is_private = Column(Boolean, default=False)
    passkey = Column(String(50), nullable=True)
    status = Column(String(50), default="WAITING")  # WAITING, ACTIVE, COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class PeerFeedback(Base):
    __tablename__ = "peer_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("human_rooms.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
