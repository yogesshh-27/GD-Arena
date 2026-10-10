"""
Backend service adapter connecting FastAPI routes to the GD Arena Brain.
"""

from brain.orchestrator import BrainOrchestrator

# Global singleton orchestrator for backend
orchestrator = BrainOrchestrator()


def get_orchestrator() -> BrainOrchestrator:
    """Return the shared BrainOrchestrator instance."""
    return orchestrator
