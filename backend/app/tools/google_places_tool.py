import httpx
import re
import asyncio
from typing import List, Dict, Any, Optional
from backend.app.core.tracing import traceable
from backend.app.core.config import settings

class GooglePlacesTool:
    """
    Live Google Places API (New) tool for querying verified real-world businesses globally
    with high precision geographic search, clean name normalization, and address parsing.
    """

    PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

    COUNTRY_HUBS = {
        "united kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol", "Leeds", "Glasgow"],
        "uk": ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol", "Leeds", "Glasgow"],
        "united states": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Miami", "Seattle"],
        "usa": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Miami", "Seattle"],
        "canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
        "australia": ["Sydney", "Melbourne", "Brisbane", "Perth"],
        "new zealand": ["Auckland", "Wellington", "Christchurch", "Hamilton", "Queenstown"],
        "nz": ["Auckland", "Wellington", "Christchurch", "Hamilton", "Queenstown"],
        "india": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Mumbai", "Bengaluru", "Delhi"]
    }

    @classmethod
    def clean_business_name(cls, raw_name: str) -> str:
        """Sanitize business name from Google Places to remove encoding glitches and tagline noise."""
        if not raw_name:
            return "Commercial Business"
        from backend.app.tools.business_validator import BusinessValidator
        return BusinessValidator.clean_name(raw_name)

    @classmethod
    def extract_city_from_address(cls, addr: str, default_city: Optional[str] = None, country: Optional[str] = None) -> str:
        """Parse clean city name from standard Google Places formattedAddress."""
        if not addr:
            return default_city or "Central"
        
        # 1. Quick check for major known hub cities in the address
        addr_lower = addr.lower()
        c_low = (country or "").lower().strip()
        hub_cities = cls.COUNTRY_HUBS.get(c_low, [])
        # Also check all hubs if no specific country match
        if not hub_cities:
            for hubs in cls.COUNTRY_HUBS.values():
                hub_cities.extend(hubs)
        
        for hub in hub_cities:
            if re.search(r'\b' + re.escape(hub.lower()) + r'\b', addr_lower):
                return hub

        parts = [p.strip() for p in addr.split(",") if p.strip()]
        if not parts:
            return default_city or "Central"
        
        # Address format typically: [Street Number & Name, (Sub-area/Suburb), City PostalCode, Country]
        # Iterate from right to left (excluding the last element which is the country)
        check_parts = parts[-3:-1] if len(parts) >= 3 else ([parts[-2]] if len(parts) >= 2 else parts)
        # Check parts in reverse order (city is right before country)
        for p in reversed(check_parts):
            # Remove postal codes and region codes
            clean_part = re.sub(r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b', '', p) # UK Postcodes
            clean_part = re.sub(r'\b\d{4,6}\b', '', clean_part) # 4-6 digit postcodes (NZ/India/US/AU)
            clean_part = re.sub(r'\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b', '', clean_part) # Canada Postcodes
            clean_part = re.sub(r'\b(ON|BC|QC|AB|MB|SK|NS|NB|NL|PE|NSW|VIC|QLD|WA|SA|TAS|ACT|NT|CBD|England|Scotland|Wales|Northern Ireland|London)\b', '', clean_part)
            clean_part = clean_part.strip(" ,.-")
            
            # Avoid street names if starting with digits or containing street keywords
            street_keywords = ["street", " st", "road", " rd", "avenue", " ave", "lane", " ln", "drive", " dr", "way", "blvd", "boulevard", "house", "building", "floor", "suite", "unit"]
            is_street = any(kw in clean_part.lower() for kw in street_keywords) or (clean_part and clean_part[0].isdigit())
            
            if clean_part and len(clean_part) >= 3 and not clean_part.isdigit() and not is_street:
                return clean_part

        return default_city or (parts[-2] if len(parts) >= 2 else parts[0])

    @classmethod
    @traceable(name="tool_GooglePlaces_API", run_type="tool")
    async def search_businesses(
        cls,
        country: Optional[str],
        city: Optional[str],
        region: Optional[str] = None,
        industry: str = "Commercial Business",
        service: Optional[str] = None,
        target_query: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            return []

        c_low = (country or "").lower().strip()
        if city:
            cities_to_query = [city]
        else:
            cities_to_query = cls.COUNTRY_HUBS.get(c_low, [""])[:4]

        all_results: List[Dict[str, Any]] = []

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryType,places.rating,places.userRatingCount,places.googleMapsUri"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            tasks = []
            for target_city in cities_to_query:
                loc_parts = []
                if target_city:
                    loc_parts.append(target_city)
                if region and region.lower() not in (target_city or "").lower():
                    loc_parts.append(region)
                if country and country.lower() not in (target_city or "").lower() and country.lower() not in (region or "").lower():
                    loc_parts.append(country)

                location_str = ", ".join(loc_parts).strip()
                
                # Construct high-intent target query preserving user's specific target
                target_term = (target_query or industry or "").strip()
                if not target_term or target_term.lower() in ["commercial business", "general business", "commercial businesses"]:
                    if service and any(w in service.lower() for w in ["graphic", "brand", "logo", "creative", "design"]):
                        target_term = "graphic design branding agencies studios"
                    elif service and any(w in service.lower() for w in ["web", "software", "tech", "app"]):
                        target_term = "software development web design companies"
                    elif service and any(w in service.lower() for w in ["seo", "marketing", "advertising"]):
                        target_term = "digital marketing advertising agencies"
                    else:
                        target_term = "commercial businesses"

                # Avoid duplicate city if already inside target_term
                if target_city and target_city.lower() in target_term.lower():
                    text_query = f"{target_term}, {country or ''}".strip(", ")
                else:
                    text_query = f"{target_term} in {location_str}".strip()

                payload = {
                    "textQuery": text_query,
                    "maxResultCount": min(20, max(10, limit // len(cities_to_query) + 2))
                }

                tasks.append(cls._execute_query(client, headers, payload, country, target_city or city, location_str, target_term or industry))

            hub_responses = await asyncio.gather(*tasks, return_exceptions=True)
            for resp in hub_responses:
                if isinstance(resp, list):
                    all_results.extend(resp)

        return all_results[:limit]

    @classmethod
    async def _execute_query(
        cls,
        client: httpx.AsyncClient,
        headers: dict,
        payload: dict,
        country: Optional[str],
        city: Optional[str],
        location_str: str,
        industry: str
    ) -> List[Dict[str, Any]]:
        results = []
        try:
            resp = await client.post(cls.PLACES_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                places = data.get("places", [])
                for p in places:
                    raw_name = p.get("displayName", {}).get("text")
                    if not raw_name:
                        continue
                    
                    name = cls.clean_business_name(raw_name)
                    addr = p.get("formattedAddress", "")
                    website = p.get("websiteUri")
                    phone = p.get("nationalPhoneNumber") or "Not found"
                    maps_url = p.get("googleMapsUri") or "https://maps.google.com"
                    rating = p.get("rating")
                    raw_type = p.get("primaryType") or industry or "Commercial Business"
                    primary_type = raw_type.replace("_", " ").title()

                    detected_city = cls.extract_city_from_address(addr, city, country)

                    desc_parts = [f"Verified {primary_type} operating in {detected_city or location_str or country or 'target region'}."]
                    if rating:
                        desc_parts.append(f"Google Rating: {rating}/5.0.")

                    results.append({
                        "business_name": name,
                        "company_name": name,
                        "industry": industry.title() if industry else "Commercial Business",
                        "business_type": primary_type,
                        "country": country or "Global",
                        "city": detected_city,
                        "address": addr or f"{detected_city}, {country or ''}".strip(", "),
                        "website": website,
                        "email": "Not found",
                        "phone": phone,
                        "social_links": {},
                        "description": " ".join(desc_parts),
                        "source": "Google Places Live Registry",
                        "source_url": maps_url,
                        "verified": True
                    })
        except Exception as e:
            print(f"[GooglePlacesTool] Hub query exception: {e}")

        return results
