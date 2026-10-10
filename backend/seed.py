"""
Database Seeding Script for GD Arena.
Creates database tables and inserts initial seeds:
- Dev-only demo student account (demo@gdarena.dev / Demo@1234)
- Dev-only admin account (admin@gdarena.dev / Admin@1234)
- Complete topic library across all categories
- AI participant personality catalog
"""

import bcrypt
from datetime import datetime, timezone
import json
import logging

from backend.database import Base, engine, SessionLocal
from backend.models import (
    User,
    UserProfile,
    UserPreferences,
    ActivityStreak,
    AIPersonality,
    GDTopic,
    InitialAssessment,
)
from brain.personalities import PERSONALITY_CATALOG

logger = logging.getLogger("backend.seed")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def seed_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Demo Student User
        demo_student = db.query(User).filter(User.email == "demo@gdarena.dev").first()
        if not demo_student:
            print("Seeding demo student account...")
            demo_student = User(
                email="demo@gdarena.dev",
                password_hash=hash_password("Demo@1234"),
                full_name="Rahul Verma (Demo Student)",
                role="student",
                is_active=True,
            )
            db.add(demo_student)
            db.flush()

            # Profile
            profile = UserProfile(
                user_id=demo_student.id,
                college="National Institute of Technology",
                year="Third",
                course="B.Tech",
                branch="Computer Science & Engineering",
                experience_areas=json.dumps(["group discussions", "technical presentations", "debates"]),
                gd_confidence="Intermediate",
                baseline_summary="Articulate with strong conceptual structure; benefits from initiating earlier.",
            )
            db.add(profile)

            # Preferences
            prefs = UserPreferences(
                user_id=demo_student.id,
                preferred_language="English",
                live_captions=True,
                silent_nudges=True,
                ai_patience="Normal",
                timezone="Asia/Kolkata",
            )
            db.add(prefs)

            # Streak
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            streak = ActivityStreak(
                user_id=demo_student.id,
                current_streak=3,
                longest_streak=5,
                total_active_days=7,
                total_sessions=12,
                last_active_date=today_str,
            )
            db.add(streak)

            # Initial Assessment Baseline
            assessment = InitialAssessment(
                user_id=demo_student.id,
                topic="Should colleges focus more on practical skills than theoretical knowledge?",
                transcript="I believe colleges must strike a balance. While theoretical foundations teach problem solving, practical project work and internships build real-world employability.",
                duration_seconds=28.0,
                clarity_score=78.0,
                relevance_score=85.0,
                pace_wpm=135.0,
                baseline_notes="Good pacing and balanced perspective. Complete thought expressed.",
            )
            db.add(assessment)

        # 2. Seed Admin User
        admin_user = db.query(User).filter(User.email == "admin@gdarena.dev").first()
        if not admin_user:
            print("Seeding admin account...")
            admin_user = User(
                email="admin@gdarena.dev",
                password_hash=hash_password("Admin@1234"),
                full_name="GD Arena Admin",
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.flush()

            admin_profile = UserProfile(
                user_id=admin_user.id,
                college="GD Arena Administration",
                year="Other",
                course="Administration",
                branch="Platform Management",
                gd_confidence="Advanced",
            )
            db.add(admin_profile)

        # 3. Seed AI Personalities
        for profile in PERSONALITY_CATALOG.values():
            existing = db.query(AIPersonality).filter(AIPersonality.profile_key == profile.profile_type.value).first()
            if not existing:
                ai_p = AIPersonality(
                    profile_key=profile.profile_type.value,
                    name=profile.name,
                    description=profile.description,
                    communication_style=profile.communication_style,
                    speaking_frequency=profile.speaking_frequency,
                    argumentation_style=profile.argumentation_style,
                    interruption_tendency=profile.interruption_tendency,
                    agreement_bias=profile.agreement_bias,
                    topic_relevance=profile.topic_relevance_adherence,
                    prompt_instructions=profile.prompt_instructions,
                    voice_name=profile.voice_name,
                    is_active=True,
                )
                db.add(ai_p)

        # 4. Seed Topics
        topics_data = [
            # Technology
            ("Is Artificial Intelligence a threat to entry-level jobs?", "Technology", "Intermediate", "General", "Examine technological displacement vs job enhancement for graduates."),
            ("Should coding be made mandatory for all university students?", "Technology", "Beginner", "General", "Debate computational literacy across diverse non-tech majors."),
            ("Can Generative AI replace software developers in the next decade?", "Technology", "Advanced", "Controversial", "Weigh automated code generation against architectural reasoning."),
            ("Is cybersecurity and privacy more important than user convenience?", "Technology", "Intermediate", "General", "Analyze the tradeoff between frictionless tech and security protocols."),
            ("Should social media algorithms be legally regulated by governments?", "Technology", "Advanced", "Controversial", "Discuss algorithmic bias, free speech, and psychological impact."),
            # Education
            ("Practical skills vs Theoretical knowledge: What should college prioritize?", "Education", "Beginner", "General", "Evaluate curriculum balance for industrial readiness."),
            ("Is compulsory 75% college attendance justified in the modern era?", "Education", "Beginner", "Controversial", "Debate discipline and lecture attendance versus self-paced mastery."),
            ("Online degrees vs Traditional on-campus university education", "Education", "Intermediate", "General", "Compare accessibility and costs with peer networking and labs."),
            ("Are standardized examinations the best tool for student evaluation?", "Education", "Intermediate", "General", "Assess continuous evaluation, portfolios, and exam stress."),
            ("Mandatory corporate internships before college graduation: Boon or bane?", "Education", "Beginner", "General", "Discuss industrial exposure versus internship exploitation."),
            # Business & Economy
            ("Joining a high-growth startup vs an established Fortune 500 corporation", "Business and Economy", "Beginner", "General", "Contrast risk-taking and versatile ownership with stability."),
            ("Remote work vs Return to office for early-career professionals", "Business and Economy", "Intermediate", "General", "Examine mentorship, isolation, productivity, and flexibility."),
            ("Entrepreneurship vs Secure Employment in developing economies", "Business and Economy", "Intermediate", "General", "Analyze risk tolerance, capital constraints, and wealth generation."),
            ("Skills vs Degrees: What truly dictates 21st-century career trajectories?", "Business and Economy", "Intermediate", "General", "Discuss credentialism versus verifiable portfolio competence."),
            # Social Issues
            ("Impact of hyper-connected social media on Gen Z mental health", "Social Issues", "Beginner", "General", "Evaluate digital consumption, dopamine cycles, and anxiety."),
            ("Smartphones in higher-education classrooms: Learning tool or distraction?", "Social Issues", "Beginner", "General", "Examine digital research vs split attention spans."),
            ("Rapid industrial development vs Ecological sustainability and climate justice", "Social Issues", "Advanced", "Controversial", "Debate growth imperatives versus carbon footprint reduction."),
            # Abstract
            ("The Colour Blue: Freedom, Tranquility, or Melancholy?", "Abstract", "Advanced", "Abstract", "Creative metaphorical exploration testing lateral thinking."),
            ("Silence is more powerful than words: True strength or avoidance?", "Abstract", "Intermediate", "Abstract", "Examine diplomacy, restraint, and decisive voice."),
            ("Failure is the first step to success: Reality or comforting platitude?", "Abstract", "Beginner", "Abstract", "Analyze post-mortem learning, perseverance, and survivorship bias."),
            ("Time is infinitely more valuable than money", "Abstract", "Beginner", "Abstract", "Philosophical exploration of irreversibility vs economic leverage."),
            # Case-Based
            ("Resource Allocation Case: College budget split between AI Lab, Library, or Scholarships", "Case-Based", "Advanced", "Case-Based", "Prioritize capital allocation given competing stakeholder demands."),
        ]

        for title, cat, diff, fmt, desc in topics_data:
            existing_t = db.query(GDTopic).filter(GDTopic.title == title).first()
            if not existing_t:
                topic = GDTopic(
                    title=title,
                    category=cat,
                    difficulty=diff,
                    format=fmt,
                    description=desc,
                    is_custom=False,
                )
                db.add(topic)

        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
