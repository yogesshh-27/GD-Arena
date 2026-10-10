"""
End-to-end API Integration tests for GD Arena backend routes.
Covers Auth, Onboarding, Baseline Assessment, Dashboard, Topics, AI GD, and Human GD.
"""

from fastapi.testclient import TestClient
from backend.main import app
from backend.seed import seed_database

# Ensure database is seeded before running tests
seed_database()

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["demo_mode"] is True


def test_auth_demo_login():
    res = client.post(
        "/api/auth/login",
        json={"email": "demo@gdarena.dev", "password": "Demo@1234"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"
    assert data["user"]["has_completed_onboarding"] is True


def test_auth_wrong_credentials():
    res = client.post(
        "/api/auth/login",
        json={"email": "demo@gdarena.dev", "password": "WrongPassword"},
    )
    assert res.status_code == 401


def test_user_lifecycle_signup_onboarding_assessment():
    import uuid
    test_email = f"student_{uuid.uuid4().hex[:6]}@college.edu"

    # 1. Signup
    signup_res = client.post(
        "/api/auth/signup",
        json={"email": test_email, "password": "Password@123", "full_name": "Pooja Student"},
    )
    assert signup_res.status_code == 201
    auth_data = signup_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Duplicate email rejected
    dup_res = client.post(
        "/api/auth/signup",
        json={"email": test_email, "password": "Password@123", "full_name": "Pooja Duplicate"},
    )
    assert dup_res.status_code == 400

    # 3. Onboarding step 1
    step1_res = client.post(
        "/api/onboarding/academic",
        headers=headers,
        json={"college": "Delhi Technological University", "year": "Third", "course": "B.Tech", "branch": "Information Technology"},
    )
    assert step1_res.status_code == 200

    # 4. Onboarding step 2
    step2_res = client.post(
        "/api/onboarding/experience",
        headers=headers,
        json={"experience_areas": ["debates", "group discussions"], "gd_confidence": "Intermediate"},
    )
    assert step2_res.status_code == 200

    # 5. Baseline assessment
    assess_res = client.post(
        "/api/assessment/baseline",
        headers=headers,
        json={
            "topic": "Should colleges focus more on practical skills than theoretical knowledge?",
            "transcript": "I believe practical skills directly impact industry readiness, although theory is essential for core algorithms.",
            "duration_seconds": 25.0,
        },
    )
    assert assess_res.status_code == 200
    assert "baseline_summary" in assess_res.json()

    # 6. Dashboard summary
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["profile"]["college"] == "Delhi Technological University"
    assert "weekly_activity" in dash_data["streak"]


def test_topics_and_custom_topic():
    # Login as demo
    login_res = client.post("/api/auth/login", json={"email": "demo@gdarena.dev", "password": "Demo@1234"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List topics
    list_res = client.get("/api/topics?category=Technology", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 3

    # Create custom topic
    custom_res = client.post(
        "/api/topics/custom",
        headers=headers,
        json={"title": "Should quantum computing research receive more public funding?"},
    )
    assert custom_res.status_code == 201
    assert custom_res.json()["is_custom"] is True


def test_human_room_flow():
    login_res = client.post("/api/auth/login", json={"email": "demo@gdarena.dev", "password": "Demo@1234"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create human room
    create_res = client.post(
        "/api/human-rooms",
        headers=headers,
        json={"topic_title": "AI in Healthcare Ethics", "max_participants": 5, "duration_seconds": 900},
    )
    assert create_res.status_code == 201
    room_id = create_res.json()["id"]

    # Join human room
    join_res = client.post(f"/api/human-rooms/{room_id}/join", headers=headers, json={})
    assert join_res.status_code == 200
    assert join_res.json()["status"] == "joined"


def test_personalities_endpoint():
    response = client.get("/api/personalities")
    assert response.status_code == 200
    profiles = response.json()
    assert len(profiles) >= 5
    profile_names = [p["name"] for p in profiles]
    assert "Vikram Mehta" in profile_names
    assert "Ananya Sharma" in profile_names


def test_full_discussion_api_flow():
    # 1. Create room
    create_payload = {
        "topic": "Remote Work vs Office Work for Fresh Graduates",
        "participant_count": 4,
        "duration_seconds": 600,
        "student_name": "Test Candidate",
    }
    create_res = client.post("/api/sessions", json=create_payload)
    assert create_res.status_code == 201
    room_data = create_res.json()
    session_id = room_data["session_id"]
    assert session_id is not None
    assert len(room_data["participants"]) == 4

    # 2. Get session status
    get_res = client.get(f"/api/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "READY"

    # 3. Start session
    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["opening_turn"]["speaker_type"] == "MODERATOR"

    # 4. Student submits turn
    turn_res = client.post(
        f"/api/sessions/{session_id}/turn/student",
        json={"text": "Freshers benefit greatly from in-person mentorship in the early career phase."},
    )
    assert turn_res.status_code == 200
    assert turn_res.json()["entry"]["speaker_type"] == "STUDENT"

    # 5. Request next AI turn
    next_res = client.post(f"/api/sessions/{session_id}/turn/next")
    assert next_res.status_code == 200

    # 6. Interrupt
    int_res = client.post(f"/api/sessions/{session_id}/interrupt")
    assert int_res.status_code == 200

    # 7. End session and retrieve final report
    end_res = client.post(f"/api/sessions/{session_id}/end")
    assert end_res.status_code == 200
    report = end_res.json()
    assert report["session_id"] == session_id
    assert report["status"] == "COMPLETED"
    assert len(report["feedback"]) == 9
    assert report["overall_score"] >= 1.0
