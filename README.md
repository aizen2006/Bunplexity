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
- ⚡ **Streaming AI responses** over Server-Sent Events — answer chunks rendered progressively as named `delta` events
- 🧠 **Model selection** — pick between `gpt-5.5`, `gpt-5.4`, and `gpt-5.4-mini`
- 🔀 **Fast / Thinking modes** — Fast = basic search (10 results); Thinking = advanced search (20 results)
- 💬 **Persistent conversations** — full message history stored in PostgreSQL via Drizzle ORM, with sources persisted alongside each assistant message
- 🎙️ **Voice transcription** — click the mic in the ChatBar, speak, and your words stream into the textarea via OpenAI `gpt-4o-mini-transcribe`
- ✏️ **Rename & delete conversations** — hover any item in the history sidebar for inline rename (Enter saves, Esc cancels) and inline delete confirm
- 🪟 **Sources tab** — top-level Chat / Sources switcher in each conversation; aggregates every unique source cited in the thread with favicon + hostname
- 🔗 **Inline sources panel** — web result cards surface alongside each individual answer
- 🤖 **Auto-generated follow-up questions** suggested after every answer
- 👤 **User menu with hover popover** — avatar in the sidebar footer; popover shows name, email, OAuth provider, and remaining credits
- 🆕 **Centered `/chat/new` hero** — fresh-chat lives inside the chat layout (sidebar visible), not on a separate page
- 📚 **Searchable history tab** in the sidebar with relative timestamps
- 🚀 **Agent Mode tab** — placeholder with animated "Coming Soon" badge
- 🎨 **Microinteractions** — spring-animated mode toggle, model dropdown, staggered list animations via Framer Motion
- 🗃️ **Semantic search caching** via Pinecone (skips Tavily on high-similarity hits)
- 🗄️ **Redis response caching** on conversations & messages (1-hour TTL)
- 🔐 **GitHub & Google OAuth** via Supabase — with PKCE flow, auto token refresh, and `?next=` post-login redirect preservation
- 🚦 **Per-user rate limiting** — 20 requests per minute on chat and transcription endpoints

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│    Browser  (Next.js :3000)     │
│  React 19 · Tailwind CSS 4      │
│  Framer Motion · SSE reader     │
│  Mic + MediaRecorder            │
│  useAuth (onAuthStateChange)    │
└──────────┬──────────────────────┘
           │  POST /chat        { query, conversationId, mode, model }
           │  POST /transcript  (raw audio buffer)
           │  GET  /user/*      (Bearer JWT)
           │  PATCH/DELETE      /user/conversation*
           ▼
┌─────────────────────────────────┐
│    Express API  (Bun :3001)     │
│                                 │
│  authMiddleware      ───────────│──► Supabase Auth (JWT verify, PKCE)
│  chatRateLimit (20/min)         │
│         │                       │
│         ▼                       │
│  Tavily Web Search   ───────────│──► live results (basic / advanced)
│         │                       │
│  Pinecone Vector DB  ───────────│──► semantic cache lookup (1024-dim)
│         │                       │
│  OpenAI Responses API ──────────│──► streaming chat completion
│  OpenAI Whisper      ───────────│──► gpt-4o-mini-transcribe (streaming)
│         │                       │
│  SSE stream ───────────────────►│── delta / sources / done events
│         │                       │
│  PostgreSQL (Drizzle) ──────────│──► messages + sources jsonb
│  Redis cache         ───────────│──► conversations / messages cache
└─────────────────────────────────┘
```

The frontend reads both SSE streams (`/chat` and `/transcript`) with a `ReadableStream` reader. Chat deltas append to the message bubble; transcription deltas append to the ChatBar textarea so the user can edit while dictation is in flight.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4, Framer Motion 12 |
| **Backend** | Bun runtime, Express 5, TypeScript |
| **Database** | PostgreSQL via Supabase + Drizzle ORM |
| **Cache** | Redis 7 (Alpine) |
| **Auth** | Supabase Auth (PKCE) — GitHub & Google OAuth |
| **LLM** | OpenAI Responses API (`gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`) |
| **Transcription** | OpenAI `gpt-4o-mini-transcribe` (streaming) |
| **Embeddings** | OpenAI `text-embedding-3-small` @ 1024 dims |
| **Web Search** | Tavily API |
| **Vector DB** | Pinecone |
| **Validation** | Zod 4 |

---

## 🤖 Available Models

| Model ID | Description |
|----------|-------------|
| `gpt-5.5` | New class of intelligence for coding & professional work |
| `gpt-5.4` | Affordable model for coding & professional work |
| `gpt-5.4-mini` *(default)* | Strongest mini for coding, computer use & subagents |

**Fast mode** → basic search depth, 10 results
**Thinking mode** → advanced search depth, 20 results

---

## 📁 Project Structure

```
Bunplexity/
├── backend/                          # Bun + Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle ORM — users, conversations, messages (with sources jsonb)
│   │   │   └── index.ts              # DB connection
│   │   ├── lib/
│   │   │   ├── cache.ts              # Redis get-or-set + invalidateCache
│   │   │   ├── client.ts             # Supabase admin client
│   │   │   ├── openai.ts             # OpenAI client (LLM + embeddings + transcription)
│   │   │   ├── pinecone.ts           # Semantic search cache (1024-dim)
│   │   │   └── tavily.ts             # Web search client
│   │   ├── routes/
│   │   │   ├── chat.route.ts         # POST /chat, /chat/follow-up, /transcript
│   │   │   ├── user.route.ts         # /user/me, GET/PATCH/DELETE conversations
│   │   │   └── admin.routes.ts       # Admin-secret protected utilities
│   │   ├── middleware.ts             # JWT auth + per-user rate limiter
│   │   ├── prompt.ts                 # System prompt + response format template
│   │   └── index.ts                  # Express app setup, CORS, health routes
│   └── .env.example
│
├── frontend/                         # Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx                  # Hero landing (signed-out) / redirect to /chat/new (signed-in)
│       │   ├── login/                    # GitHub + Google OAuth + ?next= support
│       │   └── chat/[conversationId]/    # Streaming chat + Chat/Sources tabs (+ /chat/new hero)
│       ├── components/
│       │   ├── ConversationSidebar.tsx   # History tab + Agent tab + hover rename/delete + UserMenu
│       │   ├── ChatBar.tsx               # Input + mode + model + mic + transcription streaming
│       │   ├── MessageList.tsx           # Message thread + inline sources
│       │   ├── MessageBubble.tsx         # Markdown + ANSWER/FOLLOW_UPS parsing
│       │   ├── SourcesPanel.tsx          # Inline source cards (per-message)
│       │   ├── SourcesTab.tsx            # Aggregated unique sources across the whole conversation
│       │   ├── FollowUpQuestions.tsx     # Suggested follow-ups extracted from response
│       │   ├── UserMenu.tsx              # Avatar + hover popover (name, email, provider, credits)
│       │   └── Card.tsx                  # Shared card primitive
│       ├── hooks/
│       │   └── useAuth.ts                # Auth lifecycle (onAuthStateChange, signOut, token refresh)
│       ├── lib/
│       │   ├── api.ts                    # fetch wrapper + SSE consumers (streamChat, transcribeAudio)
│       │   └── supabase.ts               # Supabase browser client (PKCE flow)
│       ├── types/
│       │   └── index.ts                  # Shared types incl. ChatOptions, ChatModel, Source, User
│       └── utils/
│
└── Design/                            # UI reference mockups
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Docker](https://docker.com) (for Redis)
- API keys: [Supabase](https://supabase.com) · [OpenAI](https://platform.openai.com) · [Tavily](https://tavily.com) · [Pinecone](https://pinecone.io)
- A **1024-dimension** Pinecone index (the backend calls `text-embedding-3-small` with `dimensions: 1024`)

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
cp .env.example .env       # fill in all API keys
bun install
bunx drizzle-kit push      # sync schema (including new sources jsonb column)
bun run dev                # http://localhost:3001
```

**3. Frontend**

```bash
cd frontend
bun install
bun run dev                # http://localhost:3000
```

> **Without Redis:** the backend starts fine and silently skips caching — all features still work without the 1-hour response cache.

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
| `SUPABASE_API_KEY_SECRET` | ✅ | Supabase **service role** key — keep secret |
| `OPENAI_API_KEY` | ✅ | OpenAI key — used for chat models, `text-embedding-3-small`, and `gpt-4o-mini-transcribe` |
| `TAVILY_API_KEY` | ✅ | Tavily web search API key |
| `PINECONE_API_KEY` | ✅ | Pinecone API key |
| `PINECONE_INDEX` | ✅ | Name of your 1024-dimension Pinecone index |
| `ADMIN_SECRET` | optional | Required only if you hit `/admin/*` |

> GitHub and Google OAuth credentials are configured in the Supabase dashboard (Auth → Providers) — no backend env vars needed. Set the OAuth redirect URL to `${FRONTEND_URL}/chat/new`.

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
| `POST` | `/transcript` | ✅ | Streaming audio transcription — body is a raw audio buffer (`audio/webm`, `audio/mp4`, etc.) |
| `GET` | `/user/me` | ✅ | Authenticated user profile |
| `GET` | `/user/conversations` | ✅ | List all conversations (Redis cached) |
| `GET` | `/user/conversations/:id` | ✅ | Conversation + messages (Redis cached) |
| `GET` | `/user/conversations/:id/messages` | ✅ | Messages only (Redis cached) |
| `PATCH` | `/user/conversation` | ✅ | Rename a conversation — body `{ conversationId, title }` |
| `DELETE` | `/user/conversation/:id` | ✅ | Delete a conversation (and its messages) |

All protected routes require `Authorization: Bearer <supabase_access_token>`.

#### Request Body — `POST /chat` and `POST /chat/follow-up`

```json
{
  "query": "What is the latest in quantum computing?",
  "conversationId": "uuid-v4",
  "mode": "fast",
  "model": "gpt-5.4-mini"
}
```

| Field | Type | Values |
|-------|------|--------|
| `mode` | `"fast" \| "thinking"` | `fast` → basic search · `thinking` → advanced search |
| `model` | `string` | `gpt-5.5`, `gpt-5.4`, or `gpt-5.4-mini` |

#### SSE Stream Events — `/chat`

```
event: conversation   →  { "conversationId": "uuid" }
event: delta          →  { "text": "..." }                 # streaming answer chunk
event: sources        →  [{ "url": "...", "title": "..." }, ...]
event: done           →  {}
event: error          →  { "error": "..." }                # sanitized upstream message
```

#### SSE Stream Events — `/transcript`

```
event: delta          →  { "text": "..." }                 # partial transcription
event: done           →  { "text": "..." }                 # final text on completion
event: error          →  { "error": "..." }
```

---

## 🔄 How It Works

1. **User submits a query** with a selected model and mode → frontend POSTs `{ query, conversationId, mode, model }` with a Supabase Bearer token. For `/chat/new`, the frontend mints a fresh UUID before the first send.
2. **Auth & rate limit** → backend validates the JWT via Supabase, enforces 20 req/min per user.
3. **Embedding** → query is embedded via `text-embedding-3-small` (1024 dims) in parallel with conversation setup.
4. **Semantic cache check** → embedding compared against **Pinecone**; a hit returns cached web results, skipping Tavily.
5. **Web search** → if no cache hit, query sent to **Tavily** (10 results in Fast, 20 in Thinking).
6. **LLM inference** → search results + query injected into a structured prompt, streamed through **OpenAI Responses API** using the chosen model.
7. **SSE to browser** → `event: delta` chunks render progressively, followed by `event: sources` and `event: done`. Real upstream errors propagate as `event: error` with sanitized messages.
8. **Persistence** → assistant message + sources written to **PostgreSQL** (`messages.sources` jsonb); conversation lists invalidated in **Redis**.
9. **Voice input (optional)** → user clicks the ChatBar mic. `MediaRecorder` captures audio, posts to `/transcript`, and the backend streams transcription deltas through `gpt-4o-mini-transcribe` straight into the textarea.

---

## 🔐 Auth Flow

- Browser uses Supabase's **PKCE** flow with `detectSessionInUrl` and `autoRefreshToken` enabled.
- A single `useAuth` hook subscribes to `onAuthStateChange`, so the access token in memory is always fresh — long chat sessions keep working past the 1-hour token expiry, and a sign-out in another tab is reflected within ~1 second.
- Protected routes hitting an unauthenticated state push the user to `/login?next=<original-path>`. After sign-in, OAuth `redirectTo` honors `next` and lands them on the originally requested URL.
- `/login` itself bounces already-signed-in users to their `next` destination (or `/chat/new`).

---

## 🚢 Deployment

### Backend — Render / Railway

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build command | `bun run build` |
| Start command | `bun run start` |
| Environment vars | Copy all from `backend/.env.example` |

Set `FRONTEND_URL` to your Vercel production domain. Provision a Redis instance ([Upstash](https://upstash.com) works well on both platforms) and update `REDIS_URL`. Also remember to update your Supabase Auth → URL Configuration to allow the production frontend origin and `${FRONTEND_URL}/chat/new` as the OAuth redirect.

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
──────────────         ─────────────────        ───────────────────
id          (PK) ◄──┐  id          (PK) ◄──┐   id              (PK)
email              │  userId  (FK) ─────┘  │   conversationId  (FK) ─┘
provider           └► title                └── content
name                  createdAt                  role  (user | assistant)
credits (1000)                                   sources (jsonb)
createdAt                                        createdAt
```

Managed with **Drizzle ORM**. To sync schema to Supabase:

```bash
cd backend
bunx drizzle-kit push
```

The `messages.sources` column is a `jsonb` array of `{ url, title }` objects, populated whenever the assistant produces an answer so the per-message sources panel still works on refresh.

---

## 📄 License

MIT © [Soubhik Halder](https://github.com/soubhikhalder)

---

<div align="center">
  <sub>Built with ☕ and too many API keys</sub>
</div>
