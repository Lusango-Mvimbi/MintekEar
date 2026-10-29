# MintekEar

Anonymous reviews of managers at one organisation. This copy is set up for Mintek. Reviews are about the manager, not the organisation. Nobody signs in, and a review does not store the writer's name.

Example managers are included so the feed is not empty. They are fictional. They are marked Example in the app.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Requires Node.js 22.5 or newer. The app uses Node's built-in SQLite, which still needs the experimental flag. The npm scripts set that flag.

```bash
npm test
npm run build
```

Reviews are stored in `data/mintekear.db`. That file is created on first launch and is not committed. Delete it and restart to return to the example managers. Deleting it also removes reviews people have posted.

## Set up for another company

One deployment is one organisation. Edit [`company.json`](company.json):

- `name` — the organisation, shown on each manager
- `appName` — the product name in the header
- `tagline` — the line under “Manager reviews”
- `logo` — the header logo, a path inside `public`, for example `/brand/acme-logo.png`
- `mark` — optional smaller symbol used on each manager card. If you leave it out, the logo is used there too.
- `colors` — `#rrggbb` values for the bar, buttons, text, page, and accents

Put the logo file in `public/brand/` and restart. Score colours stay red, amber, and green so a low score reads the same way for every customer.

The first screen is a feed of managers, newest review first. A card opens that person's reviews. “Write a review” posts anonymously against someone already listed, or adds a manager by name and role.
