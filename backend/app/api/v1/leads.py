from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func, delete

from backend.app.database.session import get_db
from backend.app.models.lead import Lead
from backend.app.schemas.lead import LeadResponse, LeadUpdate, LeadListResponse

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=LeadListResponse)
async def list_leads(
    query: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    industry: Optional[str] = None,
    min_score: Optional[int] = None,
    qualification: Optional[str] = None,
    has_email: Optional[bool] = None,
    has_phone: Optional[bool] = None,
    has_website: Optional[bool] = None,
    saved_only: Optional[bool] = None,
    status: Optional[str] = None,
    crm_stage: Optional[str] = None,
    tag: Optional[str] = None,
    user_id: str = "default_user",
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "lead_score", # lead_score, created_at, business_name
    order: str = "desc",
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Lead).where(Lead.user_id == user_id)

    if query:
        q_pattern = f"%{query}%"
        stmt = stmt.where(
            or_(
                Lead.business_name.ilike(q_pattern),
                Lead.industry.ilike(q_pattern),
                Lead.city.ilike(q_pattern),
                Lead.description.ilike(q_pattern)
            )
        )
    if country:
        stmt = stmt.where(Lead.country.ilike(f"%{country}%"))
    if city:
        stmt = stmt.where(Lead.city.ilike(f"%{city}%"))
    if industry:
        stmt = stmt.where(Lead.industry.ilike(f"%{industry}%"))
    if min_score is not None:
        stmt = stmt.where(Lead.lead_score >= min_score)
    if qualification:
        stmt = stmt.where(Lead.qualification == qualification.upper())
    if has_email:
        stmt = stmt.where(and_(Lead.email.isnot(None), Lead.email != "Not found"))
    if has_phone:
        stmt = stmt.where(and_(Lead.phone.isnot(None), Lead.phone != "Not found"))
    if has_website:
        stmt = stmt.where(Lead.website.isnot(None))
    if saved_only:
        stmt = stmt.where(Lead.saved == True)
    if status:
        stmt = stmt.where(Lead.status == status)
    if crm_stage:
        stmt = stmt.where(Lead.crm_stage == crm_stage)

    # Count total matching
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count_res = await db.execute(count_stmt)
    total_count = total_count_res.scalar_one()

    # Sort
    if sort_by == "lead_score":
        sort_col = Lead.lead_score
    elif sort_by == "created_at":
        sort_col = Lead.created_at
    else:
        sort_col = Lead.business_name

    if order == "desc":
        stmt = stmt.order_by(desc(sort_col))
    else:
        stmt = stmt.order_by(sort_col)

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    leads = res.scalars().all()

    # Filter tag in python if requested (since tags is JSON list)
    if tag:
        leads = [l for l in leads if tag in (l.tags or [])]

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "leads": leads
    }

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.post("/{lead_id}/save")
async def toggle_save_lead(lead_id: str, saved: Optional[bool] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if saved is not None:
        lead.saved = saved
    else:
        lead.saved = not lead.saved
    
    await db.commit()
    return {"id": lead.id, "saved": lead.saved}

@router.post("/{lead_id}/notes")
async def update_lead_notes(lead_id: str, payload: Dict[str, str] = Body(...), db: AsyncSession = Depends(get_db)):
    notes = payload.get("notes", "")
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.notes = notes
    await db.commit()
    return {"id": lead.id, "notes": lead.notes}

@router.post("/{lead_id}/tag")
async def update_lead_tags(lead_id: str, payload: Dict[str, List[str]] = Body(...), db: AsyncSession = Depends(get_db)):
    tags = payload.get("tags", [])
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.tags = tags
    await db.commit()
    return {"id": lead.id, "tags": lead.tags}

@router.patch("/{lead_id}/status")
async def update_lead_status(lead_id: str, payload: Dict[str, str] = Body(...), db: AsyncSession = Depends(get_db)):
    status = payload.get("status", "new")
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = status
    await db.commit()
    return {"id": lead.id, "status": lead.status}

@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Lead).where(Lead.id == lead_id)
    res = await db.execute(stmt)
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await db.delete(lead)
    await db.commit()
    return {"status": "success", "deleted_id": lead_id}

@router.post("/bulk-action")
async def bulk_action(payload: Dict[str, Any] = Body(...), db: AsyncSession = Depends(get_db)):
    lead_ids = payload.get("lead_ids", [])
    action = payload.get("action") # "save", "unsave", "status", "tag", "delete"
    
    if not lead_ids:
        return {"affected": 0}
        
    stmt = select(Lead).where(Lead.id.in_(lead_ids))
    res = await db.execute(stmt)
    leads = res.scalars().all()

    for lead in leads:
        if action == "save":
            lead.saved = True
        elif action == "unsave":
            lead.saved = False
        elif action == "status":
            lead.status = payload.get("status", "contacted")
        elif action == "tag":
            tag_to_add = payload.get("tag")
            if tag_to_add and tag_to_add not in (lead.tags or []):
                tags = list(lead.tags or [])
                tags.append(tag_to_add)
                lead.tags = tags
        elif action == "delete":
            await db.delete(lead)

    await db.commit()
    return {"affected": len(leads), "action": action}
