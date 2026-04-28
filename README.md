# Fall Protection Inspection App

Mobile-friendly daily fall protection inspection form with:

- one shared form link for workers
- browser draft autosave
- PDF generation on submit
- automatic Dropbox upload for completed inspections

## Stack

- Node.js + Express
- Vanilla HTML/CSS/JS frontend
- `pdf-lib` for PDF generation
- Dropbox API upload using Node's built-in `fetch`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your Dropbox token if you want uploads enabled.

3. Start the app:

```bash
npm start
```

4. Open `http://localhost:3000`

## Dropbox setup

Recommended production setup: use Dropbox refresh-token auth so uploads keep working without manually rotating access tokens. Set:

- `DROPBOX_APP_KEY`
- `DROPBOX_APP_SECRET`
- `DROPBOX_REFRESH_TOKEN`
- `DROPBOX_ROOT_PATH`

Fallback setup: if you only want quick testing, you can still set:

- `DROPBOX_ACCESS_TOKEN`
- `DROPBOX_ROOT_PATH`

Completed PDFs are uploaded into dated folders like:

`/Safety/Fall Protection Inspections/2026/04/fall-inspection_2026-04-24_project_inspector.pdf`

If Dropbox credentials are not set, the app still works and saves the generated PDF locally under `output/`.

## Dropbox refresh token setup

For long-running hosting on Render, use a refresh token instead of a short-lived access token.

1. Create a Dropbox app with the file scopes you need.
2. Note your app key and app secret from the Dropbox App Console.
3. Authorize the app with offline access so Dropbox returns a refresh token.
4. Add these in Render:
   - `DROPBOX_APP_KEY`
   - `DROPBOX_APP_SECRET`
   - `DROPBOX_REFRESH_TOKEN`
   - `DROPBOX_ROOT_PATH`

When these three refresh-token variables are present, the app automatically fetches a fresh access token before each upload.

## Render deployment

1. Push this project to GitHub.
2. Create a new Render Web Service from the repo.
3. Render can use the included `render.yaml`, or you can configure manually:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables in Render:
   - `DROPBOX_ACCESS_TOKEN`
   - `DROPBOX_ROOT_PATH`

## Notes

- Draft autosave is stored in the browser with `localStorage`.
- The generated PDF is a clean inspection report based on the checklist structure. It is not a pixel-perfect overlay on the original PDF template yet.
