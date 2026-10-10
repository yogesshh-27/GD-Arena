"""
Session Repository Interface and Implementations.

Provides an abstract interface BaseSessionRepository to allow swappable persistence
(In-Memory for development and testing, SQLite / PostgreSQL for production).
"""

from abc import ABC, abstractmethod
import asyncio
from typing import Dict, List, Optional
from copy import deepcopy


class BaseSessionRepository(ABC):
    """Abstract storage interface for discussion sessions."""

    @abstractmethod
    async def save_session(self, session_id: str, session_data: dict) -> None:
        """Persist or update session state."""
        pass

    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Retrieve session data by session_id."""
        pass

    @abstractmethod
    async def session_exists(self, session_id: str) -> bool:
        """Check if session exists."""
        pass

    @abstractmethod
    async def list_sessions(self) -> List[dict]:
        """List all known sessions."""
        pass

    @abstractmethod
    async def delete_session(self, session_id: str) -> bool:
        """Remove a session."""
        pass


class InMemorySessionRepository(BaseSessionRepository):
    """
    In-memory session storage for development and testing.

    NOTE: All data stored in this repository is held in memory and will be lost
    when the backend process or server restarts.
    """

    def __init__(self) -> None:
        self._storage: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def save_session(self, session_id: str, session_data: dict) -> None:
        async with self._lock:
            # Store a deepcopy to avoid accidental external mutation
            self._storage[session_id] = deepcopy(session_data)

    async def get_session(self, session_id: str) -> Optional[dict]:
        async with self._lock:
            data = self._storage.get(session_id)
            return deepcopy(data) if data is not None else None

    async def session_exists(self, session_id: str) -> bool:
        async with self._lock:
            return session_id in self._storage

    async def list_sessions(self) -> List[dict]:
        async with self._lock:
            return [deepcopy(s) for s in self._storage.values()]

    async def delete_session(self, session_id: str) -> bool:
        async with self._lock:
            if session_id in self._storage:
                del self._storage[session_id]
                return True
            return False

    async def clear_all(self) -> None:
        """Clear all stored sessions (useful for unit tests)."""
        async with self._lock:
            self._storage.clear()
