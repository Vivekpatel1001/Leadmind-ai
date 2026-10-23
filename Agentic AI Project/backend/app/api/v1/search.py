import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, cast, String
from sse_starlette.sse import EventSourceResponse

from backend.app.database.session import get_db
from backend.app.schemas.search import SearchRequest, SearchHistoryResponse
from backend.app.models.search_history import SearchHistory
from backend.app.models.lead import Lead
from backend.app.orchestrator.orchestrator import Orchestrator

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("/stream")
async def stream_search(request: SearchRequest, db: AsyncSession = Depends(get_db)):
    """
    Executes the multi-agent search workflow and streams real-time status updates via SSE.
    """
    async def event_generator():
        try:
            async for step_event in Orchestrator.run_search_workflow(db, request):
                yield {
                    "event": "agent_progress",
                    "data": json.dumps(step_event)
                }
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield {
                "event": "agent_progress",
                "data": json.dumps({
                    "step": "error",
                    "title": "Search Error",
                    "message": f"An error occurred: {str(e)}",
                    "progress": 100,
                    "data": None
                })
            }

    return EventSourceResponse(event_generator())

@router.get("/history", response_model=list[SearchHistoryResponse])
async def get_search_history(
    user_id: str = "default_user",
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SearchHistory).where(SearchHistory.user_id == user_id).order_by(desc(SearchHistory.created_at)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{search_id}")
async def get_search_by_id(search_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(SearchHistory).where(SearchHistory.id == search_id)
    res = await db.execute(stmt)
    search_rec = res.scalar_one_or_none()
    if not search_rec:
        raise HTTPException(status_code=404, detail="Search record not found")
    
    # Get leads discovered in this search
    stmt_leads = select(Lead).where(cast(Lead.search_ids, String).like(f'%"{search_id}"%'))
    res_leads = await db.execute(stmt_leads)
    leads = res_leads.scalars().all()

    return {
        "search": search_rec,
        "leads": leads
    }
