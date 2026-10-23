import csv
import io
from fastapi import APIRouter, Depends, Body, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database.session import get_db
from backend.app.models.lead import Lead

router = APIRouter(prefix="/export", tags=["Export"])

@router.post("/csv")
async def export_csv(payload: dict = Body(...), db: AsyncSession = Depends(get_db)):
    lead_ids = payload.get("lead_ids", [])
    user_id = payload.get("user_id", "default_user")

    stmt = select(Lead).where(Lead.user_id == user_id)
    if lead_ids:
        stmt = stmt.where(Lead.id.in_(lead_ids))

    res = await db.execute(stmt)
    leads = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Business Name",
        "Industry",
        "Business Type",
        "Country",
        "City",
        "Address",
        "Website",
        "Email",
        "Phone",
        "Lead Score",
        "Qualification",
        "Source",
        "Saved",
        "Status",
        "Notes"
    ])

    for l in leads:
        writer.writerow([
            l.business_name,
            l.industry or "",
            l.business_type or "",
            l.country or "",
            l.city or "",
            l.address or "",
            l.website or "",
            l.email or "Not found",
            l.phone or "Not found",
            l.lead_score,
            l.qualification,
            l.source,
            "Yes" if l.saved else "No",
            l.status,
            l.notes or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
    )
