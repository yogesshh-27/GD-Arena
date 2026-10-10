"""
Event Service for GD Arena Brain.

Asynchronous publish-subscribe event dispatch layer connecting the brain core
to external consumers (e.g., FastAPI WebSocket handlers, telemetry, test observers).
Ensures loose coupling without duplicating session state.
"""

import asyncio
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional
import uuid

from brain.schemas import DiscussionEvent


EventHandler = Callable[[DiscussionEvent], Coroutine[Any, Any, None]]


class EventService:
    """Async event bus for dispatching discussion lifecycle events."""

    def __init__(self) -> None:
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._global_handlers: List[EventHandler] = []
        self._event_history: Dict[str, List[DiscussionEvent]] = {}
        self._lock = asyncio.Lock()

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Subscribe to specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def subscribe_all(self, handler: EventHandler) -> None:
        """Subscribe to all events across all sessions."""
        self._global_handlers.append(handler)

    async def publish(
        self,
        session_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None
    ) -> DiscussionEvent:
        """Publish an event to all registered listeners."""
        eid = event_id or f"evt_{uuid.uuid4().hex[:12]}"
        event = DiscussionEvent(
            event_id=eid,
            session_id=session_id,
            event_type=event_type,
            timestamp=datetime.now(timezone.utc),
            payload=payload or {}
        )

        async with self._lock:
            if session_id not in self._event_history:
                self._event_history[session_id] = []
            self._event_history[session_id].append(event)

        # Dispatch asynchronously to matching listeners
        handlers_to_call: List[EventHandler] = []
        if event_type in self._handlers:
            handlers_to_call.extend(self._handlers[event_type])
        handlers_to_call.extend(self._global_handlers)

        for handler in handlers_to_call:
            try:
                # Run handler safely
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(event))
                else:
                    handler(event)
            except Exception:
                # Handlers must not break core brain event flow
                pass

        return event

    def get_session_events(self, session_id: str) -> List[DiscussionEvent]:
        """Fetch recorded events for a session."""
        return list(self._event_history.get(session_id, []))

    def clear_session_events(self, session_id: str) -> None:
        """Cleanup session events."""
        self._event_history.pop(session_id, None)
