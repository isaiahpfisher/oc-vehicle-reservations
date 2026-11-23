# OC Vehicle Reservations

Oklahoma Christian University's vehicle reservation system: staff and students sign in with their OC Google account to request vehicles, and admins manage users, roles, and areas.

Built with Spec-Driven Development (SDD). Specifications define _what_ to build ([`features/`](features/README.md)); Cursor rules define _how_ (`.cursor/rules/`); tests verify both.

**Docs:** [features/framework.md](features/framework.md) · [docs/STARTER-KIT.md](docs/STARTER-KIT.md) · [docs/adr/README.md](docs/adr/README.md)

---

## Stack

| Layer    | Technology                                                        |
| -------- | ----------------------------------------------------------------- |
| Frontend | Vue 3, Vuetify 4, Vite, vue-router, Pinia, axios                  |
| Backend  | Node.js (ES modules), Express, Sequelize, MySQL                   |
| Tests    | Jest + supertest (backend), Vitest + `@vue/test-utils` (frontend) |

Default ports: frontend `8082`, backend `3200`. API mount: `/api` in development, `/vehicle-t1` in production (change in `backend/server.js` and `frontend/src/services/services.js`).

---

## Deployment

`.github/workflows/deploy.yml` deploys on every push to `dev`, or manually from the Actions tab. The frontend goes to `/var/www/html/seiv2026/p4/t1`. The backend goes to `/home/ubuntu/nodeapps/2026/project4/t1` and runs as `vehicle-t1-backend.service` on port `3021`, behind Apache's `ProxyPass /vehicle-t1 http://localhost:3021/vehicle-t1`.

Configure these as GitHub repository secrets. Never commit their values or the SSH key.

| Secret | Value |
| ------ | ----- |
| `SERVER_SSH_KEY` | Contents of the server's `.pem` file |
| `REMOTE_HOST` | Server hostname |
| `REMOTE_USER` | `ubuntu` |
| `FRONTEND_DEPLOY_TARGET` | `/var/www/html/seiv2026/p4/t1` |
| `BACKEND_DEPLOY_TARGET` | `/home/ubuntu/nodeapps/2026/project4/t1` |
| `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` | MySQL connection |
| `DB_TIMEZONE` | IANA time zone, e.g. `America/Chicago` (the default if unset) |
| `AUTH_SECRET` | Long random string |
| `GOOGLE_CLIENT_ID` | OAuth client whose authorized redirect URIs include `https://<host>/seiv2026/p4/t1/login` |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform key used by the backend (Feature 8) |
| `PORT` | `3021` |
| `SEQUELIZE_SYNC_ALTER` | `false`. New tables are still created; set `true` for one deploy to add columns to existing tables. |
| `SUPABASE_URL` | Supabase project URL for area logo storage (Feature 17), e.g. `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. Server-only; never expose it to the frontend. |

The workflow sets `AREA_LOGO_PREFIX=prod`, so production logos go in the `prod/` folder of the `area-logos` bucket. Don't use `prod` as your local prefix.

---

## Getting started

```bash
npm install --prefix frontend
npm install --prefix backend
npm install

# macOS / Linux / Git Bash:
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
# Windows PowerShell / cmd:
#   copy backend\.env.example backend\.env
#   copy backend\.env.test.example backend\.env.test
# Create MySQL databases; set DB_* and AUTH_SECRET

npm test
cd backend && npm run dev
cd frontend && npm run dev
```

Works on **macOS, Windows, and Linux** — use `npm run …` for all tooling (PDF, Agility, bundles).

### Make the first admin

Every account comes from Google sign-in, so a fresh install has no admin. Start the app, sign in with Google once to create your account, then from `backend/`:

```bash
npm run make-admin -- you@oc.edu
```

Reload the app; you now hold the `admin` role and can grant roles to others from **Users**. The email is matched case-insensitively. The script exits `1` and changes nothing if no account has that email.

These scripts replace every role that account holds:

```bash
npm run make-maintenance -- you@oc.edu
npm run make-requester -- you@oc.edu
npm run make-area-admin -- you@oc.edu Athletics
```

`make-requester` removes every role row. `make-area-admin` keeps only area admin for that area. The area can be its name (`Athletics`) or its id (`2`). An unknown email or area exits `1` and changes nothing.

### Seed test data and sign in as other users (development only)

To test role-based access, seed realistic users and sign in as them without Google. From the repo root or `backend/`:

```bash
npm run seed -- --keep you@eagles.oc.edu   # replaces users, sessions, roles, and areas; --keep preserves your account
```

The seed always creates the project team (`isaiah.fisher@eagles.oc.edu`, `lana.n.cutter@eagles.oc.edu`, `j.walraven@eagles.oc.edu`) as admins, so they can sign in with Google right after seeding without `make-admin`. With `DEV_LOGIN=true` (never in production), Google sign-in also gives these accounts the admin role, even on a database that was never seeded. Re-run it any time to reset to the same data. The backend (server and scripts) reads `backend/.env`, falling back to the repo-root `.env`, from whatever directory you start it in.

Then set `DEV_LOGIN=true` in your `.env`, restart the backend, and use the **Developer sign-in** form under the Google button on the login page (it only appears in development builds). Every account's password is `password` (override with `DEV_LOGIN_PASSWORD`). Dev sign-in is refused whenever `NODE_ENV=production`, and `npm run seed` refuses to run there.

| Email | Roles |
| ----- | ----- |
| `admin@oc.edu` | Admin |
| `maintenance@oc.edu` | Maintenance |
| `areaadmin@oc.edu` | Area Admin — Athletics |
| `multirole@oc.edu` | Maintenance, Area Admin — Music, Area Admin — Theatre |
| `requester@oc.edu` | none (requester) |

The seed data is small and hand-written: enough to show every screen, status, and warning, and about one page of each list. Dates are offsets from the day you seed, so it always looks current. Besides the test accounts above, it adds:

| What | How many | Highlights |
| ---- | -------- | ---------- |
| Areas | 6 | Every area has an area admin; Athletics has three |
| Users | 28 | The test accounts, the project team, and a few staff and students |
| Vehicle types | 6 | Truck has only Theatre's instructions, so it shows the "No default instructions" warning |
| Service types | 4 | Schedules by miles and days, by miles only, and by days only |
| Vehicles | 19 | Every status: available, due soon, overdue, plate expired, out of service, retired |
| Drivers | 13 | Every status, an expired license, one expiring in 12 days, and two without an account |
| Destinations | 19 | Three are custom stops typed on a request |
| Requests | 31 | Every area and status, from about six weeks ago to six weeks out; `requester@oc.edu` has 5 |
| Issue reports and maintenance needs | 8 and 6 | Every type, status, and priority; two needs came from reports |
| Mileage and service history | 56 readings, 81 services | Oil and inspection visits, several in the last few weeks |
| Notes | 18 | Short threads on requests, reports, and needs, some staff only |

These rows each have a story (Feature 18):

| Where to look | What it shows |
| ------------- | ------------- |
| `ATH-V01`, request **Track meet at Oklahoma State** | Out of service (brakes), and reserved for a trip in 3 days |
| `ATH-S01`, request **Soccer match at Southern Nazarene** | Oil change due soon by date, coming due before the trip |
| `MUS-B01`, request **Choir tour: Abilene and Lubbock** | Available, but the trip's miles pass its next oil change |
| `STU-V01`, request **International student airport run** | License plate expires before the trip |
| `ATH-V03`, request **Cross country meet at UCO** | Retired, still assigned to an upcoming trip |
| `ATH-C01`, requests **Recruiting dinner in Norman** and **Coaching clinic at Oklahoma State** | Booked for two overlapping trips |
| `STU-B01`, request **Outing to the Oklahoma City Zoo** | Overdue for service by date, on a trip today |
| Request **Honor choir clinic in Tulsa** | Driver's license expires before the trip ends |
| `MUS-C01` / `FAC-T01` / `THE-T01` | Overdue by miles / due soon by miles / plate expired |
| `ADM-S01` | Bought this month and never serviced |
| `THE-V01`, need **Brake pedal feels soft** | A maintenance need closed out by a service visit |

Request mileage is estimated from the seed destinations' coordinates, so seeding makes no Google calls. Add `-- --google` to estimate it with Google Routes instead; that makes one billed call per request (31).

## Branching

| Branch        | Purpose                                      |
| ------------- | -------------------------------------------- |
| `main`        | Starter kit only — no feature implementation |
| `dev`         | Integration                                  |
| `feature/N-*` | One feature at a time                        |

```bash
git checkout -b dev
git checkout -b feature/1-short-name
```

## Adding a feature

1. Write or update `features/feature-N-….md` (see the [framework template](features/framework.md#feature-spec-template): **Status**, **Input**, **FR-00N**, **SC-00N**, **Key Entities**, **Agent implementation request**, **Definition of Done**).
2. Add it to the [feature catalog](features/README.md#feature-catalog).
3. Implement on `feature/N-…` per the spec's Agent implementation request and Definition of Done, updating `features/reference/` in the same PR when the API, schema, or rules change.
