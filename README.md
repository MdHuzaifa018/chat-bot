# SupportAI Website Chatbot

SupportAI has a Next.js client/admin portal, an Express TypeScript API, Supabase Postgres for persistent accounts and chatbot data, and Google Gemini for website-grounded replies. Authentication is implemented by this backend using HttpOnly sessions; Clerk is not part of the runtime.

## Repository

- `frontend/` — client login and website setup, embed snippet, admin overview, access requests, and team permissions.
- `backend/` — API routes, account sessions, crawler, Gemini service, widget, and Supabase adapter.
- `backend/supabase/migrations/` — database migrations, including account authentication and client/website ownership.

## Local setup

1. Create a Supabase project and apply every SQL migration in `backend/supabase/migrations/` in filename order.
2. Copy `backend/.env.example` to `backend/.env.local`. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and an initial `BOOTSTRAP_ADMIN_EMAIL` plus `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters). Add `GEMINI_API_KEY` for generated responses.
3. Copy `frontend/.env.example` to `frontend/.env.local`. Set `NEXT_PUBLIC_API_URL` to the backend API base, normally `http://localhost:5000/api`.
4. Start each app in its own terminal:

   ```bash
   cd backend && npm install && npm run dev
   cd frontend && npm install && npm run dev
   ```

The first backend start creates the administrator from the bootstrap variables if no admin account exists. Once created, remove those bootstrap values. Clients submit an access request; an administrator reviews it and gets a one-time username/access-code result to share with the client.

For a frontend and backend on different sites, configure `ALLOWED_ORIGIN` and set `SESSION_COOKIE_SAME_SITE=none` over HTTPS so the browser can send the HttpOnly session cookie.

## Main flows

- Client access request: `POST /api/auth/client/request-access`
- Client sign-in: `POST /api/auth/client/login` with username and access code
- Admin sign-in: `POST /api/auth/admin/login` with email and password
- Current session / sign-out: `GET /api/auth/me`, `POST /api/auth/logout`
- Website operations: authenticated `/api/websites` endpoints
- Admin requests and team: permission-protected `/api/admin` endpoints
- Public embed chat: origin-checked `/api/widget/:publicId/*` endpoints and `/widget.js`

The browser does not store account credentials, access codes, or chatbot settings in localStorage. Dashboard data is read and written through the backend.
