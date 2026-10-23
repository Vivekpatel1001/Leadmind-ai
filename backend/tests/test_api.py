import pytest
import pytest_asyncio
import httpx
from backend.app.main import app
from backend.app.database.session import init_db

@pytest.mark.asyncio
async def test_full_api_endpoints():
    await init_db()
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        resp = await client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "online"

        # 2. Dashboard metrics
        d_resp = await client.get("/api/v1/dashboard/metrics")
        assert d_resp.status_code == 200
        metrics = d_resp.json()
        assert "total_leads" in metrics
        assert "saved_leads" in metrics

        # 3. List leads
        leads_resp = await client.get("/api/v1/leads")
        assert leads_resp.status_code == 200
        data = leads_resp.json()
        assert "leads" in data
        assert "total" in data

        if data["leads"]:
            first_lead_id = data["leads"][0]["id"]
            
            # 4. Toggle save
            save_resp = await client.post(f"/api/v1/leads/{first_lead_id}/save")
            assert save_resp.status_code == 200

            # 5. Add notes
            notes_resp = await client.post(f"/api/v1/leads/{first_lead_id}/notes", json={"notes": "High priority test note"})
            assert notes_resp.status_code == 200
            assert notes_resp.json()["notes"] == "High priority test note"

            # 6. Add tags
            tags_resp = await client.post(f"/api/v1/leads/{first_lead_id}/tag", json={"tags": ["VIP Prospect", "Q4 Outreach"]})
            assert tags_resp.status_code == 200
            assert "VIP Prospect" in tags_resp.json()["tags"]

        # 7. Memory query
        mem_resp = await client.post("/api/v1/memory/query", json={"query": "Show previous UK restaurant leads"})
        assert mem_resp.status_code == 200
        mem_data = mem_resp.json()
        assert "answer" in mem_data
        assert "intent" in mem_data

        # 8. Export CSV
        exp_resp = await client.post("/api/v1/export/csv", json={"lead_ids": []})
        assert exp_resp.status_code == 200
        assert "Business Name" in exp_resp.text
