# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Security Scanner Web Panel (v2.0.0) — a FastAPI + React/TypeScript application for managing security scanning operations. Two services: a Python backend API and a React frontend SPA. Uses SQLite (auto-created, no external DB needed). See `README.md` and `security-scanner/README.md` for full documentation.

### Running services locally (without Docker)

**Backend (FastAPI):**
```bash
cd /workspace/security-scanner/src
uvicorn web.backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Creates SQLite DB at `security-scanner/src/web/data/scanner.db` on first start.
- Creates default admin user: `admin` / `admin123`.
- Requires `config.py` symlink in `security-scanner/src/` pointing to `scanner/core/config.py` (for the `/api/settings` endpoint).

**Frontend (Vite dev server):**
```bash
cd /workspace/security-scanner/src/web/frontend
npx vite --host 0.0.0.0 --port 3000
```
- Vite proxy is configured to forward `/api` requests to `http://backend:8000`.
- Requires `/etc/hosts` entry: `127.0.0.1 backend` (already set up in the VM snapshot).

### Gotchas

- **ESLint config missing:** The repo's `package.json` defines a lint script (`eslint . --ext ts,tsx`) but no `.eslintrc.*` config file exists. `npm run lint` will fail. TypeScript type checking (`npx tsc --noEmit`) works fine.
- **Backend module imports:** The backend uses `backend.app.*` import paths. The `sys.path.append` in `main.py` adds the `web/` directory to Python path, making these imports resolve. Always run uvicorn from the `security-scanner/src/` directory.
- **`import config` in settings endpoint:** The `/api/settings` endpoint does `import config` at runtime. In Docker, `config.py` is volume-mounted to `/app/config.py`. Locally, a symlink from `security-scanner/src/config.py` to `scanner/core/config.py` is needed.
- **Scanner tools (subfinder, nmap, nuclei) are NOT required** for running the web panel. They are only needed for actual scanning operations. The UI, auth, dashboards, scheduling CRUD, and report viewing all work without them.

### Lint / type-check / build

| Check | Command | Working directory |
|-------|---------|-------------------|
| TypeScript | `npx tsc --noEmit` | `security-scanner/src/web/frontend` |
| Frontend build | `npm run build` | `security-scanner/src/web/frontend` |
| ESLint | _(missing config — see Gotchas)_ | — |

### Default credentials

- Username: `admin`, Password: `admin123`
