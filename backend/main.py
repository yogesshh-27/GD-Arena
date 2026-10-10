"""
GD Arena Backend Application.

Main entry point for FastAPI serving the GD Arena Brain orchestration layer.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router as api_router
from backend.api.auth_routes import auth_router
from backend.api.dashboard_routes import dash_router
from backend.api.human_rooms_routes import human_router
from backend.api.websocket import ws_router
from brain.config import config

app = FastAPI(
    title="GD Arena API",
    description="AI-powered, voice-first Group Discussion practice platform orchestration layer.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(dash_router)
app.include_router(human_router)
app.include_router(api_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint indicating operational mode and active settings."""
    return {
        "status": "healthy",
        "service": "GD Arena Brain & API",
        "demo_mode": config.demo_mode,
        "environment": config.environment,
        "llm_provider": config.llm_provider,
        "stt_provider": config.stt_provider,
        "tts_provider": config.tts_provider,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
