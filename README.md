# Secure File Transfer Monitoring System (Vercel Ready)

This version is built for Vercel deployment with serverless APIs and cloud database storage.

## Important Architecture Note
- Vercel does not run a continuous background filesystem watcher (`watchdog`) like local Python scripts.
- So this app uses API-based realtime logging:
  - Any file action event (create/edit/move/delete) is sent to `/api/events`.
  - Events are stored in DB.
  - Alert rules run on insert.
  - Dashboard auto-refreshes every 5 seconds.

## Tech Stack
- Next.js 14 (App Router)
- Vercel Serverless Functions (API routes)
- Vercel Postgres (`@vercel/postgres`)

## Project Structure
- `app/page.js` -> dashboard UI
- `app/api/events/route.js` -> create/list events
- `app/api/alerts/route.js` -> list alerts
- `app/api/summary/route.js` -> cards + counts
- `lib/db.js` -> DB schema + alert policy logic

## Local Run
1. Install:
```bash
npm install
```
2. Add env:
```bash
POSTGRES_URL=your_vercel_postgres_url
```
3. Start:
```bash
npm run dev
```
4. Open:
`http://localhost:3000`

## Deploy on Vercel
1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add environment variable:
   - `POSTGRES_URL`
4. Attach Vercel Postgres database.
5. Deploy.

## Realtime Usage
1. Open dashboard.
2. Install and run the Windows agent installer on endpoint machines.
3. Agent sends file events to `/api/events` automatically.
4. If policy matches suspicious movement (example: restricted extension moved to `usb/onedrive/dropbox/network`), alert is auto-created.
5. Dashboard shows:
   - Total events
   - Total alerts
   - Event type counts
   - Recent alerts/events (IST time)

## EXE Auto Build (GitHub Actions)
The repository includes a workflow that builds `SFTMSAgentSetup.exe` automatically.

1. Push to `main`, or run workflow manually from **Actions** tab:
   - `Build SFTMS Agent Installer`
2. Open the workflow run.
3. Download artifact:
   - `SFTMSAgentSetup`

Output file:
- `SFTMSAgentSetup.exe`

Optional direct download setup:
- Set environment variable `AGENT_EXE_URL` in Vercel to a direct hosted `.exe` link.
- Dashboard `Download Agent EXE` button will use that URL.
- If not set, it falls back to `/downloads/SFTMSAgentSetup.exe`.

## Store EXE In Database
You can store installer EXE directly in Postgres and serve it from API.

Required env:
- `AGENT_UPLOAD_KEY` (secret key for upload endpoint)

Upload API:
- `POST /api/agent-exe`
- Header: `x-agent-upload-key: <AGENT_UPLOAD_KEY>`
- JSON body:
```json
{
  "file_name": "SFTMSAgentSetup.exe",
  "version": "1.0.0",
  "mime_type": "application/vnd.microsoft.portable-executable",
  "base64_data": "<base64-of-exe>"
}
```

Download flow:
- `GET /api/download-agent-exe`
- If DB binary exists, it serves that first.

## Production Integration (Recommended)
If you want truly automatic endpoint hits on real machine file changes:
- Run the included local agent from a Windows machine.
- Agent detects create/edit/move/delete and POSTs to Vercel API (`/api/events`).
- This keeps Vercel app scalable and DB-centralized.

### Local Agent Setup (Automatic Realtime)
1. Install Python deps:
```bash
pip install -r requirements.txt
```
2. Edit config:
- `config/agent.json`
- set `api_base_url` to your deployed Vercel URL
- set `watch_paths` to real folders you want to monitor
3. Run agent:
```bash
python src/local_agent.py --config config/agent.json
```
4. Open dashboard on Vercel and perform file actions in watched folders.
5. Events + alerts appear automatically.
