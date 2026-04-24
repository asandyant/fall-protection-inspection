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

Create a Dropbox app and generate an access token with file upload access. Then set:

- `DROPBOX_ACCESS_TOKEN`
- `DROPBOX_ROOT_PATH`

Completed PDFs are uploaded into dated folders like:

`/Safety/Fall Protection Inspections/2026/04/fall-inspection_2026-04-24_project_inspector.pdf`

If Dropbox credentials are not set, the app still works and saves the generated PDF locally under `output/`.

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
