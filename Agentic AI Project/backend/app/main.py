import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
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
        result = await session.execute(select(User).where(User.id == "default_user"))
        if result.scalar_one_or_none() is None:
            session.add(User(
                id="default_user",
                email="user@agency.ai",
                name="Lead Generation Pro",
            ))
            await session.commit()
            print("[Startup] Created default user; live providers supply all new leads.")

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
