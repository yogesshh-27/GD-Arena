"""
Dashboard, Topic Library, and User History API routes.
"""

from datetime import datetime, timedelta, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth_utils import get_current_user
from backend.database import get_db
from backend.models import (
    ActivityDay,
    ActivityStreak,
    GDSession,
    GDTopic,
    PerformanceReport,
    User,
)

dash_router = APIRouter(prefix="/api", tags=["dashboard"])


class CustomTopicRequest(BaseModel):
    title: str = Field(..., min_length=5, description="Custom GD topic title")
    category: str = Field(default="Custom", description="Category tag")
    difficulty: str = Field(default="Intermediate", description="Difficulty level")
    format: str = Field(default="General", description="Discussion format")
    description: Optional[str] = None


@dash_router.get("/dashboard/summary")
def get_dashboard_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Profile details
    profile = user.profile
    profile_data = {
        "full_name": user.full_name,
        "email": user.email,
        "college": profile.college if profile and profile.college else "Not Specified",
        "course": profile.course if profile and profile.course else "Student",
        "year": profile.year if profile and profile.year else "",
        "gd_confidence": profile.gd_confidence if profile and profile.gd_confidence else "Beginner",
        "baseline_summary": profile.baseline_summary if profile else "No baseline assessment completed yet.",
    }

    # 2. Streaks and Heatmap
    streak = user.streak
    current_streak = streak.current_streak if streak else 0
    longest_streak = streak.longest_streak if streak else 0
    total_active_days = streak.total_active_days if streak else 0
    total_sessions = streak.total_sessions if streak else 0

    # Calculate weekly activity array (last 7 days)
    today = datetime.now(timezone.utc).date()
    days_map = {d.activity_date: d.sessions_count for d in user.activity_days}
    weekly_activity = []
    for i in range(6, -1, -1):
        dt = today - timedelta(days=i)
        dt_str = dt.strftime("%Y-%m-%d")
        weekly_activity.append({
            "date": dt_str,
            "day": dt.strftime("%a"),
            "sessions": days_map.get(dt_str, 0),
        })

    streak_data = {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_active_days": total_active_days,
        "total_sessions": total_sessions,
        "weekly_activity": weekly_activity,
        "motivating_message": (
            "Outstanding consistency! Keep up your streak to master campus interviews."
            if current_streak > 2 else
            "Complete a discussion today to ignite your daily practice streak!"
        ),
    }

    # 3. Performance Aggregates
    reports = db.query(PerformanceReport).filter(PerformanceReport.user_id == user.id).all()
    if reports:
        avg_score = round(sum(r.overall_score for r in reports) / len(reports), 1)
        perf_data = {
            "has_data": True,
            "total_reports": len(reports),
            "avg_communication_score": avg_score,
            "speaking_participation": "Balanced (65% floor target)",
            "ideas_content_quality": "High logical depth",
            "listening_collaboration": "Active & responsive",
            "recent_change": "+8% improvement across last 3 sessions",
        }
    else:
        perf_data = {
            "has_data": False,
            "total_reports": 0,
            "avg_communication_score": None,
            "speaking_participation": "Not enough data yet",
            "ideas_content_quality": "Not enough data yet",
            "listening_collaboration": "Not enough data yet",
            "recent_change": "Complete your first AI GD session to unlock insights.",
        }

    # 4. Recent sessions
    recent_sessions_db = (
        db.query(GDSession)
        .filter(GDSession.user_id == user.id)
        .order_by(GDSession.created_at.desc())
        .limit(5)
        .all()
    )
    recent_activity = []
    for s in recent_sessions_db:
        recent_activity.append({
            "session_id": s.id,
            "topic": s.topic_title,
            "status": s.status,
            "date": s.created_at.strftime("%b %d, %Y"),
            "duration_seconds": s.duration_seconds,
            "has_report": s.report is not None,
        })

    # 5. Recommended topics
    rec_topics = db.query(GDTopic).limit(4).all()
    recommended_topics = [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "difficulty": t.difficulty,
            "format": t.format,
        }
        for t in rec_topics
    ]

    return {
        "profile": profile_data,
        "streak": streak_data,
        "performance": perf_data,
        "recent_activity": recent_activity,
        "recommended_topics": recommended_topics,
    }


@dash_router.get("/topics")
def list_topics(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(GDTopic)
    if category and category != "All":
        query = query.filter(GDTopic.category == category)
    if difficulty and difficulty != "All":
        query = query.filter(GDTopic.difficulty == difficulty)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(GDTopic.title.ilike(search_fmt) | GDTopic.description.ilike(search_fmt))

    topics = query.all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "category": t.category,
            "difficulty": t.difficulty,
            "format": t.format,
            "description": t.description,
            "is_custom": t.is_custom,
        }
        for t in topics
    ]


@dash_router.post("/topics/custom", status_code=status.HTTP_201_CREATED)
def create_custom_topic(
    req: CustomTopicRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean_title = req.title.strip()
    if len(clean_title) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topic title must be at least 5 characters.",
        )

    topic = GDTopic(
        title=clean_title,
        category="Custom",
        difficulty=req.difficulty,
        format=req.format,
        description=req.description or f"Custom discussion topic created by {user.full_name}.",
        is_custom=True,
        created_by=user.id,
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)

    return {
        "id": topic.id,
        "title": topic.title,
        "category": topic.category,
        "difficulty": topic.difficulty,
        "format": topic.format,
        "is_custom": True,
    }


@dash_router.get("/history")
def get_user_session_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(GDSession)
        .filter(GDSession.user_id == user.id)
        .order_by(GDSession.created_at.desc())
        .all()
    )
    results = []
    for s in sessions:
        report_data = None
        if s.report:
            report_data = {
                "overall_score": s.report.overall_score,
                "summary": s.report.overall_summary,
            }
        results.append({
            "session_id": s.id,
            "topic": s.topic_title,
            "session_type": s.session_type,
            "status": s.status,
            "participant_count": s.participant_count,
            "duration_seconds": s.duration_seconds,
            "created_at": s.created_at.isoformat(),
            "report": report_data,
        })
    return results
