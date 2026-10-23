from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse
import re
from rapidfuzz import fuzz
from backend.app.core.tracing import traceable

class DuplicateAgent:
    """
    Agent 5 — Duplicate Detection Agent
    Responsibilities:
    - Normalize business names and websites
    - Identify duplicate businesses across multi-source data
    - Merge records into rich single entries
    - Retain multi-source provenance and count
    """

    @classmethod
    def normalize_name(cls, name: str) -> str:
        if not name:
            return ""
        n = name.lower().strip()
        # Remove common business entity suffixes
        n = re.sub(r'\b(ltd|limited|llc|inc|incorporated|corp|corporation|plc|co|company|group)\b', '', n)
        # Remove punctuation
        n = re.sub(r'[^a-z0-9\s]', '', n)
        return re.sub(r'\s+', ' ', n).strip()

    @classmethod
    def extract_domain(cls, url: Optional[str]) -> str:
        if not url or url == "Not found":
            return ""
        try:
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return ""

    @classmethod
    def are_duplicates(cls, lead1: Dict[str, Any], lead2: Dict[str, Any]) -> bool:
        # 1. Exact Domain Match (if both have websites)
        dom1 = cls.extract_domain(lead1.get("website"))
        dom2 = cls.extract_domain(lead2.get("website"))
        if dom1 and dom2 and dom1 == dom2:
            return True

        # 2. Exact Phone Match
        p1 = re.sub(r'\D', '', lead1.get("phone") or "")
        p2 = re.sub(r'\D', '', lead2.get("phone") or "")
        if p1 and p2 and len(p1) >= 7 and len(p2) >= 7 and p1 == p2:
            return True

        # 3. Fuzzy Name Match + Same City
        norm1 = cls.normalize_name(lead1.get("business_name", ""))
        norm2 = cls.normalize_name(lead2.get("business_name", ""))
        if norm1 and norm2:
            sim = fuzz.token_sort_ratio(norm1, norm2)
            if sim >= 88:
                city1 = (lead1.get("city") or "").lower()
                city2 = (lead2.get("city") or "").lower()
                if not city1 or not city2 or city1 == city2 or city1 in city2 or city2 in city1:
                    return True

        return False

    @classmethod
    @traceable(name="3_DuplicateAgent_deduplicate", run_type="chain")
    def deduplicate_and_merge(cls, leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        unique_leads: List[Dict[str, Any]] = []

        for lead in leads:
            lead["normalized_name"] = cls.normalize_name(lead.get("business_name", ""))
            merged = False
            for existing in unique_leads:
                if cls.are_duplicates(lead, existing):
                    # Merge lead information
                    existing["sources_count"] = existing.get("sources_count", 1) + 1
                    existing["duplicate_status"] = "merged"
                    existing.setdefault("provenance", [{
                        "source": existing.get("source", "Unknown public source"),
                        "url": existing.get("source_url")
                    }])
                    existing["provenance"].append({
                        "source": lead.get("source", "Unknown public source"),
                        "url": lead.get("source_url")
                    })
                    
                    # Complement missing email
                    if (not existing.get("email") or existing.get("email") == "Not found") and lead.get("email") and lead.get("email") != "Not found":
                        existing["email"] = lead["email"]
                    
                    # Complement missing phone
                    if (not existing.get("phone") or existing.get("phone") == "Not found") and lead.get("phone") and lead.get("phone") != "Not found":
                        existing["phone"] = lead["phone"]
                    
                    # Complement missing website
                    if not existing.get("website") and lead.get("website"):
                        existing["website"] = lead["website"]

                    # Append source
                    if lead.get("source") and lead["source"] not in existing.get("source", ""):
                        existing["source"] = f"{existing.get('source', '')}, {lead['source']}".strip(", ")
                    
                    merged = True
                    break

            if not merged:
                if "sources_count" not in lead:
                    lead["sources_count"] = 1
                lead.setdefault("provenance", [{
                    "source": lead.get("source", "Unknown public source"),
                    "url": lead.get("source_url")
                }])
                if "duplicate_status" not in lead:
                    lead["duplicate_status"] = "original"
                unique_leads.append(lead)

        return unique_leads
