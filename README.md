# ApplyWisely

> **Top 3 Finalist — Stanford x Google DeepMind Hackathon 2026**

ApplyWisely is an AI-powered job application tracker built for serious job seekers. Instead of maintaining a spreadsheet that goes stale after a week, ApplyWisely keeps your pipeline organized automatically — paste a screenshot of any job posting and GPT-4o Vision pulls out the details, or connect your Gmail and let the AI agent watch your inbox, detect recruiter replies, interview invites, and rejections, and update your tracker in real time.

No login required. Open the app and start tracking immediately.

(This idea hasn't been implemented by the other platforms yet. Maybe I am the first one? :D)

---

## Quick Demo

- https://youtu.be/SUoUr4styGk?si=bF9neLiACFvSAEv4
  
---

## Features

### Dashboard
A real-time command center for your job search. At a glance you can see:
- Total applications submitted
- How many are in active interview stages
- Offers on the table
- Rejected applications
- A feed of recent activity across all your applications

The dashboard pulls live data from your tracker so it always reflects your current state without any manual syncing.

---

### Tracker
The core of the app. Every job application lives here, organized into five stages:

| Status | What it means |
|---|---|
| **Not Applied** | You've saved the job but haven't submitted yet |
| **Applied** | Application submitted, waiting to hear back |
| **Interview** | You're actively in the interview process |
| **Offer** | You've received a formal offer |
| **Rejected** | The application is closed |

**Adding applications — two ways:**

1. **Manual entry** — Click "Add Application", fill in company name, role, status, and any notes, and hit save. Takes about 10 seconds.

2. **Paste to Scan (AI)** — The smarter way. Find any job posting online, take a screenshot, and either:
   - Press `Ctrl+V` anywhere on the Tracker page to paste the screenshot directly, or
   - Click the upload area and select the image file

   GPT-4o Vision reads the image and automatically fills in the company name, role title, and a short notes summary. You just confirm and save. No copy-pasting from job boards.

Applications are displayed as cards you can click to expand details, edit fields, or delete entries. Status changes are one click.

---

### Gmail Agent
The most powerful feature. Connect your Google account once via OAuth and the agent does the rest:

- Scans your Gmail inbox for job-related emails
- Uses GPT-4o to classify each email (interview invite, offer, rejection, follow-up, etc.)
- Matches the email to an existing application in your tracker by company name
- Updates the application status automatically

This means if a recruiter emails you to schedule an interview, your tracker flips the card to "Interview" without you touching anything. If you get a rejection, it's logged immediately.

The Gmail connection uses Google's official OAuth2 flow — ApplyWisely only reads your emails and never stores them. Access tokens are kept in your local database only.

---

## How It Works — Architecture Overview

```
Browser (React)
     │
     │  HTTP / JSON
     ▼
FastAPI Backend  ──── PostgreSQL (your applications, user data)
     │
     ├── OpenAI GPT-4o Vision  (screenshot scanning)
     └── Gmail API             (email reading + classification)
```

- The **frontend** is a single React app (`App.jsx`). All pages — Landing, Dashboard, Tracker, Gmail Agent — live in one file with no routing library. Navigation is controlled by a `page` state variable.
- The **backend** is a FastAPI app with four routers: applications CRUD, Gmail OAuth, Gmail agent scan, and screenshot scan.
- The **database** is PostgreSQL. Tables are created automatically on first startup — no migration tool needed.
- **Authentication** is intentionally absent. The backend always operates as a single default user (`default@applywise.local`). This is a personal tool, not a multi-tenant SaaS.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19, Vite 8 | Fast dev server, minimal config |
| Backend | FastAPI (Python) | Async, automatic API docs at `/docs` |
| Database | PostgreSQL | Reliable, native enum types |
| AI — Vision | OpenAI GPT-4o-mini | Screenshot → structured job data |
| AI — Email | OpenAI GPT-4o-mini | Email classification + status mapping |
| Email | Gmail API (OAuth2) | Official, secure, read-only scopes |

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL running locally on port **5433**
  - Database name: `applywise`
  - Username: `applywise`
  - Password: `applywise`

> If you use a different PostgreSQL setup, update `DATABASE_URL` in your `.env`.

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ApplyWisely.git
cd ApplyWisely
```

---

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a file called `.env` inside the `backend/` folder with the following contents:

```env
# PostgreSQL connection
DATABASE_URL=postgresql://applywise:applywise@localhost:5433/applywise

# App secret (can be any random string for local dev)
SECRET_KEY=applywise-secret-key-change-in-production

# OpenAI — required for screenshot scanning and Gmail classification
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Google OAuth — required for Gmail agent
# Get these from Google Cloud Console → Credentials → OAuth 2.0 Client IDs
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/gmail/callback

# Frontend URL for OAuth redirect
FRONTEND_URL=http://localhost:5173
```

Start the backend server:

```bash
uvicorn main:app --reload
```

The API will be live at `http://localhost:8000`.
Interactive API docs (Swagger UI) are available at `http://localhost:8000/docs` — useful for testing endpoints directly.

> **Important:** If you update `.env` while the server is running, you must stop it (`Ctrl+C`) and restart. Environment variables are read once at startup and cached in memory.

---

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:5173`.

---

### 4. Setting up Gmail (optional)

To use the Gmail Agent feature:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Gmail API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Set the authorized redirect URI to `http://localhost:8000/gmail/callback`
6. Copy the **Client ID** and **Client Secret** into your `.env`
7. In the app, go to the Gmail Agent page and click **Connect Gmail**

---

## Project Structure

```
ApplyWisely/
├── backend/
│   ├── main.py                       # FastAPI app — registers all routers, starts DB
│   ├── database.py                   # SQLAlchemy models (User, Application), DB init
│   ├── auth.py                       # Single-user mode — always returns default user
│   ├── gmail_oauth.py                # Google OAuth2 flow (authorize, callback, disconnect)
│   ├── routers/
│   │   ├── routers_applications.py   # GET / POST / PATCH / DELETE for applications
│   │   ├── routers_gmail.py          # Gmail inbox scan + AI classification
│   │   └── routers_scan.py           # Base64 image → GPT-4o Vision → job details
│   ├── requirements.txt              # Python dependencies
│   └── .env                          # Secrets and config (git-ignored)
│
└── frontend/
    ├── src/
    │   ├── App.jsx                   # Entire React app — all pages and components
    │   └── main.jsx                  # React entry point
    ├── index.html
    └── package.json
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/applications` | List all applications |
| `POST` | `/applications` | Create a new application |
| `PATCH` | `/applications/{id}` | Update an application |
| `DELETE` | `/applications/{id}` | Delete an application |
| `POST` | `/scan/` | Scan a screenshot image (base64) via GPT-4o Vision |
| `GET` | `/gmail/authorize` | Start Gmail OAuth flow |
| `GET` | `/gmail/callback` | OAuth redirect handler |
| `POST` | `/gmail/scan` | Scan inbox and classify job emails |
| `GET` | `/health` | Health check |

Full interactive documentation at `http://localhost:8000/docs` when backend is running.

---

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2026 Dat Tang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
