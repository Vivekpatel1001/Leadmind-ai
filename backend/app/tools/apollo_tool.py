import httpx
from typing import List, Dict, Any, Optional
from backend.app.core.tracing import traceable
from backend.app.core.config import settings

class ApolloTool:
    """
    Live Apollo.io B2B Intelligence Tool.
    Uses provided Apollo API key to search verified business organizations.
    """

    APOLLO_ORG_SEARCH_URL = "https://api.apollo.io/api/v1/organizations/search"

    @classmethod
    @traceable(name="tool_Apollo_B2B_API", run_type="tool")
    async def search_organizations(
        cls,
        country: Optional[str],
        city: Optional[str],
        industry: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        api_key = settings.APOLLO_API_KEY
        if not api_key:
            return []

        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": api_key
        }

        locations = []
        if city:
            locations.append(city)
        if country:
            locations.append(country)

        payload = {
            "q_organization_locations": locations or ["Canada"],
            "q_organization_keyword_tags": [industry],
            "page": 1,
            "per_page": min(25, max(5, limit))
        }

        results: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(cls.APOLLO_ORG_SEARCH_URL, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    orgs = data.get("organizations", [])
                    for org in orgs:
                        name = org.get("name")
                        if not name:
                            continue
                        
                        domain = org.get("primary_domain")
                        web = f"https://{domain}" if domain and not domain.startswith("http") else domain
                        phone = org.get("phone") or "Not found"
                        org_city = org.get("city") or city
                        org_country = org.get("country") or country
                        
                        socials = {}
                        if org.get("linkedin_url"):
                            socials["linkedin"] = org.get("linkedin_url")
                        if org.get("twitter_url"):
                            socials["twitter"] = org.get("twitter_url")

                        results.append({
                            "business_name": name,
                            "industry": industry.title(),
                            "business_type": org.get("industry") or "B2B Organization",
                            "country": org_country or "Canada",
                            "city": org_city or (city or "Toronto"),
                            "address": f"{org_city or ''}, {org_country or ''}".strip(", "),
                            "website": web,
                            "email": "Not found",
                            "phone": phone,
                            "social_links": socials,
                            "description": org.get("short_description") or f"Organization in {org_city or ''}, {org_country or ''}.",
                            "source": "Apollo B2B Directory",
                            "source_url": web or "https://apollo.io",
                            "verified": True
                        })
                else:
                    # Log for debugging without failing
                    print(f"[ApolloTool] Status {resp.status_code}: {resp.text[:120]}")
        except Exception as e:
            print(f"[ApolloTool] Request exception: {e}")

        return results
