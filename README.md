<div align="center">

# 🖥️ LUMUS — Backend

### *Node.js + Express + Prisma + Gemini AI REST API*

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

> Part of the [LUMUS monorepo](../README.md). See the root README for the full project overview.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#️-architecture)
- [Tech Stack](#️-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [AI Pipeline](#-ai-pipeline)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)

---

## 🔍 Overview

The LUMUS backend is a **Node.js + Express 5** REST API that handles user authentication, code submission intake, a multi-stage AI analysis pipeline, and data retrieval for the React frontend.

It uses **Prisma ORM** with **PostgreSQL** for type-safe database access and **Google Gemini AI** (`@google/genai`) to perform deep code analysis. The backend is designed as a pure ESM module project (`"type": "module"` in `package.json`) with no TypeScript compilation step — just clean, modern JavaScript running directly on Node.js.

---

## 🏗️ Architecture

```
Client Request
    │
    ▼
┌─────────────────────────────────────────┐
│              Express Router             │
│  /api/auth  /api/submissions            │
│  /api/reviews  /api/history             │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│           verifyToken Middleware        │
│      (JWT validation + req.user)        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│             Controllers                 │
│  authController  submissionController   │
│  reviewController  historyController    │
│  complexityController                   │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌────────────────────────┐
│ Prisma ORM   │  │   pipelineService.js   │
│ (PostgreSQL) │  │  (AI Analysis Runner)  │
└──────────────┘  └──────────┬─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  aiService.js   │
                    │  Google Gemini  │
                    └─────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js 22 (ESM modules) |
| **Framework** | Express 5 |
| **Database ORM** | Prisma 7 |
| **Database** | PostgreSQL 16 |
| **AI Engine** | Google Gemini AI (`@google/genai`) |
| **Auth** | JWT (`jsonwebtoken`) + bcrypt |
| **File Uploads** | Multer |
| **Cookie Parsing** | cookie-parser |
| **Env Vars** | dotenv |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= **18.0.0**
- A running **PostgreSQL** database
- A **Google AI Studio** API key

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create a `.env` file in the `/backend` directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME"

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars

# Google Gemini AI
GEMINI_API_KEY=your_google_ai_studio_key_here
```

### Database Setup

```bash
# Push the Prisma schema to your database
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to browse your data
npx prisma studio
```

### Start the Server

```bash
npm run dev    # Development (with nodemon auto-restart)
npm start      # Production
```

The API will be running at **`http://localhost:3000`**.

---

## 📁 Project Structure

```
backend/
├── 📂 controllers/                 # Route handler logic (thin layer)
│   ├── authController.js           # register, login, logout, getMe
│   ├── submissionController.js     # createSubmission (triggers pipeline)
│   ├── reviewController.js         # getReview (single review + full data)
│   ├── historyController.js        # getReviewHistory, deleteReview
│   └── complexityController.js     # getComplexityData
│
├── 📂 middlewares/
│   └── verifyToken.js              # JWT verification; attaches req.user
│
├── 📂 routes/                      # Express router definitions
│   ├── auth.js                     # POST /login, /register, /logout + GET /me
│   ├── submissions.js              # POST /submissions
│   ├── reviews.js                  # GET /reviews/:id
│   └── history.js                  # GET /history, DELETE /reviews/:id
│
├── 📂 services/                    # Business logic layer
│   ├── aiService.js                # Gemini AI prompt construction & response parsing
│   └── pipelineService.js          # Orchestrates the full 4-stage analysis pipeline
│
├── 📂 lib/
│   └── prisma.js                   # Prisma Client singleton export
│
├── 📂 prisma/
│   ├── schema.prisma               # Full database schema definition
│   └── 📂 migrations/              # Auto-generated migration history
│
├── app.js                          # Express app: middleware, routes, error handler
├── jsconfig.json                   # VS Code JS intellisense config (no strict TS checking)
└── package.json
```

---

## 📡 API Reference

All routes are prefixed with `/api`. Protected routes require a valid JWT cookie (`token`).

### 🔐 Auth — `/api/auth`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ❌ | Create a new user account |
| `POST` | `/login` | ❌ | Log in and receive a JWT cookie |
| `POST` | `/logout` | ✅ | Clear the JWT cookie |
| `GET` | `/me` | ✅ | Get the current authenticated user |

### 📤 Submissions — `/api/submissions`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/submissions` | ✅ | Submit code (paste or files); triggers the AI pipeline asynchronously |

**Body** (multipart/form-data):
- `title` — Review title
- `submissionType` — `PASTED_CODE` or `FILE_UPLOAD`
- `language` — Language ID (for pasted code)
- `pastedCode` — The code string (for pasted code)
- `files[]` — File attachment(s) (for file upload)

### 📋 Reviews — `/api/reviews`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/reviews/:id` | ✅ | Get a full review with all analysis data |
| `DELETE` | `/reviews/:id` | ✅ | Delete a review and all cascaded data |

### 📜 History — `/api/history`

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/history` | ✅ | Get paginated + filtered review history |

**Query Params for `/history`**:

| Param | Type | Example | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Results per page |
| `search` | string | `"my-app"` | Search by title or language |
| `status` | string | `"COMPLETED"` | Filter by review status |
| `language` | string | `"javascript"` | Filter by language |
| `submissionType` | string | `"PASTED_CODE"` | Filter by submission type |

---

## 🗄️ Database Schema

The database uses the following main models (see [`prisma/schema.prisma`](./prisma/schema.prisma) for the full definition):

```
User
 └─ Review (1:N)
     ├─ CodeFile (1:N)           — Uploaded/pasted source files
     ├─ CodeAnalysis (1:1)       — AI review JSON output
     ├─ Finding (1:N)            — Individual bugs/warnings/suggestions
     └─ ComplexityResult (1:N)   — Per-file complexity metrics
```

**Review Statuses:** `PENDING` → `ANALYZING` → `AI_REVIEW` → `COMPLETED` | `FAILED`

---

## 🤖 AI Pipeline

When a submission is received, `submissionController` creates the database records and immediately fires `runFullPipeline()` from `pipelineService.js` **asynchronously** (fire-and-forget). The HTTP response returns immediately with the newly created review ID and `PENDING` status, and the frontend polls `/api/reviews/:id` every 2 seconds.

The pipeline stages:

```
Stage 1: ANALYZING
  └─ Static analysis on each CodeFile
     (line count, comment ratio, issue detection via regex patterns)

Stage 2: ANALYZING (continued)
  └─ Cyclomatic complexity calculation per function

Stage 3: AI_REVIEW
  └─ aiService.js builds a structured prompt with all code content
  └─ Sends to Google Gemini API (gemini-2.0-flash-lite)
  └─ Parses JSON response into:
       - overallScore (0–100)
       - executiveSummary
       - strengths[] / weaknesses[]
       - suggestions[]
       - findings[] (bugs, security, performance, style)

Stage 4: COMPLETED
  └─ All results saved to DB via Prisma
  └─ Review status updated to COMPLETED
```

On any unhandled error, the status is set to `FAILED`.

---

## 🔐 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) | `a-long-random-string` |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIza...` |
| `PORT` | Port to listen on (default: `3000`) | `3000` |
| `NODE_ENV` | Environment mode | `development` / `production` |

---

## 📜 Available Scripts

```bash
npm start      # Start with node (production)
npm run dev    # Start with nodemon (auto-restart on file change)
```

> **Note:** There is no TypeScript compilation step. The backend runs as plain ESM JavaScript directly on Node.js.
