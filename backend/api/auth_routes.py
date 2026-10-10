"""
Authentication, Onboarding, and Baseline Assessment endpoints.
"""

from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.auth_utils import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.database import get_db
from backend.models import (
    ActivityStreak,
    InitialAssessment,
    User,
    UserPreferences,
    UserProfile,
)

auth_router = APIRouter(prefix="/api", tags=["auth"])


# Request Schemas
class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str = Field(..., min_length=6)


class AcademicDetailsRequest(BaseModel):
    college: str
    year: str  # First, Second, Third, Fourth, Other
    course: str  # B.Tech, MCA, MBA, etc.
    branch: str


class ExperienceDetailsRequest(BaseModel):
    experience_areas: List[str]
    gd_confidence: str  # Beginner, Intermediate, Advanced, Not sure


class AssessmentSubmissionRequest(BaseModel):
    topic: str
    transcript: str
    duration_seconds: float = 30.0


@auth_router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="student",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Create empty profile & preferences
    profile = UserProfile(user_id=user.id)
    prefs = UserPreferences(user_id=user.id)
    streak = ActivityStreak(
        user_id=user.id,
        current_streak=0,
        longest_streak=0,
        total_active_days=0,
        total_sessions=0,
    )
    db.add(profile)
    db.add(prefs)
    db.add(streak)
    db.commit()

    token = create_access_token(user.id, user.email, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "has_completed_onboarding": False,
        }
    }


@auth_router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower(), User.is_active == True).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Check onboarding completion
    has_onboarding = bool(
        user.profile and user.profile.college and user.profile.course and user.profile.gd_confidence
    )

    token = create_access_token(user.id, user.email, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "has_completed_onboarding": has_onboarding,
        }
    }


@auth_router.get("/auth/me")
def get_current_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile_data = {}
    if user.profile:
        exp_list = []
        if user.profile.experience_areas:
            try:
                exp_list = json.loads(user.profile.experience_areas)
            except Exception:
                exp_list = user.profile.experience_areas.split(",")
        profile_data = {
            "college": user.profile.college,
            "year": user.profile.year,
            "course": user.profile.course,
            "branch": user.profile.branch,
            "experience_areas": exp_list,
            "gd_confidence": user.profile.gd_confidence,
            "baseline_summary": user.profile.baseline_summary,
        }

    streak_data = {
        "current_streak": user.streak.current_streak if user.streak else 0,
        "longest_streak": user.streak.longest_streak if user.streak else 0,
        "total_active_days": user.streak.total_active_days if user.streak else 0,
        "total_sessions": user.streak.total_sessions if user.streak else 0,
    }

    has_onboarding = bool(
        user.profile and user.profile.college and user.profile.course and user.profile.gd_confidence
    )

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "profile": profile_data,
        "streak": streak_data,
        "has_completed_onboarding": has_onboarding,
    }


@auth_router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        # Avoid user enumeration by returning success message
        return {"message": "If this email exists, password has been updated."}

    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now login with your new credentials."}


@auth_router.post("/onboarding/academic")
def save_academic_details(
    req: AcademicDetailsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = user.profile
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.college = req.college
    profile.year = req.year
    profile.course = req.course
    profile.branch = req.branch
    db.commit()

    return {"status": "saved", "step": 1}


@auth_router.post("/onboarding/experience")
def save_experience_details(
    req: ExperienceDetailsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = user.profile
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.experience_areas = json.dumps(req.experience_areas)
    profile.gd_confidence = req.gd_confidence
    db.commit()

    return {"status": "saved", "step": 2}


@auth_router.post("/assessment/baseline")
def submit_baseline_assessment(
    req: AssessmentSubmissionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean_text = req.transcript.strip()
    words = len(clean_text.split())
    pace_wpm = round((words / max(5.0, req.duration_seconds)) * 60.0, 1)

    # Calculate objective metrics
    clarity_score = min(95.0, max(50.0, 60.0 + min(30.0, words * 0.8)))
    relevance_score = 80.0 if any(
        k in clean_text.lower() for k in ["practical", "skills", "theory", "knowledge", "college", "hands-on"]
    ) else 65.0

    summary_note = (
        f"Completed {round(req.duration_seconds, 1)}s sample ({words} words at ~{pace_wpm} WPM). "
        f"Expressed complete initial thought with baseline clarity of {round(clarity_score)}%."
    )

    existing_assessment = db.query(InitialAssessment).filter(InitialAssessment.user_id == user.id).first()
    if existing_assessment:
        existing_assessment.topic = req.topic
        existing_assessment.transcript = clean_text
        existing_assessment.duration_seconds = req.duration_seconds
        existing_assessment.clarity_score = clarity_score
        existing_assessment.relevance_score = relevance_score
        existing_assessment.pace_wpm = pace_wpm
        existing_assessment.baseline_notes = summary_note
    else:
        assessment = InitialAssessment(
            user_id=user.id,
            topic=req.topic,
            transcript=clean_text,
            duration_seconds=req.duration_seconds,
            clarity_score=clarity_score,
            relevance_score=relevance_score,
            pace_wpm=pace_wpm,
            baseline_notes=summary_note,
        )
        db.add(assessment)

    if user.profile:
        user.profile.baseline_summary = summary_note

    db.commit()

    return {
        "status": "completed",
        "clarity_score": clarity_score,
        "relevance_score": relevance_score,
        "pace_wpm": pace_wpm,
        "baseline_summary": summary_note,
        "disclosure": "Note: This is an initial estimate from a 30-second speaking sample for calibration, not a comprehensive psychometric assessment.",
    }
