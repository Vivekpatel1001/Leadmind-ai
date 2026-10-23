import re
import httpx
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from backend.app.core.config import settings

class TavilyTool:
    """
    Live AI Web Research & Intelligence Tool powered by Tavily Search API.
    Used by ResearchAgent and EnrichmentAgent for accurate real-time business discovery,
    contact extraction, clean business name normalization, and executive profiling.
    """

    API_URL = "https://api.tavily.com/search"

    COUNTRY_HUBS = {
        "united kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol", "Leeds"],
        "uk": ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol", "Leeds"],
        "new zealand": ["Auckland", "Wellington", "Christchurch", "Hamilton", "Queenstown", "Tauranga"],
        "nz": ["Auckland", "Wellington", "Christchurch", "Hamilton", "Queenstown", "Tauranga"],
        "canada": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
        "united states": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle"],
        "usa": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle"],
        "australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
        "india": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Mumbai", "Bengaluru", "Delhi"]
    }

    GENERIC_TITLE_WORDS = [
        "home", "homepage", "welcome", "welcome to", "about", "about us", "contact",
        "contact us", "services", "our services", "our work", "portfolio", "case studies",
        "reviews", "official site", "official website", "top 10", "top 20", "top 50",
        "the best", "best 10", "best 20", "list of", "guide to", "directory", "rankings",
        "locations", "careers", "pricing", "privacy policy", "terms of service", "menu"
    ]

    @classmethod
    def _extract_domain_brand(cls, url: str) -> str:
        """Extract clean formatted brand name from domain (e.g. studionine.co.nz -> Studio Nine)."""
        if not url:
            return ""
        try:
            parsed = urlparse(url)
            netloc = parsed.netloc or url
            domain = netloc.replace("www.", "").split(".")[0]
            # Replace hyphens, underscores, dots
            brand = domain.replace("-", " ").replace("_", " ")
            # Convert camelCase to space
            brand = re.sub(r'([a-z])([A-Z])', r'\1 \2', brand)
            return brand.title()
        except Exception:
            return ""

    @classmethod
    def _clean_business_name(cls, title: str, url: str) -> str:
        """
        Multi-pass intelligent business name cleaner:
        Removes generic website navigation words, slogans, listicle headlines,
        and extracts the authentic corporate brand name.
        """
        if not title:
            return cls._extract_domain_brand(url) or "Commercial Business"

        # Fix encoding artifacts and remove unicode symbols/emojis
        t_clean = title.replace("\ufffd", " ").strip()
        t_clean = re.sub(r'[^\x00-\x7F]+', ' ', t_clean)  # Remove non-ASCII/emojis
        t_clean = re.sub(r'\s+', ' ', t_clean).strip()

        # Split on standard delimiters: " | ", " - ", " – ", " — ", " : ", " · ", " • ", " » "
        delimiters = [" | ", " - ", " – ", " — ", " : ", " · ", ": ", " • ", " » ", " // "]
        parts = [t_clean]
        for d in delimiters:
            if d in parts[0]:
                parts = parts[0].split(d)
                break

        valid_parts = []
        for p in parts:
            p_strip = p.strip(" ,.-|:•»")
            p_low = p_strip.lower()
            if not p_strip or len(p_strip) < 2:
                continue
            # Check if this part is just a generic navigation word
            if any(p_low == g or p_low.startswith(f"{g} ") or p_low.endswith(f" {g}") for g in cls.GENERIC_TITLE_WORDS):
                continue
            valid_parts.append(p_strip)

        candidate = valid_parts[0] if valid_parts else ""

        # Remove trailing slogans/city tags (e.g. "Brandland - Auckland Design Studio" -> "Brandland")
        candidate = re.sub(r'(?i)\b(official website|official site|home page|reviews|nz|uk|usa|australia|canada)\b', '', candidate).strip(" ,.-|:•»")

        # If candidate still looks like a generic SEO title or listicle or is too generic
        domain_brand = cls._extract_domain_brand(url)
        if not candidate or len(candidate) < 3 or any(w in candidate.lower() for w in ["best graphic", "top graphic", "top 10", "list of", "guide to", "find the", "how to", "website designers"]):
            if domain_brand and len(domain_brand) >= 3 and not any(w in domain_brand.lower() for w in ["blog", "article", "medium", "wordpress"]):
                return domain_brand

        # Strip leading/trailing non-alphanumeric punctuation
        candidate = re.sub(r'^[^\w\(\)]+', '', candidate)
        candidate = re.sub(r'[^\w\.\'\)]+$', '', candidate)

        return candidate[:50].strip()

    @classmethod
    async def search_businesses(
        cls,
        country: Optional[str] = None,
        city: Optional[str] = None,
        region: Optional[str] = None,
        industry: str = "Commercial Business",
        service: Optional[str] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        api_key = settings.TAVILY_API_KEY
        if not api_key:
            return []

        c_low = (country or "").lower().strip()
        hubs = [city] if city else cls.COUNTRY_HUBS.get(c_low, [""])[:3]

        leads: List[Dict[str, Any]] = []
        seen_domains = set()

        async with httpx.AsyncClient(timeout=14.0) as client:
            for hub in hubs:
                loc_parts = [p for p in [hub, region, country] if p]
                loc_str = ", ".join(loc_parts)

                target_query_term = industry
                if not target_query_term or target_query_term.lower() in ["commercial business", "general business"]:
                    if service and any(w in service.lower() for w in ["graphic", "brand", "design"]):
                        target_query_term = "graphic design studio agency"
                    elif service and any(w in service.lower() for w in ["web", "software", "tech"]):
                        target_query_term = "web development software company"
                    elif service and any(w in service.lower() for w in ["seo", "marketing"]):
                        target_query_term = "digital marketing agency"
                    else:
                        target_query_term = "commercial businesses"

                # Country-specific high intent queries
                if "united kingdom" in c_low or "uk" in c_low:
                    query = f'"{target_query_term}" official website {hub or "UK"} "co.uk" OR "uk"'
                elif "new zealand" in c_low or "nz" in c_low:
                    query = f'"{target_query_term}" official website {hub or "New Zealand"} "co.nz" OR "nz"'
                elif "canada" in c_low:
                    query = f'"{target_query_term}" official website {hub or "Canada"} "ca"'
                elif "australia" in c_low:
                    query = f'"{target_query_term}" official website {hub or "Australia"} "com.au"'
                else:
                    query = f'"{target_query_term}" official website contact {loc_str}'

                payload = {
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "include_answer": False,
                    "max_results": 10
                }

                try:
                    res = await client.post(cls.API_URL, json=payload)
                    if res.status_code != 200:
                        continue

                    data = res.json()
                    results = data.get("results", [])

                    for item in results:
                        url = item.get("url", "")
                        title = item.get("title", "")
                        content = item.get("content", "") or ""

                        # Skip generic directories, blogs, listicles
                        if cls._is_generic_directory(url) or cls._is_listicle_title(title):
                            continue

                        clean_domain = cls._extract_domain(url)
                        if not clean_domain or clean_domain in seen_domains:
                            continue

                        b_name = cls._clean_business_name(title, url)
                        if not b_name or len(b_name) < 2:
                            continue

                        phone = cls._extract_phone(content)
                        email = cls._extract_email(content)
                        detected_city = hub or cls._extract_city_from_text(content, c_low) or (city or "Central")
                        address = cls._extract_address(content, detected_city, country)

                        lead_record = {
                            "business_name": b_name,
                            "company_name": b_name,
                            "industry": industry.title() if industry else "Commercial Business",
                            "business_type": industry.title() if industry else "Commercial Enterprise",
                            "city": detected_city,
                            "country": country or "Global",
                            "address": address or f"{detected_city}, {country or ''}".strip(", "),
                            "phone": phone if phone else "Not found",
                            "email": email or "Not found",
                            "website": url,
                            "description": content[:220].strip() if content else f"Verified {industry} operating in {loc_str}.",
                            "source": "Tavily AI Web Intelligence",
                            "verified": True
                        }

                        # Strict country verification before adding
                        from backend.app.agents.qualification_agent import QualificationAgent
                        if country and not QualificationAgent.is_strict_country_match(country, lead_record):
                            continue

                        seen_domains.add(clean_domain)
                        leads.append(lead_record)

                        if len(leads) >= limit:
                            return leads

                except Exception as e:
                    print(f"[TavilyTool] Query for hub {hub} note: {e}")

        return leads

    @classmethod
    def _is_generic_directory(cls, url: str) -> bool:
        low = url.lower()
        generic_domains = [
            "facebook.com", "instagram.com", "twitter.com", "x.com",
            "wikipedia.org", "tripadvisor.com", "yelp.com", "yellowpages.",
            "linkedin.com/directory", "google.com", "clutch.co", "upwork.com",
            "fiverr.com", "behance.net", "dribbble.com", "themanifest.com",
            "goodfirms.co", "yelp.co.uk", "yell.com", "topdesignfirms.com",
            "designrush.com", "sortlist.com", "bark.com", "medium.com",
            "hubspot.com", "forbes.com", "quora.com", "reddit.com", "moneyhub.co.nz",
            "trademe.co.nz", "gumtree.", "craigslist.", "squaremeal.co.uk",
            "designmynight.com", "opentable.co.uk", "quandoo.co.uk",
            "justdial.com", "sulekha.com", "indiamart.com", "yellowpages.",
            "gov.in", "gov.uk", "govt.nz", "hospital-directory"
        ]
        return any(d in low for d in generic_domains)

    @classmethod
    def _is_listicle_title(cls, title: str) -> bool:
        low = title.lower()
        listicle_signals = [
            "top 10", "top 20", "top 30", "top 50", "top 100",
            "best 10", "best 20", "best 30", "best 50",
            "top graphic design", "best graphic design",
            "top agencies", "best agencies", "top studios", "best studios",
            "list of", "guide to", "how to find", "companies in the world",
            "directories", "rankings", "reviews", "moneyhub", "restaurant guide",
            "restaurants in", "restaurants near", "restaurants london",
            "restaurants uk", "venue guide", "clinic in", "clinics in",
            "health office", "health office in", "health insurance"
        ]
        return any(sig in low for sig in listicle_signals)

    @classmethod
    def _extract_domain(cls, url: str) -> Optional[str]:
        if not url:
            return None
        try:
            parsed = urlparse(url)
            netloc = parsed.netloc or url
            clean = netloc.replace("www.", "").strip("/")
            return clean
        except Exception:
            return None

    @classmethod
    def _extract_phone(cls, text: str) -> Optional[str]:
        if not text:
            return None
        patterns = [
            r'(\+?[0-9]{1,4}[\s\-]?(?:\([0-9]{1,4}\)[\s\-]?)?[0-9]{2,5}[\s\-]?[0-9]{3,5}[\s\-]?[0-9]{0,5})',
            r'(\+44\s?\d{2,5}\s?\d{3,5}\s?\d{3,5})',
            r'(\+64\s?\d{1,2}\s?\d{3,4}\s?\d{3,4})',
            r'(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})',
            r'(0\d{2,4}\s?\d{3,4}\s?\d{3,4})'
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                digits = re.sub(r'\D', '', cand)
                if 7 <= len(digits) <= 15:
                    return cand
        return None

    @classmethod
    def _extract_email(cls, text: str) -> Optional[str]:
        if not text:
            return None
        match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', text)
        if match:
            cand = match.group(0).lower()
            if not any(bad in cand for bad in [".png", ".jpg", ".jpeg", ".svg", "example.com", "domain.com", "wix.com", "sentry.io"]):
                return cand
        return None

    @classmethod
    def _extract_city_from_text(cls, text: str, country_key: str = "") -> Optional[str]:
        if not text:
            return None
        t_low = text.lower()
        # Check country hubs
        hubs = cls.COUNTRY_HUBS.get(country_key, [])
        for h in hubs:
            if h.lower() in t_low:
                return h
        return None

    @classmethod
    def _extract_address(cls, text: str, city: Optional[str], country: Optional[str]) -> Optional[str]:
        if not text:
            return None
        # Match street patterns
        match = re.search(r'\b(\d{1,4}[A-Za-z]?\s+[A-Za-z0-9\s,.-]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd|Way|Drive|Dr|Place|Pl|Square|Sq|Court|Ct|Broadway)[A-Za-z0-9\s,.-]*)\b', text, re.IGNORECASE)
        if match:
            cand = match.group(1).strip(" ,.-")
            if len(cand) <= 80:
                return f"{cand}, {city or ''}".strip(", ")
        return None
