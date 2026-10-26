from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.app.database.session import get_db
from backend.app.schemas.memory import MemoryQueryRequest, MemoryQueryResponse
from backend.app.agents.memory_agent import MemoryAgent
from backend.app.models.memory import UserPreference

router = APIRouter(prefix="/memory", tags=["Memory"])

@router.get("")
async def get_memory_profile(user_id: str = "default_user", db: AsyncSession = Depends(get_db)):
    summary = await MemoryAgent.get_user_preferences_summary(db, user_id)
    return summary

@router.post("/query", response_model=MemoryQueryResponse)
async def query_memory(payload: MemoryQueryRequest, db: AsyncSession = Depends(get_db)):
    res = await MemoryAgent.answer_historical_query(db, payload.user_id, payload.query)
    return MemoryQueryResponse(**res)

@router.delete("/preference/{pref_id}")
async def delete_preference(pref_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(UserPreference).where(UserPreference.id == pref_id)
    res = await db.execute(stmt)
    pref = res.scalar_one_or_none()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    await db.delete(pref)
    await db.commit()
    return {"status": "success", "deleted_id": pref_id}
