import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from backend.app.core.config import settings
from backend.app.database.session import init_db, AsyncSessionLocal
from backend.app.models.user import User
from backend.app.models.lead import Lead
from backend.app.models.search_history import SearchHistory
from backend.app.models.memory import UserPreference
from backend.app.tools.directory_tool import DirectoryTool
from backend.app.agents.duplicate_agent import DuplicateAgent
from backend.app.agents.qualification_agent import QualificationAgent
from backend.app.agents.scoring_agent import ScoringAgent
from backend.app.schemas.search import RequirementPayload

from backend.app.api.v1.search import router as search_router
from backend.app.api.v1.leads import router as leads_router
from backend.app.api.v1.memory import router as memory_router
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.export import router as export_router
from backend.app.api.v1.settings import router as settings_router
from backend.app.api.v1.outreach import router as outreach_router

async def seed_initial_data():
    async with AsyncSessionLocal() as session:
        # Check if leads exist
        res = await session.execute(select(func.count(Lead.id)))
        count = res.scalar_one()
        if count == 0:
            print("[Seed] Initializing sample records for demo environment...")
            # Create default user
            user = User(id="default_user", email="user@agency.ai", name="Lead Generation Pro")
            session.add(user)

            # Create initial search record for Canada
            search_rec_ca = SearchHistory(
                id="search-initial-ca-design",
                user_id="default_user",
                query="Find Canadian restaurants and businesses that need graphic design",
                parsed_requirements={
                    "country": "Canada",
                    "industry": "Food & Beverage",
                    "business_type": "Restaurant",
                    "service": "Graphic Design",
                    "lead_count": 25,
                    "exclusions": []
                },
                search_plan={"target": "Food & Beverage in Canada", "limit": 25},
                total_found=6,
                high_match_count=5,
                medium_match_count=1,
                low_match_count=0,
                excluded_previous=False,
                execution_time_seconds=1.2
            )
            session.add(search_rec_ca)

            # Seed initial directory records
            sample_data = DirectoryTool.DATASET[:10]
            for idx, item in enumerate(sample_data):
                item_dict = dict(item)
                req = RequirementPayload(
                    country=item_dict.get("country"),
                    industry=item_dict.get("industry"),
                    service="Graphic Design"
                )
                item_dict = QualificationAgent.qualify_lead(item_dict, req)
                item_dict = ScoringAgent.score_lead(item_dict, req)
                norm_name = DuplicateAgent.normalize_name(item_dict["business_name"])
                
                lead = Lead(
                    user_id="default_user",
                    business_name=item_dict["business_name"],
                    normalized_name=norm_name,
                    industry=item_dict.get("industry"),
                    business_type=item_dict.get("business_type"),
                    country=item_dict.get("country"),
                    city=item_dict.get("city"),
                    region=item_dict.get("region"),
                    address=item_dict.get("address"),
                    website=item_dict.get("website"),
                    email=item_dict.get("email", "Not found"),
                    phone=item_dict.get("phone", "Not found"),
                    social_links=item_dict.get("social_links", {}),
                    description=item_dict.get("description"),
                    source=item_dict.get("source", "Business Registry"),
                    source_url=item_dict.get("source_url"),
                    sources_count=1,
                    verified=True,
                    qualification=item_dict.get("qualification", "HIGH"),
                    qualification_reasons=item_dict.get("qualification_reasons", []),
                    lead_score=item_dict.get("lead_score", 90),
                    score_breakdown=item_dict.get("score_breakdown", {}),
                    search_ids=[search_rec_ca.id],
                    tags=["Design Prospect"] if idx < 3 else ["Prospect"],
                    notes="Promising brand with upcoming menu & brand revamp opportunity." if idx == 0 else "",
                    saved=(idx < 4),
                    status="contacted" if idx == 1 else "new",
                    duplicate_status="original"
                )
                session.add(lead)

            # Initial User Preferences in Memory
            pref1 = UserPreference(
                user_id="default_user",
                category="target_country",
                key="Canada",
                value={"notes": "Active target market"},
                frequency=5
            )
            pref2 = UserPreference(
                user_id="default_user",
                category="preferred_industry",
                key="Food & Beverage",
                value={"notes": "Hospitality and lifestyle brands"},
                frequency=5
            )
            pref3 = UserPreference(
                user_id="default_user",
                category="offered_service",
                key="Graphic Design",
                value={"notes": "Brand identity and menus"},
                frequency=5
            )
            session.add_all([pref1, pref2, pref3])

            await session.commit()
            print("[Seed] Seed data successfully committed.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await seed_initial_data()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(memory_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(outreach_router, prefix=settings.API_V1_STR)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.post("/voice")
@app.get("/voice")
async def root_twilio_voice():
    from twilio.twiml.voice_response import VoiceResponse
    twiml = VoiceResponse()
    twiml.say(
        "Hello from LeadMind AI! Your autonomous AI voice calling agent is connected and fully operational. Have a wonderful day!",
        voice="alice",
        language="en-US"
    )
    twiml.pause(length=1)
    return Response(content=str(twiml), media_type="application/xml")
