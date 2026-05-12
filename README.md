<div align="center">

```
██████╗ ██╗   ██╗███╗   ██╗██████╗ ██╗     ███████╗██╗  ██╗██╗████████╗██╗   ██╗
██╔══██╗██║   ██║████╗  ██║██╔══██╗██║     ██╔════╝╚██╗██╔╝██║╚══██╔══╝╚██╗ ██╔╝
██████╔╝██║   ██║██╔██╗ ██║██████╔╝██║     █████╗   ╚███╔╝ ██║   ██║    ╚████╔╝ 
██╔══██╗██║   ██║██║╚██╗██║██╔═══╝ ██║     ██╔══╝   ██╔██╗ ██║   ██║     ╚██╔╝  
██████╔╝╚██████╔╝██║ ╚████║██║     ███████╗███████╗██╔╝ ██╗██║   ██║      ██║   
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝  
```

### An open-source Perplexity clone — powered by NVIDIA NIM, Bun & Next.js

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Bun](https://img.shields.io/badge/Bun-1.x-fbf0df?style=flat-square&logo=bun)
![Express](https://img.shields.io/badge/Express-5-grey?style=flat-square&logo=express)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)

</div>

---

## ✨ Features

- 🔍 **Real-time web search** via Tavily (10 results, advanced depth) on every query
- ⚡ **Streaming AI responses** using Server-Sent Events with NVIDIA NIM MiniMax-M2.7
- 💬 **Persistent conversations** — full message history stored in PostgreSQL
- 🔗 **Clickable sources panel** with titles pulled from Tavily web results
- 🤖 **Auto-generated follow-up questions** suggested after every answer
- 🧠 **Semantic search caching** via Pinecone (skips LLM call on ≥0.88 similarity)
- 🗄️ **Redis response caching** on conversations & messages (1-hour TTL)
- 🔐 **GitHub & Google OAuth** — zero-password sign-in via Supabase Auth
- 🚦 **Per-user rate limiting** — 20 requests per minute on the chat endpoint
- 🐳 **Docker Compose ready** — spins up backend + Redis with a single command

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│   Browser  (Next.js :3000)  │
│  React 19 · Tailwind CSS 4  │
│  Framer Motion · SSE reader │
└──────────┬──────────────────┘
           │  POST /chat  (Bearer JWT)
           │  GET  /user/*
           ▼
┌─────────────────────────────┐
│   Express API  (Bun :3001)  │
│                             │
│  authMiddleware      ───────│──► Supabase Auth
│  chatRateLimit              │
│        │                   │
│        ▼                   │
│  Tavily Web Search   ───────│──► 10 live results
│        │                   │
│  Pinecone Vector DB  ───────│──► semantic cache lookup
│        │                   │
│  NVIDIA NIM          ───────│──► MiniMax-M2.7 (stream)
│        │                   │
│  SSE stream ───────────────►│── text deltas → browser
│        │                   │
│  PostgreSQL (Drizzle) ──────│──► persist messages
│  Redis cache         ───────│──► cache conversations
└─────────────────────────────┘
```

The frontend consumes the SSE stream with a `ReadableStream` reader, progressively rendering text deltas, sources, and follow-up questions as named SSE events arrive.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion 12 |
| **Backend** | Bun runtime, Express 5, TypeScript |
| **Database** | PostgreSQL via Supabase + Drizzle ORM |
| **Cache** | Redis 7 (Alpine) |
| **Auth** | Supabase Auth — GitHub & Google OAuth |
| **LLM** | NVIDIA NIM → MiniMax-M2.7 |
| **Embeddings** | OpenAI `text-embedding-3-small` |
| **Web Search** | Tavily API (advanced, 10 results) |
| **Vector DB** | Pinecone (`chatembeddingsindex`) |
| **Validation** | Zod 4 |
| **Containerisation** | Docker + Docker Compose |

---

## 📁 Project Structure

```
Bunplexity/
├── backend/                    # Bun + Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle ORM — users, conversations, messages
│   │   │   └── index.ts        # DB connection
│   │   ├── lib/
│   │   │   ├── cache.ts        # Redis get-or-set helper
│   │   │   ├── client.ts       # Supabase admin client
│   │   │   ├── openai.ts       # NVIDIA NIM (OpenAI-compatible endpoint)
│   │   │   ├── pinecone.ts     # Semantic search cache
│   │   │   └── tavily.ts       # Web search client
│   │   ├── routes/
│   │   │   ├── chat.route.ts   # POST /chat — streaming SSE endpoint
│   │   │   └── user.route.ts   # /user/me, /conversations, /messages
│   │   ├── middleware.ts        # JWT auth + in-memory rate limiter
│   │   ├── prompt.ts           # System prompt + response format template
│   │   └── index.ts            # Express app setup, CORS, health routes
│   ├── .env.example
│   ├── DOCKERFILE
│   └── docker_compose.yml      # backend + Redis services
│
└── frontend/                   # Next.js 16 App Router
    └── src/
        ├── app/
        │   ├── page.tsx            # Home / search landing
        │   ├── login/              # GitHub + Google OAuth
        │   └── chat/[id]/          # Streaming chat interface
        ├── components/
        │   ├── ConversationSidebar.tsx
        │   ├── MessageBubble.tsx   # Markdown parser + follow-ups
        │   ├── SourcesPanel.tsx
        │   └── ChatBar.tsx
        └── lib/
            ├── api.ts              # fetch wrapper + SSE stream consumer
            └── supabase.ts         # Supabase browser client
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Docker](https://docker.com) & Docker Compose (for Redis)
- API keys & accounts for: [Supabase](https://supabase.com) · [NVIDIA NIM](https://build.nvidia.com) · [Tavily](https://tavily.com) · [Pinecone](https://pinecone.io) · [OpenAI](https://platform.openai.com)

---

### Option A — Docker (backend + Redis, recommended)

```bash
git clone https://github.com/your-username/bunplexity.git
cd bunplexity/backend

cp .env.example .env
# Fill in all API keys in .env

docker compose up -d
# Backend → http://localhost:3001
# Redis   → localhost:6379
```

Then start the frontend:

```bash
cd ../frontend
bun install
bun run dev
# Frontend → http://localhost:3000
```

---

### Option B — Fully local (no Docker)

```bash
# ── Terminal 1: Backend ──────────────────────────
cd backend
cp .env.example .env      # fill in all keys
bun install
bun run dev               # http://localhost:3001

# ── Terminal 2: Frontend ─────────────────────────
cd frontend
bun install
bun run dev               # http://localhost:3000
```

> **Note:** The backend starts without Redis but caching is silently skipped. For full functionality: `docker run -d -p 6379:6379 redis:7-alpine`

---

## ⚙️ Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PORT` | — | Server port (default: `3001`) |
| `FRONTEND_URL` | ✅ | CORS origin — your frontend URL |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase → Settings → Database) |
| `REDIS_URL` | ✅ | Redis connection (default: `redis://localhost:6379`) |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_API_KEY_SECRET` | ✅ | Supabase **service role** key — keep this secret |
| `NVIDIA_API_KEY` | ✅ | NVIDIA NIM key for MiniMax-M2.7 inference |
| `OPENAI_API_KEY` | ✅ | OpenAI key — used for `text-embedding-3-small` only |
| `TAVILY_API_KEY` | ✅ | Tavily web search API key |
| `PINECONE_API_KEY` | ✅ | Pinecone API key |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App client secret |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 client secret |

### `frontend/.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** (public) key |
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:3001`) |

---

## 📡 API Reference

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/health` | — | Service health check |
| `GET` | `/ready` | — | DB readiness probe |
| `POST` | `/chat` | ✅ | Stream AI response — **rate limited 20 req/min** |
| `GET` | `/user/me` | ✅ | Authenticated user profile |
| `GET` | `/user/conversations` | ✅ | List all conversations (Redis cached) |
| `GET` | `/user/conversations/:id` | ✅ | Conversation + messages (Redis cached) |
| `GET` | `/user/conversations/:id/messages` | ✅ | Messages only (Redis cached) |

All protected routes require `Authorization: Bearer <supabase_access_token>`.

#### SSE Stream Events — `POST /chat`

```
event: conversation   →  { "conversationId": "uuid" }
<raw text delta>      →  streaming answer characters
event: sources        →  [{ "url": "...", "title": "..." }, ...]
event: done           →  {}
event: error          →  { "error": "Stream failed" }
```

---

## 🔄 How It Works

1. **User submits a query** → frontend POSTs `{ query, conversationId }` with a Supabase Bearer token
2. **Auth & rate limit** → backend validates the JWT via Supabase, enforces 20 req/min per user
3. **Web search** → query sent to **Tavily** — returns 10 live web results
4. **Semantic cache check** → query embedding compared against **Pinecone**; a hit at ≥0.88 cosine similarity short-circuits the LLM call entirely
5. **LLM inference** → search results + query injected into a structured prompt, streamed through **NVIDIA NIM** (MiniMax-M2.7)
6. **SSE to browser** → answer chunks, sources, and follow-up questions arrive as named events; frontend renders progressively
7. **Persistence** → complete assistant message written to **PostgreSQL**; conversation lists refreshed in **Redis**

---

## 🚢 Deployment

### Backend — Render / Railway

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `bun run build` |
| Start command | `bun run start` |
| Environment vars | Copy all from `backend/.env.example` |

Set `FRONTEND_URL` to your Vercel production domain. Provision a Redis instance (Render Redis or Upstash) and update `REDIS_URL`.

### Frontend — Vercel

| Setting | Value |
|---------|-------|
| Root directory | `frontend` |
| Framework preset | Next.js |
| `NEXT_PUBLIC_API_URL` | Your Render / Railway backend URL |

---

## 🗄️ Database Schema

```
users                  conversations            messages
──────────────         ─────────────────        ──────────────────
id          (PK) ◄──┐  id          (PK) ◄──┐   id             (PK)
email              │  userId  (FK) ─────┘  │   conversationId (FK) ─┘
provider           └► title                └── content
name                  createdAt                  role  (user | assistant)
credits (1000)                                   createdAt
createdAt
```

Managed with **Drizzle ORM**. To sync schema to Supabase:

```bash
cd backend
bunx drizzle-kit push
```

---

## 📄 License

MIT © [Soubhik Halder](https://github.com/soubhikhalder)

---

<div align="center">
  <sub>Built with ☕ and too many API keys</sub>
</div>
