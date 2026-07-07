<div align="center">

# 🖥️ LUMUS — Backend

### *Node.js 22 + Express 5 + Prisma 7 + Neon PostgreSQL + Google Gemini AI*

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon_DB-00E599?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

> Part of the [LUMUS monorepo](../README.md). See the root README for the full system architecture, ER diagram, and deployment guide.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Database Schema](#️-database-schema)
- [AI Pipeline](#-ai-pipeline)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)

---

## 🔍 Overview

The LUMUS backend is a **Node.js 22 + Express 5** REST API written in plain ESM JavaScript (`"type": "module"` — no TypeScript compilation step). It handles:

1. **User authentication** — Register/login via bcrypt + JWT stored in httpOnly cookies
2. **Code submission intake** — Accepts pasted code or file uploads (via Multer), stores them as `CodeFile` records linked to a `Review`
3. **Async AI analysis pipeline** — A fire-and-forget 4-stage pipeline (static → complexity → AI → complete) that runs after submission
4. **Data retrieval** — Dashboard stats, review details, paginated history with filters

The database is hosted on **[Neon](https://neon.tech)** — serverless PostgreSQL. Prisma 7 with `@prisma/adapter-pg` handles all DB access. No local PostgreSQL installation is required.

---

## 🏗️ Architecture

### Request Flow

```mermaid
graph LR
  A["Client Request"] --> B["CORS Middleware\n(Express)"]
  B --> C["isLoggedIn Middleware\n(JWT verify → req.user)"]
  C --> D["Controller"]
  D --> E[("Neon PostgreSQL\nvia Prisma")]
  D -->|"POST /submissions only"| F["pipelineService.js\n(async, fire-and-forget)"]
  F --> E
  F --> G["Google Gemini AI\n(@google/genai)"]
```

### Pipeline Stages

```mermaid
stateDiagram-v2
  [*] --> PENDING : POST /submissions accepted
  PENDING --> ANALYZING : pipeline starts
  ANALYZING --> AI_REVIEW : static + complexity saved
  AI_REVIEW --> COMPLETED : Gemini response saved
  ANALYZING --> FAILED : unhandled error
  AI_REVIEW --> FAILED : Gemini API error
  COMPLETED --> [*]
  FAILED --> [*]
```

---

## 🛠️ Tech Stack

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP server framework |
| `@google/genai` | ^2.10.0 | Google Gemini AI SDK |
| `@prisma/client` | ^7.8.0 | Type-safe DB queries |
| `@prisma/adapter-pg` | ^7.8.0 | Prisma ↔ pg driver adapter |
| `pg` | ^8.22.0 | PostgreSQL client (node-postgres) |
| `bcrypt` | ^6.0.0 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT sign/verify |
| `multer` | ^2.2.0 | Multipart file upload handling |
| `cookie-parser` | ^1.4.7 | Parse httpOnly cookie `token` |
| `cors` | ^2.8.6 | Cross-origin request handling |
| `dotenv` | ^17.4.2 | Load `.env` into `process.env` |
| `prisma` (dev) | ^7.8.0 | Prisma CLI for migrations |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A **[Neon](https://neon.tech)** project (free tier; no local PostgreSQL needed)
- A **[Google AI Studio](https://aistudio.google.com)** API key

### Installation

```bash
cd backend
npm install
# postinstall automatically runs: prisma generate
```

### Environment Variables

Create `backend/.env`:

```env
PORT=3000
NODE_ENV=development

# Copy from Neon dashboard > Connection Details > Connection string
DATABASE_URL="postgresql://user:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_minimum_32_character_random_secret

# Google AI Studio > Get API key
GEMINI_API_KEY=AIzaSy_your_key_here
```

### Database Setup

```bash
# Apply schema to your Neon database
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio GUI
npx prisma studio
```

### Start the Server

```bash
npm run dev    # Development with nodemon auto-restart
npm start      # Production (node app.js)
```

API runs at **http://localhost:3000**.

---

## 📁 Project Structure

```
backend/
│
├── 📂 controllers/
│   ├── authController.js          # registerUser, loginUser, logoutUser
│   ├── submissionController.js    # submitCode → creates Review + CodeFiles → fires pipeline
│   ├── reviewController.js        # createReview, getReviews, getReviewById, deleteReview
│   ├── historyController.js       # getReviewHistory (paginated/filtered), deleteReview
│   ├── dashboardController.js     # getDashboardData (aggregate stats + recent reviews)
│   ├── staticController.js        # performStaticAnalysis
│   ├── complexityController.js    # generateComplexityReport
│   └── aiController.js            # performAIReview
│
├── 📂 middlewares/
│   └── authMiddleware.js          # isLoggedIn: verifies JWT cookie → attaches req.user
│
├── 📂 routes/
│   ├── authRoutes.js              # POST /auth/register, /auth/login, /auth/logout
│   ├── reviewRoutes.js            # GET|POST /reviews, GET|DELETE /reviews/:id
│   ├── submissionRoutes.js        # POST /submissions (multer.array('files', 10))
│   ├── historyRoutes.js           # GET /history, DELETE /history/:reviewId
│   ├── dashboardRoutes.js         # GET /dashboard
│   ├── staticRoutes.js            # POST /static/:reviewId/analyze-static
│   ├── complexityRoutes.js        # POST /complexity/:reviewId/analyze-complexity
│   └── aiRoutes.js                # POST /ai/:reviewId/analyze-ai
│
├── 📂 services/
│   ├── aiService.js               # buildPrompt() + callGemini() + parseResponse()
│   └── pipelineService.js         # runFullPipeline(reviewId): orchestrates all 4 stages
│
├── 📂 lib/
│   └── prisma.js                  # Prisma Client singleton (exported as { prisma })
│
├── 📂 prisma/
│   ├── schema.prisma              # Full DB schema (7 models, 4 enums)
│   └── 📂 migrations/             # Auto-generated migration history
│
├── app.js                         # Express setup: CORS, middleware, route mounting, listen
├── prisma.config.js               # Prisma config (schema path + datasource URL from env)
├── jsconfig.json                  # VS Code JS intellisense (no strict TS checking)
└── package.json                   # scripts: start, dev, postinstall (prisma generate)
```

---

## 🔌 API Reference

The Express app mounts routes without an `/api` prefix. All protected routes require the `token` httpOnly cookie (set at login).

### 🔐 Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Create account. Body: `{ name, email, password }` |
| `POST` | `/auth/login` | ❌ | Login. Body: `{ email, password }`. Sets `token` cookie. |
| `POST` | `/auth/logout` | ✅ | Clears the `token` cookie. |

### 📤 Submissions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/submissions` | ✅ | Submit code for analysis. Multipart body. Triggers async pipeline. |

**Multipart fields:**

| Field | Type | When |
|---|---|---|
| `title` | string | always |
| `submissionType` | `PASTED_CODE` \| `FILE_UPLOAD` | always |
| `language` | string | `PASTED_CODE` only |
| `pastedCode` | string | `PASTED_CODE` only |
| `files` | file[] (max 10 × 5MB) | `FILE_UPLOAD` only |

### 📋 Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/reviews` | ✅ | Create a review record |
| `GET` | `/reviews` | ✅ | List all reviews for current user |
| `GET` | `/reviews/:id` | ✅ | Full review with `codeFiles`, `staticAnalysis`, `complexityReport`, `aireview`, `findings` |
| `DELETE` | `/reviews/:id` | ✅ | Delete review + cascade all child records |

### 📜 History

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/history` | ✅ | Paginated + filtered history |
| `DELETE` | `/history/:reviewId` | ✅ | Delete a specific review |

**Query params for `GET /history`:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 10) |
| `search` | string | Search `title` or `language` (case-insensitive) |
| `status` | string | `PENDING` \| `ANALYZING` \| `AI_REVIEW` \| `COMPLETED` \| `FAILED` |
| `language` | string | e.g. `javascript`, `python` |
| `submissionType` | string | `PASTED_CODE` \| `FILE_UPLOAD` |

### 📊 Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard` | ✅ | Returns `{ stats, recentReviews }` aggregate for the logged-in user |

### ⚙️ Internal Pipeline Triggers

> These are called internally by `pipelineService.js`. You don't need to call them directly.

| Method | Path | Description |
|---|---|---|
| `POST` | `/static/:reviewId/analyze-static` | Run regex-based static analysis on all `CodeFile`s |
| `POST` | `/complexity/:reviewId/analyze-complexity` | Calculate cyclomatic complexity metrics |
| `POST` | `/ai/:reviewId/analyze-ai` | Send code to Gemini; save `AIReview` + `Finding[]` |

---

## 🗄️ Database Schema

Full schema is in [`prisma/schema.prisma`](./prisma/schema.prisma). See the [root README ER diagram](../README.md#️-database-schema) for a visual representation.

### Models Summary

| Model | Primary Key | Key Relations |
|---|---|---|
| `User` | `id` (UUID) | has many `Review` |
| `Review` | `id` (UUID) | belongs to `User`; has many `CodeFile`, `Finding`; has one `StaticAnalysis`, `ComplexityReport`, `AIReview` |
| `CodeFile` | `id` (UUID) | belongs to `Review` |
| `StaticAnalysis` | `id` (UUID) | one-to-one with `Review` |
| `ComplexityReport` | `id` (UUID) | one-to-one with `Review` |
| `AIReview` | `id` (UUID) | one-to-one with `Review` |
| `Finding` | `id` (UUID) | belongs to `Review` |

### Enums

| Enum | Values |
|---|---|
| `SubmissionType` | `PASTED_CODE`, `FILE_UPLOAD` |
| `ReviewStatus` | `PENDING`, `ANALYZING`, `AI_REVIEW`, `COMPLETED`, `FAILED` |
| `FindingSource` | `STATIC_ANALYSIS`, `AI_MODEL` |
| `Severity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

All relations use `onDelete: Cascade` — deleting a `User` removes all their reviews, and deleting a `Review` removes all its files, analysis records, and findings.

**Database hosted on [Neon](https://neon.tech)** — serverless PostgreSQL with scale-to-zero compute. Connect via the `DATABASE_URL` connection string (must include `?sslmode=require`).

---

## 🤖 AI Pipeline

`pipelineService.js` exports `runFullPipeline(reviewId)`. It is called in `submissionController.js` with no `await` — it runs asynchronously after the HTTP 201 response is already sent.

```
runFullPipeline(reviewId)
│
├── Stage 1: UPDATE Review status = ANALYZING
│   ├── Fetch all CodeFile content from DB
│   ├── Run static analysis (regex patterns for issues)
│   └── INSERT StaticAnalysis { summary, rawOutput }
│
├── Stage 2: (still ANALYZING)
│   ├── Calculate cyclomatic complexity per function
│   └── INSERT ComplexityReport { cyclomaticComplexity, linesOfCode, ... }
│
├── Stage 3: UPDATE Review status = AI_REVIEW
│   ├── aiService.buildPrompt(codeFiles, staticResults)
│   ├── @google/genai → generateContent(prompt)
│   ├── Parse JSON response: { score, summary, strengths, weaknesses, findings[] }
│   ├── INSERT AIReview { reviewJson }
│   └── INSERT Finding[] (source=AI_MODEL, severity, type, title, description)
│
└── Stage 4: UPDATE Review { status=COMPLETED, overallScore, summary }

On any error → UPDATE Review { status=FAILED }
```

The frontend polls `GET /reviews/:id` every 2 seconds and navigates to `/report/:id` when it receives `status: "COMPLETED"`.

---

## 🔐 Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string | `postgresql://...neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | ✅ | Secret for signing/verifying JWTs (min 32 chars) | `a64charrandomhex...` |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key | `AIzaSy_...` |
| `PORT` | ⬜ | Port to listen on | `3000` |
| `NODE_ENV` | ⬜ | Environment (`development`/`production`) | `development` |

---

## 📜 Available Scripts

```bash
npm start         # node app.js (production)
npm run dev       # nodemon app.js (auto-restart on file change)

# Prisma
npx prisma migrate dev   # Apply schema changes + generate new migration
npx prisma generate      # Regenerate Prisma Client (runs automatically via postinstall)
npx prisma studio        # Open Prisma Studio GUI at http://localhost:5555
```

> No TypeScript compilation required. The server runs directly via `node app.js` as ESM JavaScript.
