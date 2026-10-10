# Deployment & Architecture Guide — GD Arena

## Architecture Overview

```
Frontend (Vite / Next.js)  <--->  FastAPI Server (Python)  <--->  Central Brain Package
    - React + TypeScript              - JWT Authentication             - Turn Manager
    - Tailwind CSS + Lucide           - REST & WebSocket Routes        - Moderator Engine
    - Web Speech STT/TTS Fallback     - SQLite / PostgreSQL            - 5 AI Archetypes
    - 21st.dev Editorial Design       - Background Task Runner         - Evidence Engine
```

---

## 1. Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup
```bash
# 1. Clone repository
git clone https://github.com/yogesshh-27/GD-Arena.git
cd GD-Arena

# 2. Setup Backend
python -m pip install -r backend/requirements.txt   # or pip install fastapi uvicorn pydantic python-jose passlib bcrypt
python -m backend.seed                              # Seeds default topics, personalities & demo accounts

# 3. Start Backend Server (port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 4. Setup & Start Frontend (port 5173)
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Visit `http://localhost:5173` to test the application.

---

## 2. Production Deployment

### Option A: Vercel (Frontend) + Render / Railway (Backend)
1. **Frontend on Vercel**:
   - Root directory: `frontend/`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`
2. **Backend on Render / Railway**:
   - Environment: Python 3.10+
   - Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Environment variables (from `.env.example`):
     - `DEMO_MODE=true` (for free evaluator exploration) or configured with `GEMINI_API_KEY`, `DEEPGRAM_API_KEY`, etc.
     - `DATABASE_URL=postgresql://user:pass@host:5432/gdarena` (or default SQLite)
     - `JWT_SECRET_KEY=your_secure_secret_key`

### Option B: Docker Container
A multi-stage Docker build can package the FastAPI backend serving the compiled React frontend directly:

```dockerfile
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
