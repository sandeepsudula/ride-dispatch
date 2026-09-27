# Ride Dispatch

For a driver with one car and a WhatsApp ride group. Ride Dispatch reads the group's messages ("need a ride to Austin at 5pm", "me and my roommate", "nvm found a ride"), finds passengers going to the same place at about the same time, and alerts you when a group is big enough to be worth the trip. You decide whether to go.

![Rides worth taking](docs/screenshot.png)

## Two ways to use it

| | Live (this server) | Offline (single HTML page) |
|---|---|---|
| Where messages come from | Read automatically from your WhatsApp groups as they're posted | You upload or paste WhatsApp's **Export chat** .txt |
| Alerts | Your own WhatsApp chat, phone push (free **ntfy** app), and the dashboard | The open browser tab (toast + sound) |
| Setup | Node 20+, scan one QR code | None: open `dist/ride-dispatch.html` after `npm run build` |

## Live setup

```bash
npm install
npm start
```

1. Open http://localhost:3000.
2. On your phone: WhatsApp → Settings → Linked devices → Link a device, and scan the QR code.
3. Tick your ride group under **Groups to watch**, or paste its invite link and click **Join & watch**.
4. Under **Your settings**, set your seats and the minimum number of people that makes a ride worth it.

Mac users can double-click `Start Ride Dispatch (Mac).command`; Windows users `Start Ride Dispatch (Windows).bat`. To keep it running with the terminal closed: `npx pm2 start "caffeinate -i node server.js" --name rides` (Mac).

**Alerts go to** your own WhatsApp "Message yourself" chat (on by default), optional phone push through the free **ntfy** app (enter a topic name in settings), and the dashboard (click **Turn on sound alerts**). The app never posts in the group unless you click **Post seats to group**.

## How it finds rides for you

You drive one car and decide yourself whether a trip is worth it. The app finds passengers for you.

- **Rides worth taking:** passengers going to the **same place** at about the **same time** (within 30 min by default), up to your seats. A group is "worth it" once it has your minimum number of people (default 3, set in **Your settings**). "Me and my roommate" counts as 2.
- **Alerts:** you get one alert when a group reaches your minimum, with names, numbers and times, and another when someone new joins it.
- **I'm taking this:** marks the ride as yours. New matching passengers are added to it, and you get a reminder before you leave with who to pick up.
- **Smaller groups** (below your minimum) are listed with **Take anyway**. No alerts for them.
- **Cities on the way** (e.g. Kyle on the way to Austin) are only grouped if you tick that option.
- Drivers offering rides in the group are listed but never used.

## Cities

Texas cities around San Marcos, plus the AUS, SAT, IAH and DFW airports, are built in with nicknames (atx, satx, nb, "the airport", and so on). Edit `DEFAULT_CITIES` and `COORDS` in `lib/rides.js` to add more. A city without coordinates still pools, but only with riders going to exactly that city.

## Files

- `server.js`: WhatsApp connection (Baileys), alerts, dashboard API
- `lib/rides.js`: message understanding and grouping. Shared by the server and the offline page.
- `public/index.html`: the dashboard
- `build-offline.js`: `npm run build` writes `dist/ride-dispatch.html`, a single offline file
- `test/rides.test.js`: `npm test`
- `data/`: your saved login session, messages and settings. Delete `data/auth` to unlink.

## Good to know

- This uses WhatsApp Web's linked-device protocol through the unofficial Baileys library. WhatsApp does not officially support it, and heavy automated posting can get a number restricted. The app only reads, and posts only when you click. Using a spare number is safest.
- Group members' messages and phone numbers are stored in `data/` on your computer. `data/` is in `.gitignore`; never commit it (it also holds your WhatsApp login).

## Run it in the cloud (alerts while your Mac sleeps)

Uses Railway (railway.com, about $5/month). Run these from this folder in a terminal:

1. `npx @railway/cli login`, then `npx @railway/cli init` (name the project, e.g. ride-dispatch), then `npx @railway/cli up`.
2. In the Railway website, open the service:
   - **Variables:** add `DASHBOARD_PASSWORD` (your choice), `DATA_DIR` = `/data`, `TZ` = `America/Chicago`.
   - **Volume:** attach a volume mounted at `/data`. This keeps your WhatsApp login across restarts.
   - **Settings → Networking → Generate Domain** to get a web address.
3. Open that address on your phone or computer, enter any username plus your password, scan the QR code and tick the ride group.
4. Stop the copy on your Mac (`npx pm2 stop rides` or Control + C) so two copies don't share one WhatsApp login.

Without `DASHBOARD_PASSWORD`, the dashboard only opens on the same computer (localhost).
