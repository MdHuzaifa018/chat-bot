# SupportAI Portal

Next.js App Router frontend for clients and administrators. Client sessions, admin accounts, website settings, requests, and team permissions are managed through the Express API; the browser keeps the session in an HttpOnly cookie and does not persist app state in localStorage.

## Routes

- `/` — client username/access-code sign-in.
- `/request-access` — public client access request form.
- `/dashboard` — authenticated client's website scanner, chatbot settings, Q&A and live preview.
- `/dashboard/setup-code` — authenticated embed code, loaded from the client's saved chatbot configuration.
- `/admin/login` — administrator/team sign-in.
- `/admin`, `/admin/requests`, `/admin/permissions` — permission-protected admin workspace.

Copy `.env.example` to `.env.local`; `NEXT_PUBLIC_API_URL` should point to the backend API root, including `/api` (default `http://localhost:5000/api`). Run with `npm run dev`.


pIrRtxUZFKaYgJ6MHMVk3ai6UtWrwNmk 