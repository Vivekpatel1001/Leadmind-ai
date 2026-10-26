from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from sqlalchemy import select, func, desc

from backend.app.database.session import get_db
from backend.app.models.lead import Lead
from backend.app.models.search_history import SearchHistory
from backend.app.schemas.dashboard import DashboardMetrics

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(user_id: str = "default_user", db: AsyncSession = Depends(get_db)):
    # Total Leads
    tot_leads_res = await db.execute(select(func.count(Lead.id)).where(Lead.user_id == user_id))
    total_leads = tot_leads_res.scalar_one() or 0

    # Saved Leads
    saved_res = await db.execute(select(func.count(Lead.id)).where(Lead.user_id == user_id, Lead.saved == True))
    saved_leads = saved_res.scalar_one() or 0

    # Searches
    searches_res = await db.execute(select(func.count(SearchHistory.id)).where(SearchHistory.user_id == user_id))
    total_searches = searches_res.scalar_one() or 0

    week_start = datetime.utcnow() - timedelta(days=7)
    new_leads_res = await db.execute(
        select(func.count(Lead.id)).where(
            Lead.user_id == user_id,
            Lead.created_at >= week_start,
        )
    )
    new_leads_this_week = new_leads_res.scalar_one() or 0

    # Qualification counts
    high_res = await db.execute(select(func.count(Lead.id)).where(Lead.user_id == user_id, Lead.qualification == "HIGH"))
    high_count = high_res.scalar_one() or 0

    med_res = await db.execute(select(func.count(Lead.id)).where(Lead.user_id == user_id, Lead.qualification == "MEDIUM"))
    med_count = med_res.scalar_one() or 0

    low_res = await db.execute(select(func.count(Lead.id)).where(Lead.user_id == user_id, Lead.qualification == "LOW"))
    low_count = low_res.scalar_one() or 0

    # Recent Searches
    rec_searches_res = await db.execute(
        select(SearchHistory).where(SearchHistory.user_id == user_id).order_by(desc(SearchHistory.created_at)).limit(5)
    )
    recent_searches = rec_searches_res.scalars().all()

    # Recent Leads
    rec_leads_res = await db.execute(
        select(Lead).where(Lead.user_id == user_id).order_by(desc(Lead.created_at)).limit(6)
    )
    recent_leads = rec_leads_res.scalars().all()

    # Top Industries
    ind_res = await db.execute(
        select(Lead.industry, func.count(Lead.id))
        .where(Lead.user_id == user_id, Lead.industry.isnot(None))
        .group_by(Lead.industry)
        .order_by(desc(func.count(Lead.id)))
        .limit(5)
    )
    top_industries = [{"industry": row[0], "count": row[1]} for row in ind_res.all()]

    # Top Locations
    loc_res = await db.execute(
        select(Lead.city, Lead.country, func.count(Lead.id))
        .where(Lead.user_id == user_id)
        .group_by(Lead.city, Lead.country)
        .order_by(desc(func.count(Lead.id)))
        .limit(5)
    )
    top_locations = [{"location": f"{row[0] or ''}, {row[1] or ''}".strip(", "), "count": row[2]} for row in loc_res.all()]

    return DashboardMetrics(
        total_leads=total_leads,
        saved_leads=saved_leads,
        total_searches=total_searches,
        new_leads_this_week=new_leads_this_week,
        high_match_count=high_count,
        medium_match_count=med_count,
        low_match_count=low_count,
        recent_searches=recent_searches,
        recent_leads=recent_leads,
        top_industries=top_industries,
        top_locations=top_locations
    )
