# MintekEar

Anonymous reviews of managers at one organisation. This copy is set up for Mintek. Reviews are about the manager, not the organisation. Nobody signs in, and a review does not store the writer's name.

Example managers are included so the feed is not empty. They are fictional. They are marked Example in the app.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Requires Node.js 22.5 or newer. `npm run dev` works in PowerShell, Command Prompt, and on macOS or Linux. The app uses Node's built-in SQLite, and the npm scripts turn that on for you.

```bash
npm test
npm run build
```

Reviews are stored in `data/mintekear.db`. That file is created on first launch and is not committed. Delete it and restart to return to the example managers. Deleting it also removes reviews people have posted.

## Divisions and Human Resources

Each person sees reviews for their own division. The division names match the Mintek directory: Pyrometallurgy, Hydrometallurgy, Analytical Chemistry, Human Resources, and the others shown there. The lists under those names are document libraries, not extra divisions.

Until the employee database is connected, the header has a division preview so the filter can be tried. Choose Human Resources to open Analysis. Set `MINTEKEAR_DIRECTORY=employee` when the directory is ready. The connection point is `lookupEmployee` in [`lib/directory.ts`](lib/directory.ts). It should return only the person's division. It must not return a name, staff number, email, or device, and that result must not be saved with a review.

The analysis report is counts, averages, and traits by division. It is available to Human Resources.

## What a review stores

A review row has the manager, the score, the words, the traits, and the calendar day in Johannesburg. It does not store a clock time, a person, a staff number, an IP address, or a computer. Do not add request logging that keeps those details for the review route.

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
