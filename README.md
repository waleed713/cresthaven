# CrestHaven website, accounts and server

This folder contains the CrestHaven website (`public/`) and a Node.js server (`server/`) that runs the website, accounts, the user dashboard, the admin panel, the database and the integrations.

What the server does:

- **Accounts:** sign up, log in, log out, profile settings. Passwords are hashed with scrypt. Sessions use an HttpOnly cookie.
- **Property listings:** users submit properties from the sell form or the dashboard. Every listing starts as "pending" and goes live only after an admin approves it. Photos are saved on the server in `server/uploads/`.
- **Favorites:** saved per account, so they follow the user across devices.
- **Enquiries:** contact, booking, sell, design and architect forms are stored in the database. If a user is logged in, the enquiry is linked to their account, and they can see replies in their dashboard.
- **Messages:** the admin team replies to any enquiry, and the user replies back in the same thread.
- **HubSpot:** every enquiry is also sent to HubSpot as a contact plus a note. If HubSpot is down, the enquiry is still saved, and its CRM status is shown in the admin panel.
- **AI design suggestions:** the design brief is sent to the Gemini API. Name, email and phone are never sent to Gemini.

Keep HubSpot, Gemini and admin passwords on the server only. They must never appear in `public/`.

## Requirements

- Node.js 22.5 or newer. The database uses Node's built-in SQLite module, so no native build tools are needed.

## 1. Environment variables

Copy `server/.env.example` to `server/.env` and fill in the values.

| Variable | Required | What it does |
| --- | --- | --- |
| `ADMIN_EMAIL` | Yes, for the admin panel | Email of the admin account. It is created on first start. |
| `ADMIN_PASSWORD` | Yes, for the admin panel | Password for the admin account (at least 8 characters). It is used only when the admin account is first created. To change it later, update the password in the database directly. |
| `HUBSPOT_TOKEN` | Recommended | HubSpot private app token. Without it, enquiries are saved but not sent to HubSpot. |
| `GEMINI_API_KEY` | Optional | Enables AI design suggestions. |
| `GEMINI_MODEL` | Optional | Gemini model name. Default `gemini-3.8-flash`. |
| `PORT` | Optional | Default `3000`. |
| `DB_PATH` | Optional | Database file. Default `server/data/cresthaven.db`. |
| `COOKIE_SECURE` | Recommended in production | Set to `1` when the site runs on HTTPS, so the login cookie is only sent over HTTPS. |

## 2. Set up HubSpot

1. In HubSpot, go to Settings, then Integrations, then Private Apps, and create a private app.
2. Give it the scopes `crm.objects.contacts.read` and `crm.objects.contacts.write`.
3. Copy the access token into `server/.env` as `HUBSPOT_TOKEN`.

## 3. Set up Gemini

1. Open Google AI Studio and create an API key.
2. Check the model list in AI Studio. Free-tier models and their limits change, so confirm that `GEMINI_MODEL` is available to your project before you go live.
3. Put the key in `server/.env` as `GEMINI_API_KEY`.

Free-tier limits are low. The server limits AI requests to 5 per minute per visitor.

## 4. Configure the site

- Edit `public/config.js`. The advisor names, numbers and emails there are sample values. Replace them with your real team before launch.
- Replace the office address and contact details in `public/index.html` and `public/script.js` (search for `+92 300 0000000` and `hello@crest-haven.example`).

## 5. Run locally

```bash
cd server
cp .env.example .env      # then fill in the values
npm install
npm start
```

Open http://localhost:3000. The site, the API and the admin panel run from the same server. Log in with the `ADMIN_EMAIL` account, then open `#admin-listings` to review listings.

## 6. Pages and hash routes

| Hash | Who sees it | Page |
| --- | --- | --- |
| `#login`, `#signup` | Everyone | Account forms |
| `#dashboard-overview` | Logged-in users | Summary |
| `#dashboard-listings` | Logged-in users | Their properties and status |
| `#dashboard-add` | Logged-in users | Submit or edit a property |
| `#dashboard-saved` | Logged-in users | Saved properties |
| `#dashboard-design` | Logged-in users | Design briefs |
| `#dashboard-consult` | Logged-in users | Consultation and contact requests |
| `#dashboard-messages` | Logged-in users | Threads with the team |
| `#dashboard-profile` | Logged-in users | Profile and log out |
| `#admin-listings` | Admin only | Approve, request changes, or mark pending |
| `#admin-requests` | Admin only | All enquiries, with replies |

## 7. API summary

- Public: `GET /api/health`, `GET /api/listings`, `POST /api/requests`, `POST /api/design-suggestions`
- Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `PUT /api/me`
- User: `GET/POST /api/listings` and `PUT/DELETE /api/listings/:id` (owner only), `GET /api/my/listings`, `GET/POST /api/favorites`, `DELETE /api/favorites/:key`, `GET /api/my/requests`, `POST /api/my/requests/:id/messages`, `GET /api/dashboard/summary`
- Admin: `GET /api/admin/listings`, `POST /api/admin/listings/:id/status`, `GET /api/admin/requests`, `POST /api/admin/requests/:id/reply`

## 8. Deploy

Any Node.js 22.5+ host works (Render, Railway, Fly.io, a VPS). Set the environment variables in the host's dashboard, use `npm start` as the start command, and mount a persistent disk (or set `DB_PATH` to a persistent path). The database and uploaded photos are stored on the disk, so without a persistent disk they are lost on redeploy.

Back up `server/data/cresthaven.db` and `server/uploads/` regularly.

## Known limits (plan these before launch)

- **Sessions and rate limits** are kept in memory and the database. Rate limits reset when the server restarts. Use one server instance, or move the rate limiter to a shared store if you scale out.
- **Photos** are stored on the server disk. For larger traffic, move them to object storage (S3, Cloudinary or similar).
- **Email notifications** are not sent yet. Users see replies in their dashboard only.
- **Sample properties** in `public/script.js` are still shown on the site. Approved user listings are added next to them. Remove the sample array when you go live.
- **Password reset** is not built yet. An admin can reset a user's account by editing the database for now.
- **HubSpot and Gemini** were tested for their request format, but they still need a live check with your own keys before launch.
