import re
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse

class BusinessValidator:
    """
    Centralized validation & sanitization engine to ensure every lead
    is an authentic business and eliminate listicle headlines, blog posts,
    directory aggregators, and fabricated emails.
    """

    INVALID_NAME_PATTERNS = [
        # Number + Superlative: "3 Best Cafes...", "10 Top Dentists...", "50 Best..."
        re.compile(r'^\d+\s+(?:best|top|greatest|finest|leading|popular|recommended|famous)\b', re.IGNORECASE),
        # "The 50 best...", "The 10 Top..."
        re.compile(r'^(?:the\s+)?\d+\s+(?:best|top|greatest|finest|leading|popular)\b', re.IGNORECASE),
        # Contains "best/top X in Y": "Best Cafe in Vadodara", "Top Restaurants in Ahmedabad"
        re.compile(r'\b(?:the\s+)?(?:best|top|finest|greatest|leading)\s+[\w\s]{1,35}\s+(?:in|near|around|of|for)\s+[A-Za-z]+', re.IGNORECASE),
        # Starts with superlative + category: "Best Cafe", "Top Dentist", "Best Doctor"
        re.compile(r'^(?:the\s+)?(?:best|top|finest|top-rated|highest rated)\s+(?:cafes?|coffee(?:\s+shops?)?|restaurants?|dentists?|doctors?|lawyers?|schools?|colleges?|dealers?|agencies|companies|services|shops?|stores?|hotels?|gyms?|salons?|hospitals?|clinics?|places?)\b', re.IGNORECASE),
        # Listicles & Guides: "Guide to ...", "List of ...", "Where to eat ..."
        re.compile(r'\b(?:guide to|list of|where to eat|where to find|how to find|top rated|best rated|reviews? of|directory of|rankings? of|overview of)\b', re.IGNORECASE),
        # Category + City phrase: "Cafes in Vadodara", "Dentists in Mumbai"
        re.compile(r'^(?:cafes?|restaurants?|dentists?|doctors?|lawyers?|schools?|dealers?|agencies|companies|services|shops?|stores?|clinics?|hospitals?)\s+(?:in|near|at)\s+[A-Za-z]+', re.IGNORECASE),
        # Market Reports: "Report 2026", "Market Size 2025"
        re.compile(r'\b(?:report|guide|census|market size|statistics|quick commerce)\s+202\d\b', re.IGNORECASE),
    ]

    GENERIC_NAMES = {
        "commercial business", "commercial businesses", "general business", "local business",
        "business directory", "cafeinindia", "retail shop", "company profile", "not found",
        "unknown", "best cafes", "best restaurants", "best doctors", "best dealers", "top cafes",
        "best cafe in vadodara", "3 best cafes in vadodara, gj", "best cafes in vadodara"
    }

    AGGREGATOR_DOMAINS = [
        "threebestrated", "wanderlog", "tripadvisor", "zomato", "swiggy", "cafemenu", "citywity",
        "yappe", "justdial", "indiamart", "sulekha", "magicbricks", "99acres", "housing.com",
        "carwale", "cardekho", "bikewale", "eater.com", "timeout.com", "foursquare.com",
        "mouthshut.com", "lbb.in", "whatshot.in", "dineout", "magicpin", "eazydiner", "holidify",
        "makemytrip", "goibibo", "booking.com", "agoda", "airbnb", "yelp.", "yellowpages.",
        "clutch.co", "goodfirms.", "bark.com", "sortlist.", "topdesignfirms.", "designrush.",
        "upwork.com", "fiverr.com", "freelancer.", "guru.com", "toptal.com", "quora.com",
        "reddit.com", "medium.com", "wikipedia.org", "tradeindia", "indiabiz", "indialistings",
        "dribbble.com", "behance.net", "moneyhub", "contact-us.com", "growthservice.in",
        "thehindu.com", "indiatimes.com", "ndtv.com", "timesofindia.com"
    ]

    DISALLOWED_EMAIL_DOMAINS = [
        "contact-us.com", "domain.com", "example.com", "wix.com", "wordpress.com",
        "sentry.io", "github.com", "google.com", "tripadvisor.", "zomato.", "swiggy.",
        "justdial.", "indiamart.", "carwale.", "cardekho.", "wanderlog.", "citywity.",
        "yappe.", "cafemenu.", "threebestrated.", "sulekha.", "growthservice.", "cafeinindia."
    ]

    @classmethod
    def is_invalid_name(cls, name: str) -> bool:
        if not name:
            return True
        clean = name.strip()
        if len(clean) < 3 or len(clean) > 80:
            return True
        low = clean.lower()
        if low in cls.GENERIC_NAMES:
            return True
        # Check against all regex patterns
        for pat in cls.INVALID_NAME_PATTERNS:
            if pat.search(clean):
                return True
        return False

    @classmethod
    def is_aggregator_domain(cls, url: Optional[str]) -> bool:
        if not url:
            return False
        u_low = url.lower()
        for agg in cls.AGGREGATOR_DOMAINS:
            if agg in u_low:
                return True
        return False

    @classmethod
    def clean_name(cls, raw_name: str) -> str:
        """Strip SEO slogans, category suffixes, and city tags to recover the authentic brand."""
        if not raw_name:
            return ""
        name = raw_name.replace("\ufffd", "-").strip()
        # Split on standard delimiters: " | ", " - ", " – ", " — ", " : ", " // "
        delimiters = [" | ", " - ", " – ", " — ", " : ", " // "]
        for d in delimiters:
            if d in name:
                parts = name.split(d)
                cand = parts[0].strip(" ,.-")
                if len(cand) >= 3 and not cls.is_invalid_name(cand):
                    name = cand
                    break
        # Strip leading numbers or punctuation
        name = re.sub(r'^[^\w\(\)]+', '', name)
        name = re.sub(r'[^\w\.\'\)]+$', '', name)
        return name[:60].strip()

    @classmethod
    def clean_email(cls, email: Optional[str]) -> str:
        if not email or email.strip().lower() in ["not found", "none", "null", ""]:
            return "Not found"
        e_low = email.strip().lower()
        if any(bad in e_low for bad in cls.DISALLOWED_EMAIL_DOMAINS):
            return "Not found"
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', e_low):
            return "Not found"
        return e_low

    @classmethod
    def validate_and_clean_lead(cls, lead: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validates lead authenticity. If valid, cleans name and email, and returns the lead.
        If invalid (listicle, aggregator, generic headline), returns None.
        """
        raw_name = lead.get("business_name") or lead.get("company_name") or ""
        website = lead.get("website")

        # 1. Reject aggregator directory sites
        if cls.is_aggregator_domain(website):
            return None

        # 2. Clean business name
        cleaned_name = cls.clean_name(raw_name)
        if cls.is_invalid_name(cleaned_name):
            return None

        # 3. Clean email (prevent fabricated or aggregator emails)
        cleaned_email = cls.clean_email(lead.get("email"))

        lead["business_name"] = cleaned_name
        lead["company_name"] = cleaned_name
        lead["email"] = cleaned_email

        return lead
