"""
REST API Routes for GD Arena.

Exposes thin, typed HTTP endpoints that delegate orchestration to the Brain.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from brain.personalities import get_all_profiles
from brain.schemas import FinalReport, SessionConfig
from backend.services.brain_service import get_orchestrator

router = APIRouter(prefix="/api", tags=["sessions"])


class StudentTurnRequest(BaseModel):
    text: Optional[str] = Field(default=None, description="Spoken text from user")
    audio_base64: Optional[str] = Field(default=None, description="Base64 encoded audio bytes")
    is_interruption: bool = Field(default=False, description="Flag indicating student interrupted active AI")


@router.get("/personalities")
async def list_personalities() -> List[Dict[str, Any]]:
    """List available AI participant personality archetypes."""
    profiles = get_all_profiles()
    return [p.model_dump() for p in profiles]


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(config: SessionConfig) -> Dict[str, Any]:
    """Create and configure a new isolated GD practice session."""
    orch = get_orchestrator()
    try:
        session = await orch.create_session(config)
        return {
            "session_id": session.session_id,
            "status": session.status.value,
            "topic": session.config.topic,
            "participants": [p.model_dump() for p in session.participants],
            "duration_seconds": session.config.duration_seconds,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> Dict[str, Any]:
    """Retrieve current discussion state and transcript history."""
    orch = get_orchestrator()
    try:
        session = orch.session_manager.get_session(session_id)
        return session.to_dict()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/sessions/{session_id}/start")
async def start_session(session_id: str) -> Dict[str, Any]:
    """Start discussion and receive moderator's opening statement."""
    orch = get_orchestrator()
    try:
        result = await orch.start_session(session_id)
        return {
            "session_id": session_id,
            "opening_turn": result["entry"].model_dump(),
            "audio": result["audio"],
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sessions/{session_id}/turn/student")
async def submit_student_turn(session_id: str, request: StudentTurnRequest) -> Dict[str, Any]:
    """Submit candidate speech or text."""
    orch = get_orchestrator()
    try:
        raw_bytes = None
        if request.audio_base64:
            import base64
            raw_bytes = base64.b64decode(request.audio_base64)

        entry = await orch.submit_student_turn(
            session_id=session_id,
            text=request.text,
            audio_bytes=raw_bytes,
            is_interruption=request.is_interruption,
        )
        return {"entry": entry.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sessions/{session_id}/turn/next")
async def request_next_turn(session_id: str) -> Dict[str, Any]:
    """Request the brain to calculate the next speaker and generate their turn."""
    orch = get_orchestrator()
    try:
        result = await orch.request_next_turn(session_id)
        # Convert any Pydantic models to dicts
        response_payload = {}
        for k, v in result.items():
            if hasattr(v, "model_dump"):
                response_payload[k] = v.model_dump()
            else:
                response_payload[k] = v
        return response_payload
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sessions/{session_id}/interrupt")
async def interrupt_speaker(session_id: str) -> Dict[str, Any]:
    """Interrupt the currently speaking AI participant."""
    orch = get_orchestrator()
    try:
        return await orch.interrupt_speaker(session_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str) -> Dict[str, Any]:
    """End the discussion session and retrieve the comprehensive final report."""
    orch = get_orchestrator()
    try:
        report = await orch.end_session(session_id)
        return report.model_dump()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/sessions/{session_id}/report")
async def get_report(session_id: str) -> Dict[str, Any]:
    """Retrieve the generated performance report for a session."""
    orch = get_orchestrator()
    try:
        report = await orch.generate_report(session_id)
        return report.model_dump()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
