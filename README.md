# 🌟 LeadMind AI — Autonomous Multi-Agent B2B Sales Platform

> **Autonomous Multi-Agent B2B Lead Intelligence, Scoring, Pitch Generation & Conversational Voice Sales Closing Platform.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-8E75B2.svg?style=flat&logo=Google&logoColor=white)](https://ai.google.dev/)
[![Twilio](https://img.shields.io/badge/Twilio-Voice_API-F22F46.svg?style=flat&logo=Twilio&logoColor=white)](https://www.twilio.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Overview

**LeadMind AI** transforms manual B2B prospecting into an autonomous, intelligence-driven workflow. Instead of searching business directories, cross-referencing contact info, and cold calling manually, you provide a single natural language instruction:

> *"Find 10 UK restaurants that could need graphic design"* or *"Find software agencies in New Zealand"*

A coordinated swarm of **10 specialized AI agents** discovers real live commercial entities, cleans business identities, scores match probability, writes hyper-personalized sales angles, and autonomously initiates **conversational AI voice calls** with live objection handling and warm transfer capabilities.

---

## 🏗️ Architecture & Workflow

```text
 1. Natural Language Prompt
         │
         ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Multi-Agent Orchestrator                  │
 │          (LangGraph + Real-Time SSE Streaming)          │
 └───────────────────────────┬─────────────────────────────┘
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
[Intelligence Agents]                        [Closing & Sales Agents]
 1. Requirement Understanding Agent           6. Memory Agent (Semantic History)
 2. Live Research Agent (Google/Tavily/OSM)   7. Pitch Agent (Gemini 1.5 Flash)
 3. Deduplication & Normalization Agent       8. Conversational Voice Calling Agent
 4. Qualification & Strict Geo Agent          9. Email Dispatcher Sequence Agent
 5. ICP Lead Scoring Agent (0–100 Score)     10. CRM Pipeline Progression Agent
                             │
                             ▼
 ┌─────────────────────────────────────────────────────────┐
 │                  Verified B2B Leads                     │
 │      • Contact Details (Phone / Address / Rating)       │
 │      • Custom Value Proposition & Cold Pitch            │
 │      • Real-Time Interactive Two-Way Voice Call         │
 │      • CRM Pipeline Board & CSV/JSON Export             │
 └─────────────────────────────────────────────────────────┘
```

---

## 🤖 The 10 Specialized AI Agents

| # | Agent Name | Primary Responsibility |
|---|---|---|
| **1** | **Requirement Agent** | Understands freeform queries; disambiguates target industry from offered service. |
| **2** | **Research Agent** | Queries live Google Places API, Tavily AI Search, OpenStreetMap, and Apollo. |
| **3** | **Deduplication Agent** | Strips unicode glitches/taglines and merges duplicate records into master profiles. |
| **4** | **Qualification Agent** | Enforces strict geographic, postal code, and country domain constraints. |
| **5** | **Scoring Agent** | Evaluates Ideal Customer Profile (ICP) fit using a multi-factor 0–100 algorithm. |
| **6** | **Memory Agent** | Maintains historical search context; prevents contacting previously engaged leads. |
| **7** | **Pitch Agent** | Synthesizes custom pain points, cold email templates, and call opening hooks. |
| **8** | **Voice Calling Agent** | Conducts two-way voice conversations with objection handling and warm transfers. |
| **9** | **Email Dispatcher** | Automates multi-touch email sequences and approval workflows. |
| **10**| **CRM Agent** | Tracks leads through pipeline stages (New → Contacted → Deal Discussed → Won). |

---

## 🚀 Key Features

- **Ground-Truth Real Data:** Zero mock data; queries live verified businesses with real physical addresses, Google ratings, websites, and phone numbers.
- **Two-Way Conversational Voice Calling:** Integrated with Twilio Voice API and in-browser Web Speech API for interactive audio calling with speech sanitization and natural pacing.
- **Real-Time Streaming Feedback:** Server-Sent Events (SSE) broadcast agent thoughts and pipeline progress (`15%` → `100%`) live to the UI.
- **Long-Term Memory:** Persistent SQLite storage with intelligent recall preventing duplicate outreach across search runs.
- **Luxury Neutral Interface:** Built with a custom design system featuring warm neutrals (`#F7F6F2`, `#171717`, `#3157FF`), interactive waveforms, and draggable CRM Kanban boards.

---

## 💻 Tech Stack

- **Backend:**
  - Python 3.12 (Asynchronous)
  - FastAPI
  - SQLAlchemy AsyncEngine + SQLite (`aiosqlite`)
  - Google Generative AI (Gemini 1.5 Flash)
  - Twilio REST SDK
  - LangSmith Observability Tracing

- **Frontend:**
  - React 19 + TypeScript
  - Vite
  - Tailwind CSS
  - Lucide React
  - Web Audio API + Web Speech Recognition / Synthesis

---

## ⚡ Quick Start Guide

### Prerequisites
- Python 3.11+ or 3.12+
- Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/Vivekpatel1001/Leadmind-ai.git
cd Leadmind-ai
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root folder and configure your keys:
```bash
cp .env.example .env
```

Key settings in `.env`:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_key
TAVILY_API_KEY=your_tavily_key
GEMINI_API_KEY=your_gemini_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
DATABASE_URL=sqlite+aiosqlite:///./leadgen.db
```

### 3. Start Backend Server
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run FastAPI backend with hot-reload
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### 4. Start Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔒 Security & Best Practices

- All API keys and secrets are strictly loaded through environment variables and ignored by `.gitignore`.
- Production runs should utilize an external PostgreSQL instance by simply modifying `DATABASE_URL` in `.env`.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
