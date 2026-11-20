# FixMate — Server API

REST API for **FixMate**, an on-demand device & home appliance repair service platform.

Customers browse approved repair services, send repair requests, track job status and pay online
after the job is completed. Technicians list services and manage incoming jobs. Admins moderate
services, manage users and monitor bookings & transactions.

## Tech Stack

| Area      | Technology                                  |
| --------- | ------------------------------------------- |
| Runtime   | Node.js                                     |
| Framework | Express 5 + TypeScript                      |
| Database  | MongoDB (official driver)                   |
| Auth      | BetterAuth + JWT                            |
| Payments  | Stripe (test mode)                          |
| Media     | ImgBB API                                   |

## Getting Started

```bash
# 1. install dependencies
npm install

# 2. create your environment file
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux

# 3. fill MONGODB_URI (and later BetterAuth / Stripe / ImgBB keys)

# 4. start the dev server
npm run dev
```

The API runs on `http://localhost:5000` by default.

### Scripts

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start with hot reload (`tsx watch`)    |
| `npm run build`     | Compile TypeScript to `dist/`          |
| `npm start`         | Run the compiled server                |
| `npm run typecheck` | Type-check without emitting files      |

### Environment Variables

| Variable      | Description                        |
| ------------- | ---------------------------------- |
| `PORT`        | API port (default `5000`)          |
| `MONGODB_URI` | MongoDB Atlas connection string    |
| `DB_NAME`     | Database name (default `fixmate`)  |
| `CLIENT_URL`  | Frontend origin used for CORS      |

## API

| Method | Route         | Access | Description        |
| ------ | ------------- | ------ | ------------------ |
| GET    | `/api/health` | Public | Server health check |

## Project Structure

```
src/
├── config/      # environment variables & database connection
├── middleware/  # error handling (auth middlewares added later)
├── routes/      # API route handlers
├── app.ts       # express app configuration
└── index.ts     # server entry point
```
