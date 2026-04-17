# Workaholic

Workaholic is a Chrome extension that continuously monitors freelance job platforms, applies your personal filters locally, and alerts you when new matching jobs appear.

## What It Does

- Aggregates jobs from multiple platforms
- Filters by your profile (skills, blacklist, budget, enabled sites)
- Scores match quality
- Notifies you only about unseen matching jobs
- Runs automatically in the background at your selected interval

## Supported Platforms

- Upwork
- Workana
- 99Freelas
- LinkedIn
- Indeed (BR)
- Gupy

## Install in Chrome (Developer Mode)

1. Download or clone this project.
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder.

Notes:

- If your local structure has an `extension/` wrapper folder, select that folder.
- In the current repository layout, load the project root.

## First-Time Setup

1. Click the Workaholic icon in Chrome.
2. Open the `Perfil` tab.
3. Add your skills.
4. Choose your area.
5. Set minimum budget and currency (optional).
6. Add blacklist terms (optional).
7. Enable the platforms you want to monitor.
8. Choose `Frequência de busca` (default is 1 minute).
9. Click `Salvar`.

## How to Use

1. Open the `Vagas` tab.
2. Click `Buscar agora` for an immediate scan.
3. Review the job cards:
	 - clickable title
	 - platform badge
	 - match score
	 - budget (when available)
	 - posted date
4. Keep Chrome open to allow automatic background scans.

## Notifications and Matching Rules

- Jobs are normalized into a single schema.
- Jobs are filtered in this order:
	- site enabled
	- blacklist exclusion
	- minimum budget
	- score threshold (minimum 40)
- Only unseen matching jobs trigger notifications.
- The extension icon badge shows the number of new jobs found in the latest cycle.

## Troubleshooting

### Extension does not update jobs

1. Open `chrome://extensions`.
2. Click `Reload` on Workaholic.
3. Open the popup and click `Buscar agora`.

### Service worker registration failed

Reload the extension in `chrome://extensions`. If the error persists, open `Errors` and check the latest stack trace.

### No jobs found

- Confirm your selected sites are enabled in `Perfil`.
- Remove overly strict filters (skills, blacklist, budget).
- Use `Buscar agora` to force a new cycle.

## Privacy

- Filtering is local.
- No external backend is required for matching logic.
- Profile and job state are stored in Chrome extension storage.

## For Developers

- Run tests:
	- `npm test`
	- `npm run test:coverage`
- Core directories:
	- `background/` background scheduling and orchestration
	- `popup/` user interface
	- `parsers/` pure HTML parsers per platform
	- `scrapers/` content scripts per platform
	- `shared/` normalization, filtering, and storage
	- `tests/` automated tests and fixtures

## License

MIT
