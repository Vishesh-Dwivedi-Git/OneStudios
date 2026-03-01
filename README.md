<p align="center">
  <img src="client/public/images/hero-dashboard.jpg" alt="OneStudios Banner" width="100%" />
</p>

<h1 align="center">🎬 OneStudios</h1>

<p align="center">
  <strong>A full-stack, production-grade video conferencing platform built from scratch.</strong><br/>
  Real-time 1:1 &amp; group calls · AI meeting intelligence · end-to-end encryption · collaborative whiteboard &amp; more.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebRTC-P2P%20%26%20SFU-FF6600?logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/mediasoup-SFU-6C3483?logo=data:image/svg+xml;base64,&logoColor=white" alt="mediasoup" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Gemini_AI-2.0_Flash-4285F4?logo=google&logoColor=white" alt="Gemini AI" />
</p>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Docker Deployment](#-docker-deployment)
- [API Reference](#-api-reference)
- [WebSocket Protocol](#-websocket-protocol)
- [Database Schema](#️-database-schema)
- [Roadmap](#-roadmap--upcoming-features)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**OneStudios** is a full-featured, real-time video conferencing platform designed and built entirely from the ground up—no third-party SDKs like Twilio or Agora. It leverages **native WebRTC** for peer-to-peer 1:1 calls and **mediasoup SFU** for scalable group calls, all orchestrated through a custom WebSocket signaling server.

Unlike off-the-shelf solutions, OneStudios gives you full control over the media pipeline, enabling features like:

- 🔒 **True end-to-end encryption** via Web Crypto API (ECDH + AES-GCM)
- 🤖 **AI-powered meeting intelligence** using Google Gemini 2.0 Flash
- 🎨 **Virtual backgrounds** with real-time ML segmentation (MediaPipe)
- 📹 **Canvas-composite recording** capturing all participants in a single video

---

## 🚀 Live Demo

| Service  | URL |
|----------|-----|
| Frontend | Deployed on **Vercel** |
| Backend  | Deployed on **Railway** |

> _Replace the URLs above with your actual deployment links._

---

## ✨ Key Features

### 📞 Video Calling
| Feature | Description |
|---------|-------------|
| **1:1 Peer-to-Peer Calls** | Direct WebRTC connections with STUN/TURN relay fallback for NAT traversal |
| **Group Calls (SFU)** | Scalable N-peer calls via mediasoup Selective Forwarding Unit — up to 10+ participants |
| **Screen Sharing** | Share your entire screen or specific windows with real-time stream switching |
| **Adaptive Bitrate** | ICE candidate pool optimization and automatic quality adjustment |

### 🎥 Local Recording & P2P Transfer

> **⭐ Headline Feature** — Recording runs 100% locally in the browser. No media ever touches the server.

| Feature | Description |
|---------|-------------|
| **Canvas-Composite Recording** | All participant video streams are drawn onto a single `<canvas>` in a computed grid layout (auto rows/cols), combined with mixed audio via `AudioContext`, and captured as a single high-quality WebM file |
| **P2P Recording Transfer** | Finished recordings are sent directly to other participants over `RTCDataChannel` — chunked into 64 KB pieces with backpressure handling (`bufferedAmountLow`) for reliable delivery |
| **Zero-Server Architecture** | `MediaRecorder` + `CanvasCaptureStream` + `RTCDataChannel` — the entire pipeline runs client-side. No upload endpoints, no cloud storage, no transcoding servers |
| **Download & Manage** | Recordings modal shows file name, size, timestamp, download status; supports individual and bulk download |

#### How It Works

```
 ┌──────────────────── Recording Pipeline ────────────────────┐
 │                                                            │
 │  Local Streams ──► Canvas (grid draw loop @ rAF)           │
 │  Remote Streams ──► ┐                                      │
 │                     ├──► captureStream(30fps) ──► MediaRecorder
 │  AudioContext  ──► mixedAudioDest ──────────────┘          │
 │                                                            │
 │  MediaRecorder.onstop ──► Blob ──► RTCDataChannel ──► Peer │
 │                                   (64KB chunks)            │
 └────────────────────────────────────────────────────────────┘
```

### 🤖 AI Meeting Intelligence (Gemini 2.0 Flash)
| Feature | Description |
|---------|-------------|
| **Smart Reply Suggestions** | AI analyzes the live transcript and suggests 3 contextual response options in real time |
| **Meeting Summary Generation** | One-click post-meeting summary with key points, action items, and decisions extracted |
| **Rate-Limited AI Endpoints** | 20 req/min AI limiter to prevent API abuse while keeping the experience smooth |

### 🔐 Security & Encryption
| Feature | Description |
|---------|-------------|
| **End-to-End Encryption (E2EE)** | ECDH key exchange → AES-256-GCM encryption; messages are encrypted before leaving the device |
| **JWT Authentication** | Access + Refresh token rotation with httpOnly cookies (no localStorage exposure) |
| **OAuth 2.0** | One-click login with **Google** and **Discord** via Passport.js strategies |
| **Bcrypt Password Hashing** | Salted bcrypt hashing for email/password accounts |
| **Rate Limiting** | Multi-tier rate limiting — global (200/min), auth (10/15min), AI (20/min), room creation (15/min) |
| **Helmet Security Headers** | HSTS, X-Frame-Options, XSS protection, and more out of the box |

### 💬 Real-Time Collaboration
| Feature | Description |
|---------|-------------|
| **In-Call Chat** | Full-featured chat panel with emoji picker, image sharing (base64), message grouping, and timestamps |
| **Collaborative Whiteboard** | Real-time drawing canvas synced across all peers via WebSocket — supports pen, eraser, color palette, and stroke width |
| **Floating Emoji Reactions** | Animated emoji reactions (👏 🎉 ❤️ 😂 🔥 👍) that float across all participants' screens |
| **Social Sharing** | Share room invite via WhatsApp, Telegram, Twitter/X, LinkedIn, Email, and SMS with pre-filled messages |

### 🎙️ Transcription & Captions
| Feature | Description |
|---------|-------------|
| **Live Captions** | Browser-native Web Speech API transcription — zero cost, zero external API calls |
| **Running Transcript** | Full meeting transcript maintained with speaker attribution and timestamps |
| **AI-Powered Summaries** | Feed the transcript to Gemini for structured summaries at meeting end |

### 🎨 Customization & UX
| Feature | Description |
|---------|-------------|
| **11 Call Themes** | Choose from Midnight Blue, Aurora Borealis, Sunset Ember, Deep Ocean, Neon Pulse, and more |
| **Virtual Backgrounds** | MediaPipe Selfie Segmentation with blur and custom image backgrounds (runs locally) |
| **Dark/Light Mode** | System-aware theme with manual toggle via `next-themes` |
| **Responsive Design** | Fully responsive across desktop, tablet, and mobile viewports |

### 📊 Analytics Dashboard
| Feature | Description |
|---------|-------------|
| **Meeting Analytics** | Track total meetings, total time, average duration, and meetings hosted |
| **Activity Charts** | 30-day meeting activity bar chart with hover tooltips |
| **Meeting History** | Complete log of past meetings with type, duration, participant count, and host status |
| **Type Breakdown** | Visual breakdown of 1:1 vs Group vs Virtual Room meetings |

### 🏗️ Infrastructure
| Feature | Description |
|---------|-------------|
| **WebSocket Heartbeat** | 30-second ping/pong cycle to detect and terminate dead connections |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers for clean resource teardown |
| **Health Checks** | `/health` endpoint with uptime and timestamp for monitoring |
| **Docker Multi-Stage Builds** | Optimized Dockerfiles for both frontend and backend with minimal production images |
| **Gzip/Brotli Compression** | All API responses compressed via `compression` middleware |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router, server components |
| **React 19** | UI library with latest hooks API |
| **TypeScript 5** | Type safety across the entire codebase |
| **Tailwind CSS 4** | Utility-first styling with custom design tokens |
| **Radix UI** | Accessible, unstyled primitives (Dialog, Dropdown, Toast, Tabs, etc.) |
| **Lucide React** | Beautiful, consistent icon library |
| **mediasoup-client** | Client-side SFU integration for group calls |
| **MediaPipe** | Self-hosted ML model for real-time selfie segmentation |
| **Web Speech API** | Browser-native speech-to-text for live captions |
| **Web Crypto API** | ECDH + AES-GCM for end-to-end encryption |
| **Sonner** | Elegant toast notifications |
| **Recharts** | Dashboard analytics charts |
| **next-themes** | Dark/light mode with system preference detection |
| **Zod** | Runtime schema validation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Express 5** | HTTP server with async route handlers |
| **TypeScript + tsx** | Hot-reload development with `tsx watch` |
| **WebSocket (ws)** | Custom signaling server for WebRTC negotiation |
| **mediasoup 3** | C++ SFU for scalable group video calls |
| **Prisma 7** | Type-safe ORM with PostgreSQL adapter |
| **Neon PostgreSQL** | Serverless Postgres (cloud-hosted, no local DB needed) |
| **Passport.js** | Google OAuth 2.0 + Discord OAuth strategies |
| **JWT** | Access/Refresh token authentication with rotation |
| **bcrypt** | Secure password hashing |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | Multi-tier rate limiting |
| **Morgan** | HTTP request logging |
| **Google Gemini AI** | AI-powered smart replies and meeting summaries |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Multi-stage builds for frontend and backend |
| **Docker Compose** | Single-command orchestration of all services |
| **Vercel** | Frontend deployment with edge functions |
| **Railway** | Backend deployment with managed infrastructure |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Browser 1│  │ Browser 2│  │ Browser 3│  │ Browser N│         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │              │              │              │              │
│       └──────────────┼──────────────┼──────────────┘              │
│                      │              │                              │
└──────────────────────┼──────────────┼──────────────────────────────┘
                       │              │
            ┌──────────▼──────────────▼──────────┐
            │        NEXT.JS FRONTEND            │
            │    (Vercel / Docker :3000)          │
            │                                     │
            │  • App Router (pages & layouts)     │
            │  • WebRTC hooks (P2P + SFU)         │
            │  • Virtual Backgrounds (MediaPipe)  │
            │  • E2E Encryption (Web Crypto)      │
            │  • Live Transcription (Speech API)  │
            └──────────────┬──────────────────────┘
                           │
              REST API ────┤──── WebSocket
                           │
            ┌──────────────▼──────────────────────┐
            │        EXPRESS BACKEND              │
            │    (Railway / Docker :5000)          │
            │                                     │
            │  ┌──────────────────────────┐       │
            │  │  REST API Layer          │       │
            │  │  • Auth (JWT + OAuth)    │       │
            │  │  • Room CRUD            │       │
            │  │  • AI Endpoints         │       │
            │  └──────────────────────────┘       │
            │                                     │
            │  ┌──────────────────────────┐       │
            │  │  WebSocket Signaling     │       │
            │  │  • Room management       │       │
            │  │  • P2P negotiation       │       │
            │  │  • SFU transport setup   │       │
            │  │  • Chat / Whiteboard     │       │
            │  │  • Heartbeat (30s)       │       │
            │  └──────────────────────────┘       │
            │                                     │
            │  ┌──────────────────────────┐       │
            │  │  mediasoup SFU           │       │
            │  │  • Workers & Routers     │       │
            │  │  • WebRTC Transports     │       │
            │  │  • Producers/Consumers   │       │
            │  └──────────────────────────┘       │
            └──────────────┬──────────────────────┘
                           │
            ┌──────────────▼──────────────────────┐
            │     NEON POSTGRESQL (Cloud)          │
            │                                     │
            │  • Users & Auth tokens              │
            │  • Rooms & Participants             │
            │  • Recordings metadata              │
            │  • Chat messages (persisted)         │
            │  • Presentations                    │
            └─────────────────────────────────────┘
```

### Call Flow — 1:1 (Peer-to-Peer)
```
Caller                    Signaling Server                    Callee
  │                             │                               │
  │── join-room ───────────────►│                               │
  │                             │◄────────────── join-room ─────│
  │                             │                               │
  │── offer (SDP) ─────────────►│── offer (SDP) ───────────────►│
  │                             │                               │
  │◄───────────────── answer ───│◄──────────── answer (SDP) ────│
  │                             │                               │
  │◄──────── ICE candidates ────┼──── ICE candidates ──────────►│
  │                             │                               │
  │◄═══════════ Direct P2P Media Stream (encrypted) ═══════════►│
```

### Call Flow — Group (SFU via mediasoup)
```
Peer A                    SFU Server                     Peer B
  │                           │                             │
  │── getRouterCapabilities ─►│                             │
  │◄── rtpCapabilities ──────│                             │
  │                           │                             │
  │── createTransport ───────►│                             │
  │◄── transport params ─────│                             │
  │── connectTransport ──────►│                             │
  │── produce (video/audio) ─►│                             │
  │                           │◄── createTransport ─────────│
  │                           │── transport params ────────►│
  │                           │◄── connectTransport ────────│
  │                           │◄── consume (A's media) ─────│
  │                           │── consumer params ─────────►│
```

---

## 📁 Project Structure

```
OneStudios/
├── client/                          # Next.js 16 Frontend
│   ├── app/
│   │   ├── page.tsx                 # Landing page with hero, features, CTA
│   │   ├── auth/
│   │   │   ├── login/page.tsx       # Login form (email + OAuth)
│   │   │   ├── register/page.tsx    # Registration form
│   │   │   └── callback/page.tsx    # OAuth callback handler
│   │   ├── call/[roomId]/page.tsx   # 1:1 video call page
│   │   ├── group/[roomId]/page.tsx  # Group video call page (SFU)
│   │   ├── join/[inviteCode]/page.tsx # Invite code join page
│   │   └── dashboard/page.tsx       # Meeting analytics dashboard
│   ├── components/
│   │   ├── AuthForm.tsx             # Login/Register form with OAuth buttons
│   │   ├── CallControls.tsx         # Call toolbar (mute, video, share, record)
│   │   ├── CallThemeSwitcher.tsx    # 11 background themes for calls
│   │   ├── ChatPanel.tsx            # In-call chat with emoji, images, AI suggestions
│   │   ├── EmojiReactions.tsx       # Floating animated emoji reactions
│   │   ├── MeetingSummaryModal.tsx   # AI-generated post-meeting summary
│   │   ├── ParticipantList.tsx      # Grid of participant video tiles
│   │   ├── RecordingsModal.tsx      # P2P recording management & download
│   │   ├── ShareDialog.tsx          # Social sharing (WhatsApp, Telegram, etc.)
│   │   ├── VideoPlayer.tsx          # Individual video tile component
│   │   ├── VirtualBackgroundSelector.tsx # Background blur/image selector
│   │   ├── Whiteboard.tsx           # Collaborative drawing canvas
│   │   └── ui/                      # 50+ Radix UI + shadcn/ui primitives
│   ├── hooks/
│   │   ├── use-webrtc.ts            # 1:1 WebRTC hook (750+ lines)
│   │   ├── use-group-webrtc.ts      # Group SFU hook via mediasoup (650+ lines)
│   │   ├── use-recording.ts         # Canvas-composite recording hook
│   │   ├── use-transcription.ts     # Web Speech API live captions
│   │   ├── use-encryption.ts        # ECDH + AES-GCM E2E encryption
│   │   └── use-virtual-background.ts # MediaPipe selfie segmentation
│   ├── Dockerfile                   # Multi-stage production build
│   └── package.json
│
├── backend/                         # Express 5 Backend
│   ├── src/
│   │   ├── index.ts                 # Server bootstrap + WebSocket + heartbeat
│   │   ├── app.ts                   # Express app (middleware, routes, rate limiting)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts   # Register, login, refresh, logout
│   │   │   ├── oauth.controllers.ts # Google + Discord OAuth success handler
│   │   │   ├── room.controller.ts   # CRUD rooms, join, leave, end, stats
│   │   │   ├── ai.controller.ts     # Gemini smart replies + meeting summaries
│   │   │   └── signalling.controller.ts # WebSocket signaling helpers
│   │   ├── realtime/
│   │   │   ├── ws.server.ts         # WebSocket server setup
│   │   │   ├── router.ts           # Message-type routing for WebSocket
│   │   │   ├── webrtc.handler.ts    # P2P + SFU signaling handlers (430+ lines)
│   │   │   └── services/
│   │   │       ├── room.service.ts  # In-memory room/peer state management
│   │   │       └── sfu.service.ts   # mediasoup worker, router, transport management
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts   # JWT verification middleware
│   │   └── lib/
│   │       ├── prisma.ts            # Prisma client singleton
│   │       ├── passport.ts          # Google + Discord strategies
│   │       ├── jwt.ts               # Token generation utilities
│   │       ├── cookies.ts           # httpOnly cookie helpers
│   │       └── hash.ts              # Token hashing (SHA-256)
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema (6 models, 5 enums)
│   │   └── migrations/              # SQL migration history
│   ├── Dockerfile                   # Multi-stage build (mediasoup C++ deps)
│   └── package.json
│
├── docker-compose.yml               # Single-command full-stack orchestration
└── README.md                        # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 22 (LTS recommended)
- **npm** ≥ 10
- **PostgreSQL** — or use [Neon](https://neon.tech) (free tier, no local DB needed)
- **Python 3 + pip** — required for mediasoup native compilation
- **C++ build tools** — `g++` / `make` (Linux/macOS) or Visual Studio Build Tools (Windows)

### 1. Clone the Repository

```bash
git clone https://github.com/Vishesh-Dwivedi-Git/OneStudios.git
cd OneStudios
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies (includes mediasoup native build)
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

The backend will start on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:3000`.

### 4. Open the App

Navigate to `http://localhost:3000` in your browser. Create an account or sign in with Google/Discord, then start a meeting!

---

## 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# ─── Database (Neon PostgreSQL) ──────────────────────────
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# ─── JWT Secrets (use strong random strings) ─────────────
JWT_SECRET="your-jwt-secret"
ACCESS_TOKEN_SECRET="your-access-token-secret"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# ─── Google OAuth ────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# ─── Discord OAuth ───────────────────────────────────────
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:5000/auth/discord/callback

# ─── Google Gemini AI ────────────────────────────────────
# Get a free key at https://aistudio.google.com/apikey
GEMINI_API_KEY=your-gemini-api-key

# ─── Server ──────────────────────────────────────────────
PORT=5000
CLIENT_URL=http://localhost:3000
```

---

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Services:
#   • Client  → http://localhost:3000
#   • Backend → http://localhost:5000
```

### Individual Service Builds

```bash
# Backend (includes mediasoup C++ native compilation)
cd backend
docker build -t onestudios-backend .

# Frontend (multi-stage with standalone output)
cd client
docker build -t onestudios-client \
  --build-arg NEXT_PUBLIC_API_URL=https://your-api.railway.app .
```

### Docker Architecture

| Service | Base Image | Exposed Port | Features |
|---------|-----------|-------------|----------|
| `backend` | `node:22-bookworm-slim` | `5000` | Multi-stage, mediasoup C++ deps, health check |
| `client` | `node:22-alpine` | `3000` | Multi-stage, standalone Next.js output, non-root user |

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Create account | `{ email, username, password }` |
| `POST` | `/auth/login` | Login (rate-limited: 10/15min) | `{ email, password }` |
| `POST` | `/auth/refresh` | Rotate tokens | — (uses cookie) |
| `POST` | `/auth/logout` | Logout & revoke | — (uses cookie) |
| `GET`  | `/auth/google` | Google OAuth redirect | — |
| `GET`  | `/auth/discord` | Discord OAuth redirect | — |
| `GET`  | `/auth/me` | Get current user | 🔒 Protected |
| `GET`  | `/auth/ws-token` | Get token for WebSocket auth | 🔒 Protected |

### Rooms

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/rooms` | Create room | `{ name?, type?, maxParticipants? }` |
| `GET`  | `/rooms` | List user's rooms | Query: `?active=true/false` |
| `GET`  | `/rooms/stats` | Meeting analytics | 🔒 Protected |
| `GET`  | `/rooms/:id` | Get room details | 🔒 Protected |
| `POST` | `/rooms/:id/join` | Join room by ID | 🔒 Protected |
| `POST` | `/rooms/join/:inviteCode` | Join by invite code | 🔒 Protected |
| `POST` | `/rooms/:id/leave` | Leave room | 🔒 Protected |
| `POST` | `/rooms/:id/end` | End room (host only) | 🔒 Protected |

### AI

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/ai/suggest` | Smart reply suggestions | `{ transcript, lastSpeaker }` |
| `POST` | `/ai/summary` | Meeting summary | `{ transcript, duration, participantCount }` |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Server status, uptime, timestamp |

---

## 🔌 WebSocket Protocol

All WebSocket messages follow JSON format: `{ type: string, ...payload }`

### Signaling Messages (1:1 P2P)

| Type | Direction | Description |
|------|-----------|-------------|
| `join-room` | Client → Server | Join a room with authentication |
| `peer-joined` | Server → Client | New peer entered the room |
| `offer` | Client ↔ Client | SDP offer for WebRTC negotiation |
| `answer` | Client ↔ Client | SDP answer response |
| `ice-candidate` | Client ↔ Client | ICE candidates for connectivity |
| `peer-left` | Server → Client | Peer disconnected |

### SFU Messages (Group Calls)

| Type | Direction | Description |
|------|-----------|-------------|
| `getRouterCapabilities` | Client → Server | Request mediasoup RTP capabilities |
| `createTransport` | Client → Server | Create WebRTC send/receive transport |
| `connectTransport` | Client → Server | Connect transport with DTLS params |
| `produce` | Client → Server | Start producing media (audio/video) |
| `consume` | Client → Server | Start consuming remote peer's media |

### Collaboration Messages

| Type | Direction | Description |
|------|-----------|-------------|
| `chat-message` | Client ↔ Client | Text/image chat messages |
| `reaction` | Client ↔ Client | Emoji reactions |
| `whiteboard-draw` | Client ↔ Client | Drawing canvas data points |
| `whiteboard-clear` | Client ↔ Client | Clear the whiteboard |
| `e2e-public-key` | Client ↔ Client | ECDH public key exchange |

---

## 🗄️ Database Schema

The database consists of **6 models** and **5 enums**, managed by Prisma 7:

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│     User     │       │  RoomParticipant │       │     Room     │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id           │◄──────│ userId           │───────►│ id           │
│ username     │       │ roomId           │       │ name         │
│ email        │       │ role (ENUM)      │       │ type (ENUM)  │
│ password     │       │ joinedAt         │       │ isActive     │
│ avatar       │       │ leftAt           │       │ inviteCode   │
│ createdAt    │       └──────────────────┘       │ hostId ──────│───►User
└──────┬───────┘                                  │ maxPartic... │
       │                                          │ scheduledAt  │
       │       ┌──────────────────┐               │ endedAt      │
       ├──────►│  RefreshToken    │               └──────────────┘
       │       ├──────────────────┤                      │
       │       │ tokenHash        │               ┌──────┴───────┐
       │       │ expiresAt        │               │              │
       │       └──────────────────┘        ┌──────┴──┐   ┌───────┴──────┐
       │                                   │Recording│   │ ChatMessage  │
       │       ┌──────────────────┐        ├─────────┤   ├──────────────┤
       └──────►│  Presentation    │        │ filename│   │ content      │
               ├──────────────────┤        │ duration│   │ type (ENUM)  │
               │ title            │        │ fileSize│   │ isAI         │
               │ type (ENUM)      │        │ status  │   └──────────────┘
               │ isActive         │        └─────────┘
               └──────────────────┘
```

### Enums

| Enum | Values | Description |
|------|--------|-------------|
| `RoomType` | `ONE_TO_ONE`, `GROUP`, `VIRTUAL_ROOM` | Meeting topology |
| `RoomRole` | `HOST`, `CO_HOST`, `PARTICIPANT`, `VIEWER` | Permission levels |
| `RecordingStatus` | `PROCESSING`, `READY`, `FAILED` | Recording lifecycle |
| `PresentationType` | `SCREEN_SHARE`, `SLIDE_DECK` | Presentation source |
| `MessageType` | `TEXT`, `SYSTEM`, `AI_SUGGESTION` | Chat message classification |

---

## 🗺️ Roadmap & Upcoming Features

<table>
<tr>
<td>

### 🌐 Spatial 3D Virtual Rooms &nbsp; <img src="https://img.shields.io/badge/Status-Coming_Soon-blueviolet?style=flat-square" alt="Coming Soon" />

Step into a fully immersive **3D meeting space** powered by Three.js / React Three Fiber. Instead of a flat video grid, participants will be represented as **3D avatars** in a shared virtual environment with **spatial audio** — voices get louder as you walk closer and fade as you move away.

**Planned capabilities:**

| Feature | Description |
|---------|-------------|
| 🧑‍🚀 **3D Avatars** | Customizable avatars with real-time lip-sync driven by microphone input |
| 🔊 **Spatial Audio** | Web Audio API panning — sound position matches avatar location in 3D space |
| 🏢 **Virtual Environments** | Pre-built rooms: conference hall, lounge, classroom, open office |
| 🚶 **Free Movement** | WASD / click-to-move navigation within the 3D scene |
| 🖥️ **In-World Screen Sharing** | Screen shares appear as floating panels in 3D space |
| 💬 **Proximity Chat** | Private conversations by physically walking close to another avatar |
| 🎨 **Custom Worlds** | Upload and design your own 3D meeting environments (glTF/GLB) |

> The `VIRTUAL_ROOM` room type is already defined in the database schema — ready for this feature.

</td>
</tr>
</table>

### Other Planned Features

| Status | Feature | Description |
|--------|---------|-------------|
| 🔜 | **Breakout Rooms** | Split group calls into smaller sub-rooms for focused discussion |
| 🔜 | **Waiting Room / Lobby** | Host approval before participants join the call |
| 🔜 | **Cloud Recording Storage** | Save recordings to S3-compatible storage with playback links |
| 🔜 | **Slide Deck Sync** | Upload PDF/PPT slides and sync navigation across all participants |
| 🔜 | **Host Controls** | Mute all, remove participant, promote to co-host |
| 🔜 | **Noise Suppression** | AI-based background noise cancellation (RNNoise / Web ML) |
| 📋 | **Calendar Integration** | Schedule meetings with Google Calendar / Outlook sync |
| 📋 | **Mobile Apps** | React Native clients for iOS and Android |

---

## 📸 Screenshots

> Add your application screenshots here. Recommended sections:
> 
> 1. **Landing Page** — Hero section with feature cards
> 2. **1:1 Video Call** — Two participants with call controls
> 3. **Group Call (SFU)** — Multiple participants in a grid
> 4. **Chat Panel** — In-call chat with AI suggestions
> 5. **Whiteboard** — Collaborative drawing in action
> 6. **Dashboard** — Meeting analytics with charts
> 7. **Virtual Backgrounds** — Background blur and image replacement
> 8. **Meeting Summary** — AI-generated post-meeting report

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m "Add amazing feature"`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing TypeScript patterns and file structure
- Use meaningful commit messages
- Add proper error handling for new endpoints
- Test WebRTC flows on multiple browsers (Chrome, Firefox, Edge)
- Ensure responsive design for any new UI components

---

## 📄 License

This project is open source and available under the [ISC License](LICENSE).

---

<p align="center">
  Built with ❤️ by <strong>Vishesh</strong>, <strong>Ayush</strong> & <strong>Pranav</strong>
</p>

<p align="center">
  <a href="#-onestudios">⬆ Back to Top</a>
</p>
