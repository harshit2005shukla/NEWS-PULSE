# News Pulse — Fix, Local Setup, Render Deployment & GitHub

## 1. Fix the current PostgreSQL authentication error

The old project assumed this database URL:

`postgresql://postgres:postgres@127.0.0.1:5432/app_db`

If the PostgreSQL installed on Windows uses another password, that URL fails with `password authentication failed`.

This project now includes a Docker PostgreSQL instance on **host port 5433** so it does not conflict with an existing local PostgreSQL service.

### Local Docker setup

```powershell
Copy-Item .env.example .env
npm install

docker compose up -d db
npx drizzle-kit push
npm run dev
```

Open `http://localhost:3000`.

The database used by the local Next.js process is:

`postgresql://postgres:postgres@127.0.0.1:5433/app_db`

### Populate the dashboard

Use the dashboard's **Refresh Data** action. It starts the Python ingestion pipeline and stores the fetched articles/clusters in PostgreSQL.

If Python dependencies are not installed yet:

```powershell
cd scraper
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd ..
```

## 2. Production deployment on Render

This repository includes `Dockerfile` and `render.yaml`.

1. Push the project to GitHub.
2. In Render, create a Blueprint from the repository.
3. Render will create:
   - `newspulse` Docker web service
   - `newspulse-db` PostgreSQL database
4. `DATABASE_URL` is connected automatically from the Render database.
5. The Docker entrypoint runs Drizzle schema sync before starting Next.js.
6. Health check: `/api/health`

The web service listens on Render's `PORT` and the container exposes port 3000.

## 3. GitHub

For a new repository:

```powershell
git init
git add .
git commit -m "Fix PostgreSQL setup and production deployment"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

Do **not** commit `.env`. It is ignored by `.gitignore`.

## 4. Important production environment variables

Render should have:

- `DATABASE_URL` — supplied by Render PostgreSQL
- `NODE_ENV=production`
- `PYTHON_PATH=python3`
- `DATABASE_SSL=false` when using Render's internal database connection

## 5. What was fixed

- Removed the fragile hard-coded production/local database fallback.
- Added explicit PostgreSQL connection validation and pool timeouts.
- Added optional PostgreSQL SSL support through `DATABASE_SSL=true`.
- Added a production Dockerfile containing both Node.js and Python.
- Added Docker startup schema synchronization with Drizzle.
- Added a Docker PostgreSQL service isolated on host port 5433.
- Added Render Blueprint configuration.
- Added Docker health checking and application health endpoint support.
