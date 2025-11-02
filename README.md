# Govinda Pariwar Finance (GPFR)

Simple Node + static frontend app to manage members, payments and expenses.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the server (default port 3000):

```bash
npm start
# or set a different port
PORT=3001 npm start
```

3. Open the frontend in your browser:

- If you serve files via the server: open `http://localhost:3000` (the server serves `index.html` from the project root).
- Or open `index.html` directly in the browser (file://). When the server is running, the frontend will attempt to fetch `http://localhost:3000/api/data`.
 - Or open `index.html` directly in the browser (file://). When the server is running, the frontend will attempt to fetch `/api/data` (the app prefers same-origin requests so it works regardless of port).

### SQLite / production notes

This project can use SQLite for persistence. If `better-sqlite3` is installed, the server will create `gpfr.db` and persist data there. On Windows you may need either:

- Volta + Node 18 (recommended for quick local setup since many native modules have prebuilt binaries), or
- Visual Studio Build Tools with "Desktop development with C++" if you want to build native modules on Node 22+.

Quick steps (what I used during development):

```bash
# (optional) install Volta and switch to Node 18
volta install node@18

# install deps
npm install

# start server (example using port 3001)
PORT=3001 npm start
```

When the server first runs it will migrate any `data.json` contents into `gpfr.db` (if `better-sqlite3` is available) and continue serving the app.

## Exporting and backing up data

You can download a JSON export of the current dataset from the running server:

```bash
# download export to a file
curl -sS http://localhost:3000/api/export -o gpfr-export.json
# or if running on custom port
curl -sS http://localhost:3001/api/export -o gpfr-export.json
```

The export contains `members`, `payments` and `expenses` in the same shape the app uses.

## What changed / important notes

- The server (`server.js`) now reads/writes a `data.json` file in the project root. This makes POSTed data persistent across server restarts.
- The server also serves static files from the project root so the frontend and backend can be hosted as a single service.

## Deploying from GitHub (Render example)

1. Push your repo to GitHub:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. On Render (https://render.com):
   - Create a new Web Service and connect your GitHub repo.
   - Render auto-detects Node apps; set the start command to `npm start` (it usually auto-fills).
   - Deploy. Render will build (`npm install`) and run `npm start`. Your app will be available at a public URL.

Notes about persistence on hosts
- `data.json` persists on the instance's disk while the service instance is running. However, some hosts use ephemeral filesystems or replace instances during deploys—so consider using a database (SQLite/Postgres) or object storage for production persistence.

## Next improvements (optional)
- Move to a proper database (SQLite/Postgres) for reliable storage across deploys.
- Add authentication for data safety.
- Add a CI/CD workflow (GitHub Actions) to automate deployments to your server or VPS.

If you'd like, I can:
- Implement a simple SQLite-based persistence now.
- Create a GitHub Actions workflow to deploy to a VPS.
- Help connect this repo to Render and deploy it step-by-step.
