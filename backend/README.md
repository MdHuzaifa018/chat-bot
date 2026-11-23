# SupportAI API

Express and TypeScript API. Supabase is accessed server-side with the service-role key; Gemini generates replies grounded in a tenant's crawled website content. Account authentication uses hashed passwords/access codes and opaque HttpOnly cookie sessions.

## Run

```bash
npm install
copy .env.example .env.local
npm run dev
```

Apply migrations from `supabase/migrations/` in filename order before starting the API. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. On the first start, set `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters; after the super-admin row exists, those bootstrap values may be removed. Set `GEMINI_API_KEY` to enable generated replies and questions. Without it, the crawler still stores website data and the chat returns a clearly marked safe fallback response.

The default API is `http://localhost:5000/api`. Set `ALLOWED_ORIGIN` to the exact frontend origin. For cross-site HTTPS deployment set `SESSION_COOKIE_SAME_SITE=none`.

## Route groups

- `/api/health` — backend and database health.
- `/api/auth/*` — client access request, client/admin login, current session, logout.
- `/api/websites/*` — client-owned website creation, listing, configuration, suggested questions/answers, knowledge docs, and recrawl.
- `/api/admin/*` — admin overview, access-request decisions, and team management. Routes enforce account permissions on the server.
- `/api/widget/:publicId/*` — public configuration, visitor sessions, and chat; each request checks the website origin and session.
- `/api/session/*` and `/api/chat/*` — legacy visitor chat endpoints retained for existing clients.

## Session and data boundaries

The cookie contains an opaque random token with `HttpOnly`; Supabase stores only its SHA-256 hash and expiration. Client website queries always include the authenticated `client_account_id`. Admin credentials and client access codes are stored as scrypt hashes. Login and public widget endpoints use the shared database-backed rate limiter. Browser roles have no table grants; only the backend service role accesses account and tenant tables.
