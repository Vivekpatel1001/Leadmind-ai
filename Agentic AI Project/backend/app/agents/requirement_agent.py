import re
import json
from typing import Dict, Any, Optional
from backend.app.core.tracing import traceable
from backend.app.schemas.search import RequirementPayload
from backend.app.core.config import settings

class RequirementAgent:
    """
    Agent 1 — Requirement Understanding Agent
    Responsibilities:
    - Understand user natural language query
    - Extract Country, City, Industry, Business Type, Service, Company Size, Lead Quantity, Exclusions
    - Convert to structured JSON payload
    """

    @classmethod
    @traceable(name="1_RequirementAgent_extract", run_type="chain")
    async def extract_requirements(cls, query: str, user_preferences: Optional[Dict[str, Any]] = None) -> RequirementPayload:
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = f"""
                You are an expert B2B lead requirement extraction agent. Analyze the user search request and extract structured parameters in JSON format.
                User Request: "{query}"

                CRITICAL EXTRACTION RULES:
                1. Distinguish TARGET BUSINESS vs OFFERED SERVICE:
                   - If user says "Find graphic design agencies in UK" -> Target Industry is "Design & Creative Agencies", business_type is "Graphic Design Agency", service is "Commercial Growth".
                   - If user says "Find 50 UK restaurants that need graphic design" -> Target Industry is "Food & Beverage", business_type is "Restaurant", service is "Graphic Design".
                   - If user says "Find software companies in New Zealand" -> Target Industry is "Technology & Software", business_type is "Software Company".
                2. LOCATION:
                   - Extract country (e.g. "United Kingdom", "New Zealand", "Canada", "United States", "Australia", "India", etc.).
                   - Extract city if specified (e.g. "London", "Auckland", "Toronto", "Melbourne", etc.) or null if country-wide.

                Return ONLY valid JSON with keys:
                - country (string or null)
                - city (string or null)
                - region (string or null)
                - industry (string, e.g. "Design & Creative", "Food & Beverage", "Healthcare", "Technology & Software", "Retail & Local Commerce")
                - business_type (string, e.g. "Graphic Design Agency", "Restaurant", "Dental Clinic", "Software Company")
                - service (string, what the user offers, e.g. "Graphic Design", "Web Design", "SEO", "Commercial Growth")
                - company_size (string or null)
                - lead_count (integer, default 25)
                - exclusions (list of string patterns to avoid)
                - must_have_email (boolean)
                - must_have_phone (boolean)
                - must_have_website (boolean)
                - new_leads_only (boolean)
                """
                response = await model.generate_content_async(prompt)
                clean_text = response.text.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()
                data = json.loads(clean_text)
                return RequirementPayload(**data)
            except Exception as e:
                print(f"[RequirementAgent] Gemini extraction note: {e}")

        # Intelligent Heuristic / NLP Extractor Fallback
        return cls._heuristic_extract(query, user_preferences)

    # Comprehensive World Countries & Synonyms
    WORLD_COUNTRIES = {
        # Common typos & aliases
        "senmario": "San Marino",
        "san mario": "San Marino",
        "sanmarino": "San Marino",
        "san marino": "San Marino",
        "uk": "United Kingdom",
        "united kingdom": "United Kingdom",
        "britain": "United Kingdom",
        "great britain": "United Kingdom",
        "england": "United Kingdom",
        "scotland": "United Kingdom",
        "wales": "United Kingdom",
        "british": "United Kingdom",
        "english": "United Kingdom",
        "us": "United States",
        "usa": "United States",
        "united states": "United States",
        "united states of america": "United States",
        "america": "United States",
        "american": "United States",
        "ca": "Canada",
        "canada": "Canada",
        "canadian": "Canada",
        "au": "Australia",
        "australia": "Australia",
        "australian": "Australia",
        "nz": "New Zealand",
        "new zealand": "New Zealand",
        "new zealands": "New Zealand",
        "newzealand": "New Zealand",
        "newzealands": "New Zealand",
        "zealand": "New Zealand",
        "zealands": "New Zealand",
        "kiwi": "New Zealand",
        "kiwis": "New Zealand",
        "uae": "United Arab Emirates",
        "united arab emirates": "United Arab Emirates",
        "dubai": "United Arab Emirates",
        "abu dhabi": "United Arab Emirates",
        "emirates": "United Arab Emirates",
        "germany": "Germany",
        "german": "Germany",
        "deutschland": "Germany",
        "france": "France",
        "french": "France",
        "italy": "Italy",
        "italian": "Italy",
        "italia": "Italy",
        "spain": "Spain",
        "spanish": "Spain",
        "espana": "Spain",
        "netherlands": "Netherlands",
        "dutch": "Netherlands",
        "holland": "Netherlands",
        "switzerland": "Switzerland",
        "swiss": "Switzerland",
        "sweden": "Sweden",
        "swedish": "Sweden",
        "norway": "Norway",
        "norwegian": "Norway",
        "denmark": "Denmark",
        "danish": "Denmark",
        "finland": "Finland",
        "finnish": "Finland",
        "ireland": "Ireland",
        "irish": "Ireland",
        "belgium": "Belgium",
        "belgian": "Belgium",
        "austria": "Austria",
        "austrian": "Austria",
        "portugal": "Portugal",
        "portuguese": "Portugal",
        "poland": "Poland",
        "polish": "Poland",
        "czech republic": "Czech Republic",
        "czechia": "Czech Republic",
        "greece": "Greece",
        "greek": "Greece",
        "singapore": "Singapore",
        "singaporean": "Singapore",
        "japan": "Japan",
        "japanese": "Japan",
        "south korea": "South Korea",
        "korea": "South Korea",
        "korean": "South Korea",
        "india": "India",
        "indian": "India",
        "china": "China",
        "chinese": "China",
        "brazil": "Brazil",
        "brazilian": "Brazil",
        "brasil": "Brazil",
        "mexico": "Mexico",
        "mexican": "Mexico",
        "argentina": "Argentina",
        "south africa": "South Africa",
        "saudi arabia": "Saudi Arabia",
        "saudi": "Saudi Arabia",
        "israel": "Israel",
        "israeli": "Israel",
        "turkey": "Turkey",
        "turkish": "Turkey",
        "thailand": "Thailand",
        "thai": "Thailand",
        "vietnam": "Vietnam",
        "vietnamese": "Vietnam",
        "indonesia": "Indonesia",
        "malaysia": "Malaysia",
        "philippines": "Philippines",
        "filipino": "Philippines",
        "taiwan": "Taiwan",
        "taiwanese": "Taiwan",
        "hong kong": "Hong Kong",
        "monaco": "Monaco",
        "luxembourg": "Luxembourg",
        "iceland": "Iceland",
        "malta": "Malta",
        "cyprus": "Cyprus",
        "estonia": "Estonia",
        "latvia": "Latvia",
        "lithuania": "Lithuania",
        "croatia": "Croatia",
        "serbia": "Serbia",
        "slovenia": "Slovenia",
        "slovakia": "Slovakia",
        "hungary": "Hungary",
        "romania": "Romania",
        "bulgaria": "Bulgaria",
        "ukraine": "Ukraine",
        "egypt": "Egypt",
        "nigeria": "Nigeria",
        "kenya": "Kenya",
        "chile": "Chile",
        "colombia": "Colombia",
        "peru": "Peru"
    }

    # Indian States & Global Regions
    REGIONS_STATES = {
        # Indian States
        "gujarat": ("Gujarat", "India"),
        "maharashtra": ("Maharashtra", "India"),
        "karnataka": ("Karnataka", "India"),
        "tamil nadu": ("Tamil Nadu", "India"),
        "delhi": ("Delhi", "India"),
        "telangana": ("Telangana", "India"),
        "rajasthan": ("Rajasthan", "India"),
        "uttar pradesh": ("Uttar Pradesh", "India"),
        "west bengal": ("West Bengal", "India"),
        "kerala": ("Kerala", "India"),
        "punjab": ("Punjab", "India"),
        "haryana": ("Haryana", "India"),
        "madhya pradesh": ("Madhya Pradesh", "India"),
        "goa": ("Goa", "India"),
        "andhra pradesh": ("Andhra Pradesh", "India"),
        "bihar": ("Bihar", "India"),
        "odisha": ("Odisha", "India"),
        "assam": ("Assam", "India"),
        "uttarakhand": ("Uttarakhand", "India"),
        "himachal pradesh": ("Himachal Pradesh", "India"),
        "chandigarh": ("Chandigarh", "India"),
        # US States
        "california": ("California", "United States"),
        "texas": ("Texas", "United States"),
        "florida": ("Florida", "United States"),
        "new york state": ("New York", "United States"),
        "washington state": ("Washington", "United States"),
        # Canadian Provinces
        "ontario": ("Ontario", "Canada"),
        "british columbia": ("British Columbia", "Canada"),
        "quebec": ("Quebec", "Canada"),
        "alberta": ("Alberta", "Canada")
    }

    # Cities and Specific Localities Map: keyword -> (City/Locality string, Region/State, Country)
    CITIES_LOCALITIES_MAP = {
        # --- GUJARAT LOCALITIES & AREAS ---
        "navrangpura": ("Navrangpura, Ahmedabad", "Gujarat", "India"),
        "satellite": ("Satellite, Ahmedabad", "Gujarat", "India"),
        "vastrapur": ("Vastrapur, Ahmedabad", "Gujarat", "India"),
        "sg highway": ("SG Highway, Ahmedabad", "Gujarat", "India"),
        "s.g. highway": ("SG Highway, Ahmedabad", "Gujarat", "India"),
        "s.g. road": ("SG Highway, Ahmedabad", "Gujarat", "India"),
        "cg road": ("CG Road, Ahmedabad", "Gujarat", "India"),
        "c.g. road": ("CG Road, Ahmedabad", "Gujarat", "India"),
        "bopal": ("Bopal, Ahmedabad", "Gujarat", "India"),
        "south bopal": ("South Bopal, Ahmedabad", "Gujarat", "India"),
        "prahlad nagar": ("Prahlad Nagar, Ahmedabad", "Gujarat", "India"),
        "prahladnagar": ("Prahlad Nagar, Ahmedabad", "Gujarat", "India"),
        "bodakdev": ("Bodakdev, Ahmedabad", "Gujarat", "India"),
        "maninagar": ("Maninagar, Ahmedabad", "Gujarat", "India"),
        "paldi": ("Paldi, Ahmedabad", "Gujarat", "India"),
        "thaltej": ("Thaltej, Ahmedabad", "Gujarat", "India"),
        "gota": ("Gota, Ahmedabad", "Gujarat", "India"),
        "nikol": ("Nikol, Ahmedabad", "Gujarat", "India"),
        "chandkheda": ("Chandkheda, Ahmedabad", "Gujarat", "India"),
        "ghatlodiya": ("Ghatlodiya, Ahmedabad", "Gujarat", "India"),
        "naranpura": ("Naranpura, Ahmedabad", "Gujarat", "India"),
        "ashram road": ("Ashram Road, Ahmedabad", "Gujarat", "India"),
        "sindhu bhavan": ("Sindhu Bhavan Road, Ahmedabad", "Gujarat", "India"),
        "sindhu bhavan road": ("Sindhu Bhavan Road, Ahmedabad", "Gujarat", "India"),
        "sbr": ("Sindhu Bhavan Road, Ahmedabad", "Gujarat", "India"),
        "science city": ("Science City, Ahmedabad", "Gujarat", "India"),
        "motera": ("Motera, Ahmedabad", "Gujarat", "India"),
        "sabarmati": ("Sabarmati, Ahmedabad", "Gujarat", "India"),
        "ranip": ("Ranip, Ahmedabad", "Gujarat", "India"),
        "isanpur": ("Isanpur, Ahmedabad", "Gujarat", "India"),
        "vatva": ("Vatva, Ahmedabad", "Gujarat", "India"),
        "naroda": ("Naroda, Ahmedabad", "Gujarat", "India"),
        "adajan": ("Adajan, Surat", "Gujarat", "India"),
        "vesu": ("Vesu, Surat", "Gujarat", "India"),
        "varachha": ("Varachha, Surat", "Gujarat", "India"),
        "katargam": ("Katargam, Surat", "Gujarat", "India"),
        "rander": ("Rander, Surat", "Gujarat", "India"),
        "piplod": ("Piplod, Surat", "Gujarat", "India"),
        "alkapuri": ("Alkapuri, Vadodara", "Gujarat", "India"),
        "fatehgunj": ("Fatehgunj, Vadodara", "Gujarat", "India"),
        "fateh gunj": ("Fatehgunj, Vadodara", "Gujarat", "India"),
        "manjalpur": ("Manjalpur, Vadodara", "Gujarat", "India"),
        "sayajigunj": ("Sayajigunj, Vadodara", "Gujarat", "India"),
        "gotri": ("Gotri, Vadodara", "Gujarat", "India"),
        "akota": ("Akota, Vadodara", "Gujarat", "India"),
        "yagnik road": ("Yagnik Road, Rajkot", "Gujarat", "India"),
        "kalawad road": ("Kalawad Road, Rajkot", "Gujarat", "India"),
        "infocity": ("Infocity, Gandhinagar", "Gujarat", "India"),

        # --- GUJARAT CITIES & DISTRICTS ---
        "ahmedabad": ("Ahmedabad", "Gujarat", "India"),
        "amdavad": ("Ahmedabad", "Gujarat", "India"),
        "surat": ("Surat", "Gujarat", "India"),
        "vadodara": ("Vadodara", "Gujarat", "India"),
        "baroda": ("Vadodara", "Gujarat", "India"),
        "rajkot": ("Rajkot", "Gujarat", "India"),
        "bhavnagar": ("Bhavnagar", "Gujarat", "India"),
        "jamnagar": ("Jamnagar", "Gujarat", "India"),
        "gandhinagar": ("Gandhinagar", "Gujarat", "India"),
        "junagadh": ("Junagadh", "Gujarat", "India"),
        "anand": ("Anand", "Gujarat", "India"),
        "navsari": ("Navsari", "Gujarat", "India"),
        "morbi": ("Morbi", "Gujarat", "India"),
        "bharuch": ("Bharuch", "Gujarat", "India"),
        "vapi": ("Vapi", "Gujarat", "India"),
        "valsad": ("Valsad", "Gujarat", "India"),
        "porbandar": ("Porbandar", "Gujarat", "India"),
        "bhuj": ("Bhuj", "Gujarat", "India"),
        "gandhidham": ("Gandhidham", "Gujarat", "India"),
        "mehsana": ("Mehsana", "Gujarat", "India"),
        "palanpur": ("Palanpur", "Gujarat", "India"),
        "surendranagar": ("Surendranagar", "Gujarat", "India"),
        "amreli": ("Amreli", "Gujarat", "India"),
        "patan": ("Patan", "Gujarat", "India"),
        "godhra": ("Godhra", "Gujarat", "India"),
        "veraval": ("Veraval", "Gujarat", "India"),
        "himatnagar": ("Himatnagar", "Gujarat", "India"),
        "nadiad": ("Nadiad", "Gujarat", "India"),
        "botad": ("Botad", "Gujarat", "India"),
        "dahod": ("Dahod", "Gujarat", "India"),
        "deesa": ("Deesa", "Gujarat", "India"),
        "gondal": ("Gondal", "Gujarat", "India"),
        "jetpur": ("Jetpur", "Gujarat", "India"),

        # --- MAJOR INDIAN METROS & CITIES ---
        "mumbai": ("Mumbai", "Maharashtra", "India"),
        "delhi": ("Delhi", "Delhi", "India"),
        "new delhi": ("New Delhi", "Delhi", "India"),
        "bengaluru": ("Bengaluru", "Karnataka", "India"),
        "bangalore": ("Bengaluru", "Karnataka", "India"),
        "hyderabad": ("Hyderabad", "Telangana", "India"),
        "chennai": ("Chennai", "Tamil Nadu", "India"),
        "kolkata": ("Kolkata", "West Bengal", "India"),
        "pune": ("Pune", "Maharashtra", "India"),
        "jaipur": ("Jaipur", "Rajasthan", "India"),
        "lucknow": ("Lucknow", "Uttar Pradesh", "India"),
        "kanpur": ("Kanpur", "Uttar Pradesh", "India"),
        "nagpur": ("Nagpur", "Maharashtra", "India"),
        "indore": ("Indore", "Madhya Pradesh", "India"),
        "thane": ("Thane", "Maharashtra", "India"),
        "bhopal": ("Bhopal", "Madhya Pradesh", "India"),
        "visakhapatnam": ("Visakhapatnam", "Andhra Pradesh", "India"),
        "patna": ("Patna", "Bihar", "India"),
        "ludhiana": ("Ludhiana", "Punjab", "India"),
        "agra": ("Agra", "Uttar Pradesh", "India"),
        "nashik": ("Nashik", "Maharashtra", "India"),
        "faridabad": ("Faridabad", "Haryana", "India"),
        "meerut": ("Meerut", "Uttar Pradesh", "India"),
        "varanasi": ("Varanasi", "Uttar Pradesh", "India"),
        "gurgaon": ("Gurgaon", "Haryana", "India"),
        "gurugram": ("Gurugram", "Haryana", "India"),
        "noida": ("Noida", "Uttar Pradesh", "India"),
        "chandigarh": ("Chandigarh", "Chandigarh", "India"),
        "coimbatore": ("Coimbatore", "Tamil Nadu", "India"),
        "kochi": ("Kochi", "Kerala", "India"),
        "trivandrum": ("Thiruvananthapuram", "Kerala", "India"),

        # --- GLOBAL CITIES ---
        "toronto": ("Toronto", "Ontario", "Canada"),
        "vancouver": ("Vancouver", "British Columbia", "Canada"),
        "montreal": ("Montreal", "Quebec", "Canada"),
        "calgary": ("Calgary", "Alberta", "Canada"),
        "ottawa": ("Ottawa", "Ontario", "Canada"),
        "london": ("London", "Greater London", "United Kingdom"),
        "manchester": ("Manchester", "Greater Manchester", "United Kingdom"),
        "birmingham": ("Birmingham", "West Midlands", "United Kingdom"),
        "edinburgh": ("Edinburgh", "Scotland", "United Kingdom"),
        "new york": ("New York", "New York", "United States"),
        "san francisco": ("San Francisco", "California", "United States"),
        "los angeles": ("Los Angeles", "California", "United States"),
        "chicago": ("Chicago", "Illinois", "United States"),
        "austin": ("Austin", "Texas", "United States"),
        "seattle": ("Seattle", "Washington", "United States"),
        "boston": ("Boston", "Massachusetts", "United States"),
        "sydney": ("Sydney", "NSW", "Australia"),
        "melbourne": ("Melbourne", "Victoria", "Australia"),
        "brisbane": ("Brisbane", "Queensland", "Australia"),
        "berlin": ("Berlin", "Berlin", "Germany"),
        "munich": ("Munich", "Bavaria", "Germany"),
        "paris": ("Paris", "Ile-de-France", "France"),
        "rome": ("Rome", "Lazio", "Italy"),
        "milan": ("Milan", "Lombardy", "Italy"),
        "madrid": ("Madrid", "Madrid", "Spain"),
        "barcelona": ("Barcelona", "Catalonia", "Spain"),
        "amsterdam": ("Amsterdam", "North Holland", "Netherlands"),
        "dubai": ("Dubai", "Dubai", "United Arab Emirates"),
        "abu dhabi": ("Abu Dhabi", "Abu Dhabi", "United Arab Emirates"),
        "singapore": ("Singapore", "Singapore", "Singapore"),
        "tokyo": ("Tokyo", "Kanto", "Japan"),
        "san marino": ("San Marino", "San Marino", "San Marino"),
        "dogana": ("Dogana", "San Marino", "San Marino"),
        "falciano": ("Falciano", "San Marino", "San Marino"),
        # --- NEW ZEALAND CITIES ---
        "auckland": ("Auckland", "Auckland", "New Zealand"),
        "wellington": ("Wellington", "Wellington", "New Zealand"),
        "christchurch": ("Christchurch", "Canterbury", "New Zealand"),
        "hamilton nz": ("Hamilton", "Waikato", "New Zealand"),
        "hamilton new zealand": ("Hamilton", "Waikato", "New Zealand"),
        "queenstown": ("Queenstown", "Otago", "New Zealand"),
        "dunedin": ("Dunedin", "Otago", "New Zealand"),
        "tauranga": ("Tauranga", "Bay of Plenty", "New Zealand")
    }

    INDUSTRIES_MAP = {
        # Education
        "colleges": ("Education", "College"),
        "college": ("Education", "College"),
        "universities": ("Education", "University"),
        "university": ("Education", "University"),
        "schools": ("Education", "School"),
        "school": ("Education", "School"),
        "institute": ("Education", "Educational Institute"),
        "institutes": ("Education", "Educational Institutes"),
        "coaching classes": ("Education", "Coaching Institute"),
        "coaching class": ("Education", "Coaching Institute"),

        # Retail, Shops & Local Businesses
        "clothing shop": ("Retail & Fashion", "Clothing Store"),
        "clothing store": ("Retail & Fashion", "Clothing Store"),
        "clothing": ("Retail & Fashion", "Clothing Store"),
        "clothes shop": ("Retail & Fashion", "Clothing Store"),
        "clothes store": ("Retail & Fashion", "Clothing Store"),
        "clothes": ("Retail & Fashion", "Clothing Store"),
        "garment shop": ("Retail & Fashion", "Garment & Clothing Store"),
        "garments": ("Retail & Fashion", "Garment Store"),
        "apparel shop": ("Retail & Fashion", "Apparel Store"),
        "apparel": ("Retail & Fashion", "Apparel Store"),
        "fashion boutique": ("Retail & Fashion", "Fashion Boutique"),
        "boutique": ("Retail & Fashion", "Boutique"),
        "fashion": ("Retail & Fashion", "Fashion Boutique"),
        "saree shop": ("Retail & Textiles", "Saree & Ethnic Wear Store"),
        "saree": ("Retail & Textiles", "Saree Store"),
        "textile shop": ("Retail & Textiles", "Textile & Fabrics Store"),
        "textile": ("Retail & Textiles", "Textile Store"),
        "grocery shop": ("Retail & Grocery", "Grocery & Provision Store"),
        "grocery store": ("Retail & Grocery", "Grocery Store"),
        "grocery": ("Retail & Grocery", "Grocery Store"),
        "provision store": ("Retail & Grocery", "Provision Store"),
        "provision shop": ("Retail & Grocery", "Provision Store"),
        "kirana shop": ("Retail & Grocery", "Kirana & General Store"),
        "kirana store": ("Retail & Grocery", "Kirana Store"),
        "kirana": ("Retail & Grocery", "Kirana Store"),
        "supermarket": ("Retail & Grocery", "Supermarket"),
        "general store": ("Retail & General", "General Store"),
        "medical store": ("Healthcare & Retail", "Pharmacy & Medical Store"),
        "medical shop": ("Healthcare & Retail", "Medical Store"),
        "pharmacy": ("Healthcare & Retail", "Pharmacy"),
        "chemist": ("Healthcare & Retail", "Chemist & Druggist"),
        "hardware shop": ("Retail & Hardware", "Hardware & Sanitary Store"),
        "hardware store": ("Retail & Hardware", "Hardware Store"),
        "hardware": ("Retail & Hardware", "Hardware Store"),
        "sanitary shop": ("Retail & Hardware", "Sanitaryware Store"),
        "electrical shop": ("Retail & Hardware", "Electrical Goods Store"),
        "electrical store": ("Retail & Hardware", "Electrical Store"),
        "paint shop": ("Retail & Hardware", "Paint & Hardware Store"),
        "jewellery shop": ("Retail & Luxury", "Jewellery Showroom"),
        "jewellery store": ("Retail & Luxury", "Jewellery Store"),
        "jewellery": ("Retail & Luxury", "Jewellery Store"),
        "jewelry shop": ("Retail & Luxury", "Jewelry Store"),
        "jewelry": ("Retail & Luxury", "Jewelry Store"),
        "gold shop": ("Retail & Luxury", "Gold & Jewellery Showroom"),
        "bakery shop": ("Food & Beverage", "Bakery & Cake Shop"),
        "bakery": ("Food & Beverage", "Artisan Bakery"),
        "cake shop": ("Food & Beverage", "Cake & Pastry Shop"),
        "sweet shop": ("Food & Beverage", "Mithai & Sweet Mart"),
        "sweet mart": ("Food & Beverage", "Sweet Mart"),
        "sweets": ("Food & Beverage", "Sweet Mart"),
        "dairy shop": ("Food & Beverage", "Dairy & Milk Products Store"),
        "dairy": ("Food & Beverage", "Dairy Products"),
        "farsan shop": ("Food & Beverage", "Farsan & Namkeen Mart"),
        "farsan": ("Food & Beverage", "Farsan Mart"),
        "electronics shop": ("Technology & Retail", "Electronics Showroom"),
        "electronics store": ("Technology & Retail", "Electronics Store"),
        "electronics": ("Technology & Retail", "Electronics Store"),
        "mobile shop": ("Technology & Retail", "Mobile Phone & Accessories Shop"),
        "mobile store": ("Technology & Retail", "Mobile Store"),
        "laptop shop": ("Technology & Retail", "Computer & Laptop Store"),
        "computer shop": ("Technology & Retail", "Computer Store"),
        "stationery shop": ("Retail & Stationery", "Stationery & Book Store"),
        "stationery store": ("Retail & Stationery", "Stationery Store"),
        "stationery": ("Retail & Stationery", "Stationery Store"),
        "book store": ("Retail & Books", "Book Store"),
        "gift shop": ("Retail & Gifts", "Gift & Novelty Shop"),
        "toy shop": ("Retail & Toys", "Toy Store"),
        "shoe shop": ("Retail & Footwear", "Footwear & Shoe Store"),
        "footwear": ("Retail & Footwear", "Footwear Store"),
        "optician": ("Healthcare & Retail", "Optical & Eye Care Shop"),
        "optical shop": ("Healthcare & Retail", "Optical Shop"),
        "auto garage": ("Automotive", "Auto Repair & Service Center"),
        "automobile": ("Automotive", "Auto Spare Parts & Service"),
        "car accessories": ("Automotive", "Car Accessories Store"),
        "two wheeler": ("Automotive", "Two Wheeler Service & Spares"),
        "salon": ("Beauty & Wellness", "Hair & Beauty Salon"),
        "beauty parlour": ("Beauty & Wellness", "Beauty Parlour"),
        "spa": ("Beauty & Wellness", "Spa & Wellness Center"),
        "restaurant": ("Food & Beverage", "Restaurant"),
        "restaurants": ("Food & Beverage", "Restaurant"),
        "hotel": ("Hospitality & Tourism", "Hotel & Restaurant"),
        "cafe": ("Food & Beverage", "Cafe"),
        "cafes": ("Food & Beverage", "Cafe"),
        "coffee": ("Food & Beverage", "Coffee Shop"),
        "bar": ("Food & Beverage", "Bar & Hospitality"),
        "gym": ("Health & Fitness", "Gym & Fitness Studio"),
        "fitness": ("Health & Fitness", "Fitness Studio"),
        "dental": ("Healthcare", "Dental Clinic"),
        "dentist": ("Healthcare", "Dental Clinic"),
        "clinic": ("Healthcare", "Medical Clinic"),
        "doctor": ("Healthcare", "Medical Practice"),
        "hospital": ("Healthcare", "Hospital & Care Center"),
        "law": ("Legal Services", "Law Firm"),
        "lawyer": ("Legal Services", "Law Practice"),
        "accounting": ("Financial Services", "Accounting Firm"),
        "accountant": ("Financial Services", "Accounting Firm"),
        "finance": ("Financial Services", "Financial Firm"),
        "fintech": ("Financial Services", "Fintech Company"),
        "real estate": ("Real Estate", "Real Estate Agency"),
        "realtor": ("Real Estate", "Real Estate Agency"),
        "property": ("Real Estate", "Property Management"),
        "construction": ("Construction & Real Estate", "Construction Company"),
        "architecture": ("Architecture & Design", "Architectural Firm"),
        "saas": ("Technology & Software", "SaaS Company"),
        "software": ("Technology & Software", "Software Company"),
        "software company": ("Technology & Software", "Software Company"),
        "software companies": ("Technology & Software", "Software Companies"),
        "it company": ("Technology & Software", "IT Services Firm"),
        "it companies": ("Technology & Software", "IT Companies"),
        "tech": ("Technology & Software", "Tech Startup"),
        "startup": ("Technology & Software", "Tech Startup"),
        "graphic design agency": ("Design & Creative", "Graphic Design Agency"),
        "graphic design agencies": ("Design & Creative", "Graphic Design Agencies"),
        "graphic design company": ("Design & Creative", "Graphic Design Company"),
        "graphic design companies": ("Design & Creative", "Graphic Design Companies"),
        "graphic design studio": ("Design & Creative", "Graphic Design Studio"),
        "graphic design studios": ("Design & Creative", "Graphic Design Studios"),
        "graphic design": ("Design & Creative", "Graphic Design Studio"),
        "graphic designer": ("Design & Creative", "Graphic Design Studio"),
        "graphic designers": ("Design & Creative", "Graphic Design Studio"),
        "branding agency": ("Design & Creative", "Branding Agency"),
        "branding agencies": ("Design & Creative", "Branding Agencies"),
        "branding studio": ("Design & Creative", "Branding Studio"),
        "creative agency": ("Design & Creative", "Creative Agency"),
        "creative agencies": ("Design & Creative", "Creative Agencies"),
        "creative studio": ("Design & Creative", "Creative Studio"),
        "design agency": ("Design & Creative", "Design Agency"),
        "design agencies": ("Design & Creative", "Design Agencies"),
        "design studio": ("Design & Creative", "Design Studio"),
        "web design agency": ("Technology & Software", "Web Design Agency"),
        "web design agencies": ("Technology & Software", "Web Design Agencies"),
        "web design company": ("Technology & Software", "Web Design Company"),
        "web design": ("Technology & Software", "Web Design Agency"),
        "marketing agency": ("Marketing & Advertising", "Marketing Agency"),
        "marketing agencies": ("Marketing & Advertising", "Marketing Agencies"),
        "digital marketing agency": ("Marketing & Advertising", "Digital Marketing Agency"),
        "digital marketing agencies": ("Marketing & Advertising", "Digital Marketing Agencies"),
        "advertising agency": ("Marketing & Advertising", "Advertising Agency"),
        "advertising agencies": ("Marketing & Advertising", "Advertising Agencies"),
        "seo agency": ("Marketing & Advertising", "SEO Agency"),
        "seo agencies": ("Marketing & Advertising", "SEO Agencies"),
        "video production": ("Media & Entertainment", "Video Production Studio"),
        "agency": ("Marketing & Advertising", "Digital Agency"),
        "marketing": ("Marketing & Advertising", "Marketing Company"),
        "my shop": ("Retail & Local Commerce", "Retail Shop"),
        "shop": ("Retail & Local Commerce", "Retail Shop"),
        "shops": ("Retail & Local Commerce", "Retail Shop"),
        "store": ("Retail & Local Commerce", "Retail Store"),
        "stores": ("Retail & Local Commerce", "Retail Store"),
        "retail": ("Retail & Local Commerce", "Retail Store")
    }

    SERVICES_MAP = {
        "graphic design": "Graphic Design",
        "graphic designing": "Graphic Design",
        "graphics": "Graphic Design",
        "logo design": "Logo & Brand Identity",
        "branding": "Brand Strategy & Identity",
        "brand design": "Brand Strategy & Identity",
        "ui ux": "UI/UX Design",
        "ui/ux": "UI/UX Design",
        "ui design": "UI Design",
        "ux design": "UX Design",
        "web design": "Web Design",
        "website design": "Web Design",
        "web development": "Web Development",
        "website development": "Web Development",
        "full stack": "Full Stack Development",
        "frontend": "Frontend Development",
        "backend": "Backend Development",
        "mobile app": "Mobile App Development",
        "app development": "Mobile App Development",
        "ios development": "iOS App Development",
        "android development": "Android App Development",
        "seo": "Search Engine Optimization (SEO)",
        "search engine optimization": "Search Engine Optimization (SEO)",
        "digital marketing": "Digital Marketing",
        "social media marketing": "Social Media Marketing",
        "smm": "Social Media Marketing",
        "content marketing": "Content Marketing",
        "copywriting": "Copywriting",
        "content writing": "Content Writing",
        "video editing": "Video Editing & Production",
        "video production": "Video Editing & Production",
        "animation": "Animation & Motion Graphics",
        "motion graphics": "Animation & Motion Graphics",
        "devops": "DevOps & Cloud Infrastructure",
        "cloud computing": "Cloud Computing & Architecture",
        "cloud infrastructure": "Cloud Computing & Architecture",
        "ai": "Artificial Intelligence & ML",
        "machine learning": "Machine Learning",
        "lead generation": "B2B Lead Generation",
        "sales": "Sales & Business Development",
        "crm": "CRM Consulting & Implementation",
        "accounting": "Accounting & Bookkeeping",
        "tax": "Tax Consulting",
        "legal": "Legal Advisory",
        "consulting": "Business Consulting"
    }

    @classmethod
    def _heuristic_extract(cls, query: str, user_preferences: Optional[Dict[str, Any]] = None) -> RequirementPayload:
        q_clean = query.strip()
        q_lower = q_clean.lower()

        # 1. Lead count extraction
        lead_count = 25
        count_match = re.search(r'\b(\d{1,4})\s*(leads|clients|companies|businesses|prospects|shops|stores)?\b', q_lower)
        if count_match and count_match.group(1):
            parsed_count = int(count_match.group(1))
            if 1 <= parsed_count <= 200:
                lead_count = parsed_count

        # 2. Exclusions extraction
        exclusions = []
        if "don't include" in q_lower or "exclude" in q_lower or "without" in q_lower or "no " in q_lower:
            ex_match = re.findall(r'(?:don\'t include|exclude|without|no)\s+([a-zA-Z\s]+?)(?:$|\.|\band\b|\bwith\b|\bfor\b)', q_lower)
            for ex in ex_match:
                cleaned = ex.strip()
                if cleaned:
                    exclusions.append(cleaned)

        # 3. Location extraction (Locality / City / Region / Country)
        country = None
        region = None
        city = None

        # Normalize possessives in query
        q_norm = re.sub(r"['']s\b", "", q_lower)

        # A) Match specific localities & cities first (most granular)
        for loc_key, (c_name, r_name, cntry_name) in sorted(cls.CITIES_LOCALITIES_MAP.items(), key=lambda x: -len(x[0])):
            if re.search(r'\b' + re.escape(loc_key) + r'\b', q_lower) or re.search(r'\b' + re.escape(loc_key) + r'\b', q_norm):
                city = c_name
                region = r_name
                country = cntry_name
                break

        # B) Match regions/states if city wasn't found or to enrich
        for reg_key, (r_name, cntry_name) in sorted(cls.REGIONS_STATES.items(), key=lambda x: -len(x[0])):
            if re.search(r'\b' + re.escape(reg_key) + r'\b', q_lower) or re.search(r'\b' + re.escape(reg_key) + r'\b', q_norm):
                if not region:
                    region = r_name
                if not country:
                    country = cntry_name
                # If no specific city was found, set city to the state/region so it queries within state
                if not city:
                    city = r_name
                break

        # C) Match country from world countries list (exact & plural stripped)
        if not country:
            for country_key in sorted(cls.WORLD_COUNTRIES.keys(), key=lambda x: -len(x)):
                pattern = r'\b' + re.escape(country_key) + r'\b'
                if re.search(pattern, q_lower) or re.search(pattern, q_norm):
                    country = cls.WORLD_COUNTRIES[country_key]
                    break

        # D) Regex phrase pattern matching: "in <X>", "near <X>", "at <X>", "from <X>", "for <X>"
        if not city and not country:
            patterns = [
                r'(?:in|near|at|around|for|from|want|target(?:ing)?|need)\s+([a-zA-Z\s,]+?)\s+(?:country|city|area|location|clients?|leads?|shops?|stores?|businesses?|companies?|startups?)',
                r'\b([a-zA-Z\s]+?)\s+(?:country|city|state|area)\b',
                r'(?:in|near|at|around|from)\s+([a-zA-Z\s,]+?)(?:$|\.|\band\b|\bwith\b|\bfor\b)'
            ]
            for pat in patterns:
                m = re.search(pat, q_lower)
                if m and m.group(1):
                    cand = m.group(1).strip()
                    cand_clean = cand.strip(" ,.")
                    cand_stem = cand_clean.rstrip("s").strip()

                    # Direct test
                    if cand_clean in cls.CITIES_LOCALITIES_MAP:
                        c_name, r_name, cntry_name = cls.CITIES_LOCALITIES_MAP[cand_clean]
                        city = c_name
                        region = r_name
                        country = cntry_name
                        break
                    elif cand_stem in cls.CITIES_LOCALITIES_MAP:
                        c_name, r_name, cntry_name = cls.CITIES_LOCALITIES_MAP[cand_stem]
                        city = c_name
                        region = r_name
                        country = cntry_name
                        break
                    elif cand_clean in cls.REGIONS_STATES:
                        r_name, cntry_name = cls.REGIONS_STATES[cand_clean]
                        city = r_name
                        region = r_name
                        country = cntry_name
                        break
                    elif cand_stem in cls.REGIONS_STATES:
                        r_name, cntry_name = cls.REGIONS_STATES[cand_stem]
                        city = r_name
                        region = r_name
                        country = cntry_name
                        break
                    elif cand_clean in cls.WORLD_COUNTRIES:
                        country = cls.WORLD_COUNTRIES[cand_clean]
                        break
                    elif cand_stem in cls.WORLD_COUNTRIES:
                        country = cls.WORLD_COUNTRIES[cand_stem]
                        break

                    # Fuzzy match with rapidfuzz on candidate
                    try:
                        from rapidfuzz import process, fuzz
                        f_match = process.extractOne(cand_clean, cls.WORLD_COUNTRIES.keys(), scorer=fuzz.ratio)
                        if f_match and f_match[1] >= 82:
                            country = cls.WORLD_COUNTRIES[f_match[0]]
                            break
                        
                        f_city = process.extractOne(cand_clean, cls.CITIES_LOCALITIES_MAP.keys(), scorer=fuzz.ratio)
                        if f_city and f_city[1] >= 85:
                            c_name, r_name, cntry_name = cls.CITIES_LOCALITIES_MAP[f_city[0]]
                            city = c_name
                            region = r_name
                            country = cntry_name
                            break
                    except Exception:
                        pass

        # E) Global Fuzzy search for any country mention in full query
        if not country:
            try:
                from rapidfuzz import process, fuzz
                tokens = [w.strip() for w in re.findall(r'\b[a-zA-Z]{3,}\b', q_lower)]
                for token in tokens:
                    f_match = process.extractOne(token, cls.WORLD_COUNTRIES.keys(), scorer=fuzz.ratio)
                    if f_match and f_match[1] >= 85:
                        country = cls.WORLD_COUNTRIES[f_match[0]]
                        break
            except Exception:
                pass

        # If user explicitly asked for leads without specifying a country, check user preference
        if not country:
            if user_preferences and user_preferences.get("target_country"):
                country = user_preferences["target_country"]
            else:
                country = "India" if (region == "Gujarat" or (city and "Ahmedabad" in city)) else "United States"

        # 4. Extract explicit need/service vs target business
        service = None
        
        # Check if user explicitly specified what service they offer (e.g. "that need graphic design", "could need graphic design", "for web design", "offering SEO")
        need_match = re.search(r'(?:that need|who need|which need|could need|that could need|which could need|in need of|requiring|looking for|needs|need|offering|to pitch|for)\s+([a-zA-Z\s&/]+?)(?:$|\.|\bin\b|\bat\b|\bfrom\b|\bnear\b|\bwith\b)', q_lower)
        if need_match and need_match.group(1):
            service_candidate = need_match.group(1).strip()
            for s_key in sorted(cls.SERVICES_MAP.keys(), key=lambda x: -len(x)):
                if s_key in service_candidate:
                    service = cls.SERVICES_MAP[s_key]
                    break

        # 5. Industry & Business Type extraction
        industry = None
        business_type = None

        # Preserve printing intent, including the common "zerox" spelling.
        if re.search(r"\b(?:xerox|zerox|photocopy|copy\s*shop|printing?|print\s*shop)\b", q_lower):
            industry = "Retail & Local Commerce"
            business_type = "Xerox & Printing Shop"

        # Preserve explicit manufacturer/dealer intent instead of collapsing it
        # into the generic commercial-business fallback.
        if not industry:
            manufacturer_match = re.search(
                r"\b(nissan|toyota|hyundai|honda|ford|kia|mahindra|maruti(?:\s+suzuki)?|"
                r"volkswagen|mg|skoda|renault|bmw|audi|mercedes(?:[- ]benz)?|tata)\b",
                q_lower,
            )
            if manufacturer_match and re.search(r"\b(?:dealer|dealership|showroom|motors?)\b", q_lower):
                manufacturer = manufacturer_match.group(1).title()
                industry = "Automotive"
                business_type = f"{manufacturer} Dealer"

        # Search for explicit industry keywords
        for keyword in sorted(cls.INDUSTRIES_MAP.keys(), key=lambda x: -len(x)):
            if industry:
                break
            # If this keyword is in the query
            if re.search(r'\b' + re.escape(keyword) + r'\b', q_lower):
                # If we already matched this exact term as the offered service (e.g. "that need graphic design"), don't make it the target industry
                if need_match and keyword in need_match.group(0):
                    continue
                ind, btype = cls.INDUSTRIES_MAP[keyword]
                industry = ind
                business_type = btype
                break

        # If no industry matched yet, but a service was mentioned without "need/for" (e.g. "Find graphic design agencies")
        if not industry:
            for s_key in sorted(cls.SERVICES_MAP.keys(), key=lambda x: -len(x)):
                if re.search(r'\b' + re.escape(s_key) + r'\b', q_lower):
                    # User is searching FOR these providers!
                    if any(w in s_key for w in ["graphic", "brand", "logo", "creative", "ui", "ux"]):
                        industry = "Design & Creative"
                        business_type = f"{cls.SERVICES_MAP[s_key]} Studio"
                    elif any(w in s_key for w in ["web", "software", "app", "devops", "cloud", "ai", "machine learning"]):
                        industry = "Technology & Software"
                        business_type = f"{cls.SERVICES_MAP[s_key]} Company"
                    elif any(w in s_key for w in ["marketing", "seo", "advertising", "social", "copywriting"]):
                        industry = "Marketing & Advertising"
                        business_type = f"{cls.SERVICES_MAP[s_key]} Agency"
                    elif any(w in s_key for w in ["video", "animation"]):
                        industry = "Media & Entertainment"
                        business_type = f"{cls.SERVICES_MAP[s_key]} Production"
                    break

        # Default fallbacks if still unresolved
        if not industry:
            if "restaurant" in q_lower or "food" in q_lower or "dining" in q_lower or "cafe" in q_lower:
                industry = "Food & Beverage"
                business_type = "Restaurant"
            elif "shop" in q_lower or "store" in q_lower or "retail" in q_lower:
                industry = "Retail & Local Commerce"
                business_type = "Retail Store"
            elif "agency" in q_lower or "agencies" in q_lower:
                industry = "Marketing & Advertising"
                business_type = "Digital Agency"
            elif "clinic" in q_lower or "doctor" in q_lower or "dental" in q_lower:
                industry = "Healthcare"
                business_type = "Medical Clinic"
            else:
                industry = "Commercial Business"
                business_type = "Commercial Businesses"

        if not service:
            service = "Commercial Growth & Digital Presence"

        must_have_email = "with email" in q_lower or "has email" in q_lower
        must_have_phone = (
            "with phone" in q_lower
            or "has phone" in q_lower
            or "with number" in q_lower
            or "phone number" in q_lower
            or "phone numbers" in q_lower
        )
        must_have_website = (
            "with website" in q_lower
            or "has website" in q_lower
            or "official website" in q_lower
            or "official websites" in q_lower
        )
        new_leads_only = "new" in q_lower or "haven't seen" in q_lower or "haven't found" in q_lower or "not seen" in q_lower or "exclude previous" in q_lower

        return RequirementPayload(
            country=country,
            city=city,
            region=region,
            industry=industry,
            business_type=business_type or "Commercial Business",
            service=service,
            company_size=None,
            lead_count=lead_count,
            exclusions=exclusions,
            must_have_email=must_have_email,
            must_have_phone=must_have_phone,
            must_have_website=must_have_website,
            new_leads_only=new_leads_only
        )
