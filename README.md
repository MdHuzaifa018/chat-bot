# 🤖 AI-Powered Client Support Chatbot

An enterprise-ready, AI-powered customer support chatbot built with **Next.js**, **Node.js Express (TypeScript)**, **Supabase PostgreSQL (RLS)**, and **Dify AI Workflow (Google Gemini)**.

---

## 📖 Complete Documentation & Setup Guides

- 👉 **[FULL_SETUP_AND_TESTING_GUIDE.md](FULL_SETUP_AND_TESTING_GUIDE.md)**: **Scratch se End tak full setup guide** (Kahan se Supabase/Dify keys lein, `.env.local` kaise banayein, SQL migration kaise run karein, aur frontend-backend kaise test karein).
- 👉 **[GIT_TEAM_WORKFLOW_GUIDE.md](GIT_TEAM_WORKFLOW_GUIDE.md)**: Team Git collaboration guide (Branching, PRs, aur conflict-free workflow).
- 👉 **[docs/](docs/)**: Official Architecture, PRD, TRD, Web Flow, and Database Schema specifications.

---

## 📁 Repository Structure

```text
chat-bot/
├── frontend/                  # 🎨 Next.js + React + Tailwind CSS Frontend
│   ├── src/components/        # ChatbotWidget, ChatWindow, MessageList
│   ├── src/api/chatbotApi.js  # API client communicating with backend
│   └── package.json           # Next.js dependencies
│
├── backend/                   # ⚙️ Node.js + Express.js REST API (TypeScript)
│   ├── src/                   # Controllers, Services, Middlewares, Routes
│   ├── supabase/migrations/   # PostgreSQL Schema, RLS Policies, Rate Limiting RPC
│   ├── .env.example           # Environment variables template
│   └── package.json           # Express dependencies
│
├── docs/                      # 📚 Official Architecture & Planning Docs
│   ├── 01-PRD.md              # Product Requirements Document
│   ├── 02-TRD.md              # Technical Requirements Document
│   ├── 03-WEB-FLOW.md         # User Navigation & State Logic
│   ├── 04-UI-UX-DESIGN.md     # Design Tokens & Guidelines
│   ├── 05-BACKEND-SCHEMA.md   # Database Schema & Security
│   └── 06-IMPLEMENTATION.md   # Step-by-Step Delivery Plan
│
├── FULL_SETUP_AND_TESTING_GUIDE.md # 📘 Step-by-Step Scratch to Live Testing Guide
├── GIT_TEAM_WORKFLOW_GUIDE.md      # 🤝 Team Git & GitHub Collaboration Guide
└── README.md                       # This overview file
```

---

## 🚀 Quick Start (Local Development)

### 1. Run Backend Server (Port 5000)
```bash
cd backend
npm install
npm run dev
```

### 2. Run Frontend Website (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Checklist
- [x] Backend Health: `GET http://localhost:5000/api/health`
- [x] Session & Lead Capture: `POST http://localhost:5000/api/session/start`
- [x] AI Message Response: `POST http://localhost:5000/api/chat/message`
- [x] Conversation History: `GET http://localhost:5000/api/chat/history`
- [x] Token Bucket Rate Limiting (20 req / 60s)
- [x] Frontend Chat Widget UI & Lead Capture Flow
