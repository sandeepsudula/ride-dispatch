# Ride Dispatch website

The landing page and waitlist, hosted on Wix as a Wix Headless site.

- `index.html` – the page.
- `app.js` – renders the Wix waitlist form from its live schema (no field names in code, so fields edited in the Wix dashboard show up without a code change).
- `js/wix-forms.js` – Wix's verified Forms data layer and form store (from [wix/skills](https://github.com/wix/skills), `wix-headless-templates/forms`), bundled. The live page loads it from jsDelivr at a pinned commit.

Waitlist sign-ups arrive in the site's Wix dashboard under Forms.
