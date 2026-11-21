# FixMate — Server (Express + MongoDB)

REST API for **FixMate**, an on-demand device & home appliance repair service platform.
Built with Node.js, Express 5, TypeScript, MongoDB, BetterAuth (JWT), Stripe and ImgBB.

Client repository: the `fixmate` Next.js app (see its README for the full project overview).

## Live links

| | URL |
|---|---|
| Live API | _add your deployment URL here_ (e.g. `https://fixmate-api.onrender.com`) |
| Server repository | _add your GitHub link here_ |
| Client repository | _add your GitHub link here_ |

## Quick start

```bash
npm install
cp .env.example .env     # then fill in the values
npm run seed             # 2 technicians, 13 approved services, 9 bookings, 2 payments
npm run dev              # http://localhost:5000
```

Scripts: `dev` (tsx watch), `build` (tsc), `start` (node dist), `seed`, `typecheck`.

## Environment variables

```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas
DB_NAME=fixmate
CLIENT_URL=http://localhost:3000       # also used for CORS + BetterAuth trusted origins
BETTER_AUTH_SECRET=                    # 32+ byte random string
BETTER_AUTH_URL=http://localhost:5000
STRIPE_SECRET_KEY=                     # test mode
STRIPE_WEBHOOK_SECRET=                 # from `stripe listen` or the dashboard
IMGBB_API_KEY=
```

> `.env` values take precedence over inherited shell variables, so `PORT` from the environment
> cannot silently override the configured port.

## Data model (4 collections)

| Collection | Purpose |
|---|---|
| `users` | BetterAuth user + `role`, `phone`, `area`, `bio` (additionalFields) |
| `services` | Technician listings with `approvalStatus` / `isAvailable` |
| `bookings` | Repair jobs with status pipeline, `finalAmount`, `paymentStatus`, `statusHistory` |
| `payments` | One payment per paid booking (`stripeSessionId` unique) |

BetterAuth's `session`, `account` and `verification` collections are created automatically and
are not part of this count. Indexes (including unique keys on `payments.bookingId`,
`payments.stripeSessionId` and `users.email`) are created on boot.

## Authentication & authorization

BetterAuth email + password with the JWT plugin. Every private route verifies the bearer token
against the auth server's JWKS, then checks the role.

| Middleware | Behaviour |
|---|---|
| `verifyToken` | 401 without/invalid token, attaches `req.user` |
| `verifyCustomer` | 403 unless role is `customer` |
| `verifyTechnician` | 403 unless role is `technician` |
| `verifyAdmin` | 403 unless role is `admin` |

Ownership is enforced in queries: a customer only ever reads bookings with their own email, and a
technician can only update jobs where `technicianEmail` matches their token.

## API

**Public**

| Method | Route |
|---|---|
| GET | `/api/health` |
| GET | `/api/services?search=&category=&serviceMode=&sort=price-asc\|price-desc\|newest&page=&limit=` |
| GET | `/api/services/:id` (includes technician profile) |

**Customer** (`verifyToken`, `verifyCustomer`)

| Method | Route |
|---|---|
| POST | `/api/bookings` |
| PATCH | `/api/bookings/:id/cancel` |
| GET | `/api/bookings/my` |
| GET | `/api/payments/my` |
| POST | `/api/payments/create-checkout-session` |
| GET | `/api/payments/verify?session_id=` |
| GET | `/api/dashboard/customer` |

**Technician** (`verifyToken`, `verifyTechnician`)

| Method | Route |
|---|---|
| POST / PATCH / DELETE | `/api/services`, `/api/services/:id` |
| PATCH | `/api/services/:id/availability` |
| GET | `/api/services/technician/my` |
| GET | `/api/bookings/technician?status=` |
| PATCH | `/api/bookings/:id/status` |
| GET | `/api/dashboard/technician` |

**Admin** (`verifyToken`, `verifyAdmin` on the whole router)

| Method | Route |
|---|---|
| GET | `/api/admin/users?role=&search=` |
| PATCH | `/api/admin/users/:id/role` |
| GET | `/api/admin/services?approvalStatus=` |
| PATCH | `/api/admin/services/:id/approval` |
| GET | `/api/admin/bookings?status=` |
| GET | `/api/admin/payments` |
| GET | `/api/dashboard/admin` |

**Any signed-in user** — `GET /api/users/me`, `PATCH /api/users/profile`, `POST /api/uploads`
(multipart, field `image` → ImgBB).

**Stripe** — `POST /api/payments/webhook` (raw body, signature verified, idempotent with the
success-page verification).

## Business rules enforced on the server

- Sign up can only create `customer` or `technician`; admin accounts exist only via the seed.
- Only approved **and** available services are public or bookable; editing a service resets it to
  `pending`.
- A customer cannot hold two active requests (`requested` / `accepted` / `in-progress`) for the
  same service, and a technician cannot request their own service.
- Job pipeline: `requested → accepted | rejected`, `accepted → in-progress`,
  `in-progress → completed` (requires `finalAmount > 0`). Customer cancel only from `requested`.
  Everything else is rejected with 400.
- Payment is only possible for a `completed`, `unpaid` booking owned by the caller, and the amount
  always comes from the database.

## Seed accounts

Password **`Fixmate1234`** for all of them.

| Role | Email |
|---|---|
| Admin | `admin@fixmate.dev` |
| Technician | `rafiq@fixmate.dev` |
| Technician | `karim@fixmate.dev` |
| Customer | `customer@fixmate.dev` |
| Customer | `ayesha@fixmate.dev` |

## Deployment notes

- Add the production client origin to `CLIENT_URL` (CORS + BetterAuth trusted origins).
- Register `https://<your-api-domain>/api/payments/webhook` in the Stripe dashboard (test mode)
  and put its signing secret in `STRIPE_WEBHOOK_SECRET`.
- BetterAuth cookies use `SameSite=None; Secure` in production so the client and API can live on
  different domains.
