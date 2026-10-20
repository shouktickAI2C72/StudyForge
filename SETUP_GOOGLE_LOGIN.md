# Enabling real "Continue with Google" sign-in

StudyForge ships with **email + password** sign-in working out of the box.
The **Continue with Google** button is fully wired but needs one thing only you
can create: a Google OAuth **client ID** for your own Google Cloud project.
(Anyone building the app cannot generate this for you — it must belong to your
Google account.)

Until you add it, the button is shown but reports "not configured" instead of
pretending to work — email + password keeps working the whole time.

## What this project needs (and doesn't)

StudyForge uses **Google Identity Services (the ID-token flow)** — the browser
gets a signed ID token and the backend verifies it. That means:

| Thing | Required? | Value for this project |
| --- | --- | --- |
| OAuth **client ID** (Web application) | ✅ Yes | you create it below |
| **Client secret** | ❌ No | not used — never put one in the frontend |
| **Redirect / callback URI** | ❌ No | there is no code-exchange step |
| **Authorized JavaScript origins** | ✅ Yes | `http://localhost:3000` and `http://127.0.0.1:3000` |

Origins reference the **frontend** (Next.js dev server on port `3000`), not the
backend (`127.0.0.1:8000`). The backend never talks to Google's OAuth endpoints
directly — it only verifies the token against Google's public `tokeninfo` URL.

## 1. Create an OAuth client ID (5 minutes)

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create (or pick) a project.
3. Configure the **OAuth consent screen** → User type **External** → add your
   email as a test user.
4. **Create credentials → OAuth client ID → Web application.**
5. Under **Authorized JavaScript origins**, add both:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
6. Copy the **Client ID** (looks like `1234567890-abc123.apps.googleusercontent.com`).

## 2. Give it to the backend

The backend reads `GOOGLE_CLIENT_ID` from the environment. On Windows
PowerShell, start uvicorn like this:

```powershell
$env:GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Or in Git Bash:

```bash
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com" \
  python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### Easier: set it once in a `.env` file

If you don't want to export the variable every launch, drop it in a `.env`
file instead. Copy `.env.example` to `.env` (at the project root **or** in
`backend/`) and fill in the value:

```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

The backend loads `backend/.env` and the project-root `.env` automatically on
startup. A real environment variable (the export above) always wins over the
file, so you can override it per launch when you need to.

That's it. The frontend calls `GET /auth/config`, sees Google is enabled, and
renders the real Google button automatically — no frontend rebuild needed.

## How it works

- The browser gets a signed **ID token** from Google Identity Services.
- It's sent to `POST /auth/google`.
- The backend verifies it against Google's `tokeninfo` endpoint, checks the
  audience matches your client ID, then creates/loads the user and returns a
  StudyForge session token. No external Python auth libraries required.
