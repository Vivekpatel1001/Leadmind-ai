from typing import Dict, Any, List, Optional
from backend.app.core.tracing import traceable
from backend.app.schemas.search import RequirementPayload

class QualificationAgent:
    """
    Agent 3 — Lead Qualification Agent
    Responsibilities:
    - Evaluate location, industry, service relevance, and characteristics
    - Classify as HIGH, MEDIUM, or LOW match
    - Generate structured rationale bullet points
    """

    # Country definitions for strict geographic matching
    COUNTRY_PROFILES = {
        "united kingdom": {
            "names": ["united kingdom", "uk", "great britain", "britain", "england", "scotland", "wales", "northern ireland"],
            "tlds": [".co.uk", ".uk", ".org.uk", ".gov.uk", ".ac.uk", ".scot", ".wales", ".london"],
            "phone_prefixes": ["+44", "020", "0161", "0121", "0131", "0117", "0113", "0141", "0151", "0114", "0191", "028"],
            "cities": ["london", "manchester", "birmingham", "edinburgh", "bristol", "leeds", "glasgow", "liverpool", "sheffield", "newcastle", "belfast", "cardiff", "nottingham", "cambridge", "oxford", "brighton", "bath", "reading"],
            "negatives": ["united states", "usa", "u.s.a.", "new york", "san francisco", "los angeles", "california", "texas", "chicago", "toronto", "canada", "australia", "sydney", "new zealand", "auckland", "india", "ahmedabad", "mumbai", "delhi"]
        },
        "new zealand": {
            "names": ["new zealand", "nz", "aotearoa"],
            "tlds": [".co.nz", ".nz", ".org.nz", ".govt.nz", ".ac.nz", ".kiwi"],
            "phone_prefixes": ["+64", "09", "04", "03", "07", "06"],
            "cities": ["auckland", "wellington", "christchurch", "hamilton", "queenstown", "tauranga", "dunedin", "napier", "hastings", "palmerston north", "nelson", "rotorua", "whangarei", "new plymouth", "invercargill"],
            "negatives": ["united states", "usa", "united kingdom", "uk", "london", "canada", "toronto", "india", "australia", "sydney", "melbourne"]
        },
        "canada": {
            "names": ["canada", "canadian"],
            "tlds": [".ca", ".gc.ca", ".on.ca", ".bc.ca", ".qc.ca"],
            "phone_prefixes": ["+1 416", "+1 647", "+1 437", "+1 604", "+1 778", "+1 236", "+1 514", "+1 438", "+1 403", "+1 587", "+1 780", "+1 613", "+1 343", "+1 905", "+1 289", "+1 365", "+1 204", "+1 306", "+1 902"],
            "cities": ["toronto", "vancouver", "montreal", "calgary", "ottawa", "edmonton", "quebec city", "winnipeg", "hamilton", "kitchener", "waterloo", "victoria", "halifax", "mississauga", "brampton", "surrey", "burnaby", "richmond"],
            "negatives": ["united kingdom", "uk", "london", "manchester", "australia", "sydney", "new zealand", "india", "ahmedabad", "mumbai"]
        },
        "united states": {
            "names": ["united states", "usa", "us", "u.s.", "u.s.a.", "america"],
            "tlds": [".us", ".gov", ".mil", ".edu"],
            "phone_prefixes": ["+1"],
            "cities": ["new york", "san francisco", "los angeles", "chicago", "austin", "seattle", "boston", "miami", "denver", "atlanta", "dallas", "houston", "san jose", "san diego", "portland", "phoenix", "las vegas"],
            "negatives": ["united kingdom", "uk", "london", "manchester", "canada", "toronto", "vancouver", "australia", "new zealand", "india", "ahmedabad"]
        },
        "australia": {
            "names": ["australia", "australian", "aussie"],
            "tlds": [".com.au", ".au", ".net.au", ".org.au", ".gov.au", ".edu.au"],
            "phone_prefixes": ["+61", "02", "03", "07", "08"],
            "cities": ["sydney", "melbourne", "brisbane", "perth", "adelaide", "gold coast", "canberra", "newcastle", "wollongong", "hobart", "geelong", "sunshine coast"],
            "negatives": ["united kingdom", "uk", "london", "united states", "usa", "canada", "toronto", "india", "new zealand"]
        },
        "india": {
            "names": ["india", "indian", "bharat"],
            "tlds": [".in", ".co.in", ".net.in", ".org.in", ".gov.in", ".res.in"],
            "phone_prefixes": ["+91", "079", "022", "011", "080", "044", "040", "033", "020", "0124", "0120"],
            "cities": ["ahmedabad", "surat", "vadodara", "rajkot", "gandhinagar", "bhavnagar", "jamnagar", "mumbai", "delhi", "new delhi", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "jaipur", "lucknow", "kanpur", "nagpur", "indore", "noida", "gurgaon", "gurugram", "chandigarh", "kochi"],
            "negatives": ["united kingdom", "uk", "london", "united states", "usa", "new york", "canada", "toronto", "australia", "new zealand"]
        }
    }

    @classmethod
    def _normalize_country_key(cls, target_c: str) -> Optional[str]:
        if not target_c:
            return None
        tc = target_c.strip().lower()
        if any(k in tc for k in ["uk", "united kingdom", "britain", "england", "scotland", "wales"]):
            return "united kingdom"
        if any(k in tc for k in ["nz", "new zealand", "zealand", "kiwi"]):
            return "new zealand"
        if any(k in tc for k in ["canada", "canadian"]):
            return "canada"
        if any(k in tc for k in ["usa", "united states", "america", " u.s.", "us "]) or tc == "us":
            return "united states"
        if any(k in tc for k in ["australia", "australian", "aussie"]):
            return "australia"
        if any(k in tc for k in ["india", "indian", "bharat", "gujarat", "maharashtra"]):
            return "india"
        return tc

    @classmethod
    def is_strict_country_match(cls, target_country: Optional[str], lead: Dict[str, Any]) -> bool:
        """
        Enforce 100% strict geographic authenticity. Returns False if lead originates from another country.
        """
        if not target_country:
            return True

        target_norm = cls._normalize_country_key(target_country)
        profile = cls.COUNTRY_PROFILES.get(target_norm)

        lead_c = (lead.get("country") or "").strip().lower()
        lead_city = (lead.get("city") or "").strip().lower()
        lead_addr = (lead.get("address") or "").strip().lower()
        website = (lead.get("website") or "").strip().lower()
        phone = (lead.get("phone") or "").strip().lower()
        desc = (lead.get("description") or "").strip().lower()

        combined_loc = f"{lead_c} {lead_city} {lead_addr}".lower()

        # If we have a profile for this target country
        if profile:
            # 1. Check for disqualifying negative signals from other major countries
            for neg in profile["negatives"]:
                # If negative keyword appears distinctly in address/country/city without target country name
                if f" {neg} " in f" {combined_loc} " or combined_loc.endswith(f" {neg}") or combined_loc.startswith(f"{neg} "):
                    # Special check: ensure target country name is not also in lead_c
                    if not any(pn in lead_c for pn in profile["names"]):
                        return False

            # 2. Check if lead's declared country matches target
            if any(pn in lead_c for pn in profile["names"]):
                return True

            # 3. Check website domain TLD match
            if any(website.endswith(tld) or f"{tld}/" in website for tld in profile["tlds"]):
                return True

            # 4. Check phone prefix match
            if any(phone.startswith(pref) for pref in profile["phone_prefixes"]):
                return True

            # 5. Check if address or city contains recognized cities in this country
            if any(f" {cty} " in f" {combined_loc} " or combined_loc.endswith(f" {cty}") or combined_loc.startswith(f"{cty} ") or cty in lead_city for cty in profile["cities"]):
                return True

            # 6. Check if target country name appears in combined location
            if any(pn in combined_loc for pn in profile["names"]):
                return True

            # If none matched, it fails strict match
            return False

        # Generic fallback for unprofiled countries
        tc_clean = target_country.strip().lower()
        return tc_clean in combined_loc or lead_c == tc_clean

    @classmethod
    def is_location_match(
        cls,
        target_c: str,
        target_city: str,
        lead_c: str,
        lead_city: str,
        lead_addr: str = "",
        target_reg: str = ""
    ) -> tuple[bool, bool]:
        """Returns (country_match, city_match)"""
        fake_lead = {
            "country": lead_c,
            "city": lead_city,
            "address": lead_addr
        }
        c_match = cls.is_strict_country_match(target_c, fake_lead)

        t_city = (target_city or "").strip().lower()
        l_city = (lead_city or "").strip().lower()
        l_addr = (lead_addr or "").strip().lower()
        combined_lead_loc = f"{l_city} {l_addr}"

        city_match = False
        if t_city:
            t_terms = [t.strip() for t in t_city.replace(",", " ").split() if len(t.strip()) >= 3]
            if any(term in combined_lead_loc for term in t_terms):
                city_match = True
        else:
            city_match = True

        return c_match, city_match

    @classmethod
    @traceable(name="4_QualificationAgent_qualify", run_type="chain")
    def qualify_lead(cls, lead: Dict[str, Any], req: RequirementPayload) -> Dict[str, Any]:
        reasons: List[str] = []
        score_hints = 0

        # Location check
        c_match, city_match = cls.is_location_match(
            req.country or "",
            req.city or "",
            lead.get("country") or "",
            lead.get("city") or "",
            lead.get("address") or "",
            req.region or ""
        )

        if c_match:
            if city_match:
                reasons.append(f"Direct location match in {lead.get('city') or lead.get('address')}")
                score_hints += 4
            else:
                reasons.append(f"Located in target country/region ({lead.get('country')})")
                score_hints += 1
        else:
            reasons.append(f"Located outside primary target territory ({lead.get('country')})")
            score_hints -= 3

        # Industry & Business Type match
        target_ind = (req.industry or req.business_type or "").lower()
        lead_ind = (lead.get("industry") or "").lower()
        lead_type = (lead.get("business_type") or "").lower()

        if target_ind in lead_ind or target_ind in lead_type or lead_ind in target_ind or target_ind == "general business" or target_ind == "retail & local commerce":
            reasons.append(f"Strong industry alignment with {lead.get('industry')} ({lead.get('business_type')})")
            score_hints += 3
        else:
            reasons.append(f"Commercial business in {lead.get('industry')}")
            score_hints += 1

        # Service / Need relevance
        service = req.service or "Local Business Growth"
        if lead.get("website"):
            reasons.append(f"Active digital presence with potential demand for {service}")
            score_hints += 2
        else:
            reasons.append(f"Local brick-and-mortar business with opportunity to establish digital assets")
            score_hints += 2

        # Data completeness
        has_email = lead.get("email") and lead.get("email") != "Not found"
        has_phone = lead.get("phone") and lead.get("phone") != "Not found"
        if has_email and has_phone:
            reasons.append("High contact completeness (Direct email and phone available)")
            score_hints += 2
        elif has_email or has_phone:
            reasons.append("Verified direct contact channel available")
            score_hints += 1

        # Rating determination
        if not c_match and req.country:
            qualification = "LOW"
        elif req.city and not city_match:
            qualification = "MEDIUM" if score_hints >= 5 else "LOW"
        elif score_hints >= 7:
            qualification = "HIGH"
        elif score_hints >= 4:
            qualification = "MEDIUM"
        else:
            qualification = "LOW"

        lead["qualification"] = qualification
        lead["qualification_reasons"] = reasons
        return lead

