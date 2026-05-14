<div align="center">

```
██████╗ ██╗   ██╗███╗   ██╗██████╗ ██╗     ███████╗██╗  ██╗██╗████████╗██╗   ██╗
██╔══██╗██║   ██║████╗  ██║██╔══██╗██║     ██╔════╝╚██╗██╔╝██║╚══██╔══╝╚██╗ ██╔╝
██████╔╝██║   ██║██╔██╗ ██║██████╔╝██║     █████╗   ╚███╔╝ ██║   ██║    ╚████╔╝ 
██╔══██╗██║   ██║██║╚██╗██║██╔═══╝ ██║     ██╔══╝   ██╔██╗ ██║   ██║     ╚██╔╝  
██████╔╝╚██████╔╝██║ ╚████║██║     ███████╗███████╗██╔╝ ██╗██║   ██║      ██║   
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝  
```

### An open-source Perplexity clone — powered by OpenAI, Bun & Next.js

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Bun](https://img.shields.io/badge/Bun-1.x-fbf0df?style=flat-square&logo=bun)
![Express](https://img.shields.io/badge/Express-5-grey?style=flat-square&logo=express)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--5-412991?style=flat-square&logo=openai)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)

</div>

---

## ✨ Features

- 🔍 **Real-time web search** via Tavily on every query (basic or advanced depth, configurable by mode)
- ⚡ **Streaming AI responses** using Server-Sent Events — answer chunks rendered progressively
- 🧠 **Model selection** — choose from 9 OpenAI models across GPT-5.5, GPT-5.4, and GPT-5 families
- 🔀 **Fast / Thinking modes** — Fast uses basic search + medium reasoning effort; Thinking uses advanced search + high reasoning effort
- 💬 **Persistent conversations** — full message history stored in PostgreSQL via Drizzle ORM
- 🔗 **Clickable sources panel** — web result titles and URLs surfaced alongside each answer
- 🤖 **Auto-generated follow-up questions** suggested after every answer
- 📚 **History tab** in sidebar — searchable/filterable conversation list with relative timestamps
- 🚀 **Agent Mode tab** — Coming soon interface with animated "Coming Soon" badge
- 🎨 **Microinteractions** — spring-animated mode toggle, model dropdown, staggered list animations via Framer Motion
- 🗃️ **Semantic search caching** via Pinecone (skips LLM call on ≥0.88 cosine similarity)
- 🗄️ **Redis response caching** on conversations & messages (1-hour TTL)
- 🔐 **GitHub & Google OAuth** — zero-password sign-in via Supabase Auth
- 🚦 **Per-user rate limiting** — 20 requests per minute on the chat endpoint

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│    Browser  (Next.js :3000)     │
│  React 19 · Tailwind CSS 4      │
│  Framer Motion · SSE reader     │
│  Model selector · Mode toggle   │
└──────────┬──────────────────────┘
           │  POST /chat  { query, conversationId, mode, model }
           │  GET  /user/*         (Bearer JWT)
           ▼
┌─────────────────────────────────┐
│    Express API  (Bun :3001)     │
│                                 │
│  authMiddleware      ───────────│──► Supabase Auth (JWT verify)
│  chatRateLimit (20/min)         │
│         │                       │
│         ▼                       │
│  Tavily Web Search   ───────────│──► live results (basic / advanced)
│         │                       │
│  Pinecone Vector DB  ───────────│──► semantic cache lookup (≥0.88)
│         │                       │
│  OpenAI Responses API ──────────│──► selected model, configurable effort
│         │                       │
│  SSE stream ───────────────────►│── text deltas → browser
│         │                       │
│  PostgreSQL (Drizzle) ──────────│──► persist messages & conversations
│  Redis cache         ───────────│──► cache conversation & message lists
└─────────────────────────────────┘
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
| **LLM** | OpenAI Responses API (GPT-5.5, GPT-5.4, GPT-5 family — 9 models) |
| **Embeddings** | OpenAI `text-embedding-3-small` |
| **Web Search** | Tavily API |
| **Vector DB** | Pinecone (`chatembeddingsindex`) |
| **Validation** | Zod 4 |

---

## 🤖 Available Models

| Group | Model ID | Description |
|-------|----------|-------------|
| **GPT-5.5** | `gpt-5.5` | New class of intelligence |
| | `gpt-5.5-pro` | Smarter & more precise |
| **GPT-5.4** | `gpt-5.4` | Affordable coding & professional work |
| | `gpt-5.4-pro` | Smarter GPT-5.4-class responses |
| | `gpt-5.4-mini` | Strongest mini for coding & agents |
| | `gpt-5.4-nano` | Cheapest GPT-5.4-class model |
| **GPT-5** | `gpt-5` | Intelligent reasoning, configurable effort |
| | `gpt-5-mini` *(default)* | Cost-sensitive, low latency |
| | `gpt-5-nano` | Fastest, most cost-efficient |

**Fast mode** → basic search depth, 10 results, medium reasoning effort  
**Thinking mode** → advanced search depth, 20 results, high reasoning effort

---

## 📁 Project Structure

```
Bunplexity/
├── backend/                        # Bun + Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle ORM — users, conversations, messages
│   │   │   └── index.ts            # DB connection
│   │   ├── lib/
│   │   │   ├── cache.ts            # Redis get-or-set helper
│   │   │   ├── client.ts           # Supabase admin client
│   │   │   ├── openai.ts           # OpenAI client (LLM + embeddings)
│   │   │   ├── pinecone.ts         # Semantic search cache
│   │   │   └── tavily.ts           # Web search client
│   │   ├── routes/
│   │   │   ├── chat.route.ts       # POST /chat + POST /chat/follow-up
│   │   │   └── user.route.ts       # /user/me, /conversations, /messages
│   │   ├── middleware.ts            # JWT auth + in-memory rate limiter
│   │   ├── prompt.ts               # System prompt + response format template
│   │   └── index.ts                # Express app setup, CORS, health routes
│   └── .env.example
│
└── frontend/                       # Next.js 16 App Router
    └── src/
        ├── app/
        │   ├── page.tsx                # Home / search landing
        │   ├── login/                  # GitHub + Google OAuth
        │   └── chat/[conversationId]/  # Streaming chat interface
        ├── components/
        │   ├── ConversationSidebar.tsx # History tab + Agent Mode tab
        │   ├── ChatBar.tsx             # Input + mode toggle + model selector
        │   ├── MessageList.tsx         # Message thread + follow-up questions
        │   ├── MessageBubble.tsx       # Markdown parser
        │   └── SourcesPanel.tsx        # Web result cards
        ├── lib/
        │   ├── api.ts                  # fetch wrapper + SSE stream consumer
        │   └── supabase.ts             # Supabase browser client
        └── types/
            └── index.ts                # Shared types incl. ChatOptions, ChatModel
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Docker](https://docker.com) (for Redis)
- API keys for: [Supabase](https://supabase.com) · [OpenAI](https://platform.openai.com) · [Tavily](https://tavily.com) · [Pinecone](https://pinecone.io)

---

### Setup

```bash
git clone https://github.com/your-username/bunplexity.git
```

**1. Start Redis**

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**2. Backend**

```bash
cd backend
cp .env.example .env   # fill in all API keys
bun install
bun run dev            # http://localhost:3001
```

**3. Frontend**

```bash
cd frontend
bun install
bun run dev            # http://localhost:3000
```

> **Without Redis:** The backend starts fine but caching is silently skipped. All features still work — just without the 1-hour response cache.

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
| `OPENAI_API_KEY` | ✅ | OpenAI key — used for LLM inference (all chat models) and `text-embedding-3-small` |
| `TAVILY_API_KEY` | ✅ | Tavily web search API key |
| `PINECONE_API_KEY` | ✅ | Pinecone API key |

> GitHub and Google OAuth credentials are configured directly in the Supabase dashboard (Auth → Providers) — no backend env vars needed.

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
| `POST` | `/chat` | ✅ | Start a new chat — streams SSE response, **rate limited 20 req/min** |
| `POST` | `/chat/follow-up` | ✅ | Follow-up query in an existing conversation — same SSE format |
| `GET` | `/user/me` | ✅ | Authenticated user profile |
| `GET` | `/user/conversations` | ✅ | List all conversations (Redis cached) |
| `GET` | `/user/conversations/:id` | ✅ | Conversation + messages (Redis cached) |
| `GET` | `/user/conversations/:id/messages` | ✅ | Messages only (Redis cached) |

All protected routes require `Authorization: Bearer <supabase_access_token>`.

#### Request Body — `POST /chat` and `POST /chat/follow-up`

```json
{
  "query": "What is the latest in quantum computing?",
  "conversationId": "uuid-v4",
  "mode": "fast",
  "model": "gpt-5-mini"
}
```

| Field | Type | Values |
|-------|------|--------|
| `mode` | `"fast" \| "thinking"` | `fast` → basic search, medium effort · `thinking` → advanced search, high effort |
| `model` | `string` | Any model ID from the [Available Models](#-available-models) table |

#### SSE Stream Events

```
event: conversation   →  { "conversationId": "uuid" }
<raw text delta>      →  streaming answer characters
event: sources        →  [{ "url": "...", "title": "..." }, ...]
event: done           →  {}
event: error          →  { "error": "Stream failed" }
```

---

## 🔄 How It Works

1. **User submits a query** with a selected model and mode → frontend POSTs `{ query, conversationId, mode, model }` with a Supabase Bearer token
2. **Auth & rate limit** → backend validates the JWT via Supabase, enforces 20 req/min per user
3. **Embedding** → query is embedded via `text-embedding-3-small` in parallel with conversation setup
4. **Semantic cache check** → embedding compared against **Pinecone**; a hit at ≥0.88 cosine similarity returns cached web results, skipping Tavily
5. **Web search** → if no cache hit, query sent to **Tavily** (10 results in Fast, 20 in Thinking)
6. **LLM inference** → search results + query injected into a structured prompt, streamed through **OpenAI Responses API** using the user's chosen model and reasoning effort
7. **SSE to browser** → answer chunks, sources, and follow-up questions arrive as named events; frontend renders progressively
8. **Persistence** → complete assistant message written to **PostgreSQL**; conversation lists invalidated in **Redis**

---

## 🚢 Deployment

### Backend — Render / Railway

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `bun run build` |
| Start command | `bun run start` |
| Environment vars | Copy all from `backend/.env.example` |

Set `FRONTEND_URL` to your Vercel production domain. Provision a Redis instance ([Upstash](https://upstash.com) works well on both platforms) and update `REDIS_URL`.

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
