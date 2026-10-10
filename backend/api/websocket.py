"""
WebSocket Endpoint for GD Arena Live Discussion Event Streaming.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.services.brain_service import get_orchestrator
from brain.schemas import DiscussionEvent

logger = logging.getLogger("backend.websocket")
ws_router = APIRouter()


@ws_router.websocket("/ws/sessions/{session_id}")
async def discussion_event_stream(websocket: WebSocket, session_id: str) -> None:
    """Streams live brain discussion events directly to connected clients."""
    await websocket.accept()
    orch = get_orchestrator()

    queue: asyncio.Queue[DiscussionEvent] = asyncio.Queue()

    async def on_event(event: DiscussionEvent) -> None:
        if event.session_id == session_id:
            await queue.put(event)

    # Subscribe to brain event bus
    orch.event_service.subscribe_all(on_event)

    try:
        # Send initial confirmation event
        await websocket.send_text(json.dumps({
            "event_type": "websocket.connected",
            "session_id": session_id,
            "message": "Connected to live discussion event stream."
        }))

        while True:
            # Check for queued events to send or incoming messages
            event = await queue.get()
            event_dict = event.model_dump()
            # ISO format timestamp
            event_dict["timestamp"] = event.timestamp.isoformat()
            await websocket.send_text(json.dumps(event_dict))
            queue.task_done()
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
    except Exception as e:
        logger.error("Error in websocket session %s: %s", session_id, e)
