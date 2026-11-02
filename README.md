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

Until the employee database is connected, a demo bar switches between two kinds of user: a colleague and an administrator (HR). A division preview in the header lets you try the filter for other teams. Set `MINTEKEAR_DIRECTORY=employee` when the directory is ready. The connection point is `lookupEmployee` in [`lib/directory.ts`](lib/directory.ts). It should return only the person's division and which privileges they have (`canReadComments`, `canViewAnalysis`, `canDownloadReport`, `isAdmin`). It must not pass a name, staff number, email, or device into the review save.

Colleagues see scores and traits for managers in their own division. They do not see the written comments. People who work in Human Resources and are not administrators are colleagues: they see the same thing. An administrator (HR) already has comments, Analysis, download, and the Access page. On `/admin` they can grant those privileges to a colleague. A grant does not create another kind of user.

On the same Access page, the administrator picks which Analysis graphs are shown (overview totals, division scores, score mix, needs attention, trait frequency, the division table, and managers by division). A sensible default set is on so demos still show charts. People with Analysis access only see the graphs the administrator left enabled. Charts stay anonymous — they never name a reviewer.

## Review policy and moderation

Posting a review requires accepting the review policy (see `/policy`). The form checkbox must be on before the server accepts the post.

An administrator (HR), or a colleague they have allowed to read comments, can hide a review that breaks the policy, or restore it later. A hidden review drops out of public scores, trait counts, feeds, and Analysis. Hiding does not reveal who wrote it — there is no author on the review row.

## What a review stores

A review row has the manager, the score, the words, the traits, the calendar day in Johannesburg, and whether it has been hidden. It does not store a clock time, a person, a staff number, an IP address, or a computer. Do not add request logging that keeps those details for the review route.

## Set up for another company

One deployment is one organisation. Edit [`company.json`](company.json):

- `name` — the organisation, shown on each manager
- `appName` — the product name in the header
- `tagline` — the line under “Manager reviews”
- `logo` — the header logo, a path inside `public`, for example `/brand/acme-logo.png`
- `mark` — optional smaller symbol used on each manager card. If you leave it out, the logo is used there too.
- `colors` — `#rrggbb` values for the bar, buttons, text, page, and accents

Put the logo file in `public/brand/` and restart. Score colours stay red, amber, and green so a low score reads the same way for every customer.

The first screen is a feed of managers in your division, newest review first, including people who still have no reviews. A card opens that person's reviews, grouped by year with the latest first. “Write a review” lists managers in that same division, lets you search by name, and posts anonymously. You cannot add a manager by typing a name that is not already listed. Low scores read as “Needs attention”. Until the employee directory is connected, the demo bar is labelled Demo · viewing as, and it switches between Colleague and Administrator (HR).
