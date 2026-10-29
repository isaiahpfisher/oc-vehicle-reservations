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

Default ports: frontend `8082`, backend `3200`. API mount: `/api` (change in `backend/server.js` and `frontend/src/services/services.js`).

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

### Seed test data and sign in as other users (development only)

To test role-based access, seed realistic users and sign in as them without Google. From the repo root or `backend/`:

```bash
npm run seed -- --keep you@eagles.oc.edu   # replaces users, sessions, roles, and areas; --keep preserves your account
```

Re-run it any time to reset to the same data. The backend (server and scripts) reads `backend/.env`, falling back to the repo-root `.env`, from whatever directory you start it in.

Then set `DEV_LOGIN=true` in your `.env`, restart the backend, and use the **Developer sign-in** form under the Google button on the login page (it only appears in development builds). Every account's password is `password` (override with `DEV_LOGIN_PASSWORD`). Dev sign-in is refused whenever `NODE_ENV=production`, and `npm run seed` refuses to run there.

| Email | Roles |
| ----- | ----- |
| `admin@oc.edu` | Admin |
| `maintenance@oc.edu` | Maintenance |
| `areaadmin@oc.edu` | Area Admin — Athletics |
| `multirole@oc.edu` | Maintenance, Area Admin — Music, Area Admin — Theatre |
| `requester@oc.edu` | none (requester) |

The seed also adds staff and students across six areas (Admissions, Athletics, Facilities, Music, Student Life, Theatre); see `backend/scripts/seed.mjs`.

Until Features 4–7 merge, the seed also adds interim sample vehicle types, vehicles, drivers, and destinations so vehicle requests (Feature 8) can be tried, and it clears existing vehicle requests (they belong to the users and areas it replaces).

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
