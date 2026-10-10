"""
Human GD Rooms and Peer Feedback API routes.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth_utils import get_current_user
from backend.database import get_db
from backend.models import (
    HumanRoom,
    PeerFeedback,
    User,
)

human_router = APIRouter(prefix="/api/human-rooms", tags=["human_rooms"])


class CreateHumanRoomRequest(BaseModel):
    topic_title: str = Field(..., min_length=5)
    language: str = Field(default="English")
    max_participants: int = Field(default=6, ge=2, le=10)
    duration_seconds: int = Field(default=900, ge=300, le=3600)
    is_private: bool = Field(default=False)
    passkey: Optional[str] = None


class JoinHumanRoomRequest(BaseModel):
    passkey: Optional[str] = None


class PeerFeedbackRequest(BaseModel):
    reviewee_id: str
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None


@human_router.get("")
def list_human_rooms(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rooms = db.query(HumanRoom).filter(HumanRoom.status != "COMPLETED").all()
    results = []
    for r in rooms:
        results.append({
            "id": r.id,
            "host_user_id": r.host_user_id,
            "topic_title": r.topic_title,
            "language": r.language,
            "max_participants": r.max_participants,
            "current_participants": 1,  # Host
            "duration_seconds": r.duration_seconds,
            "is_private": r.is_private,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        })
    return results


@human_router.post("", status_code=status.HTTP_201_CREATED)
def create_human_room(
    req: CreateHumanRoomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = HumanRoom(
        host_user_id=user.id,
        topic_title=req.topic_title.strip(),
        language=req.language,
        max_participants=req.max_participants,
        duration_seconds=req.duration_seconds,
        is_private=req.is_private,
        passkey=req.passkey if req.is_private else None,
        status="WAITING",
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    return {
        "id": room.id,
        "topic_title": room.topic_title,
        "max_participants": room.max_participants,
        "is_private": room.is_private,
        "status": room.status,
    }


@human_router.post("/{room_id}/join")
def join_human_room(
    room_id: str,
    req: JoinHumanRoomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = db.query(HumanRoom).filter(HumanRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")

    if room.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This room has already completed.")

    if room.is_private:
        if not req.passkey or req.passkey.strip() != room.passkey:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid room passkey.")

    return {
        "status": "joined",
        "room_id": room.id,
        "topic_title": room.topic_title,
        "duration_seconds": room.duration_seconds,
        "participant_name": user.full_name,
        "livekit_token": "simulated_livekit_token_for_demo_mode",
    }


@human_router.post("/{room_id}/feedback")
def submit_peer_feedback(
    room_id: str,
    req: PeerFeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = PeerFeedback(
        room_id=room_id,
        reviewer_id=user.id,
        reviewee_id=req.reviewee_id,
        rating=req.rating,
        comments=req.comments,
    )
    db.add(feedback)
    db.commit()

    return {"status": "feedback_saved"}
