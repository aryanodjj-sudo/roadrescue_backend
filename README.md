# RoadRescue — Backend API

Node.js/Express REST API + Socket.IO real-time layer powering RoadRescue,
a roadside-assistance platform connecting stranded vehicle owners with
verified nearby mechanics.

## Tech Stack

- **Runtime:** Node.js, Express 4
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (role-based: user / mechanic / admin)
- **Real-time:** Socket.IO (live mechanic location, instant notifications)
- **Payments:** Razorpay (test-mode integration)
- **Security:** Helmet, CORS allow-list, rate limiting, bcrypt password hashing

## Getting Started

```bash
npm install
cp .env.example .env   # fill in your own values
npm run seed            # creates an admin account + sample data
npm run dev              # starts on http://localhost:5000
```

## Environment Variables

See `.env.example` for the full list — MongoDB URI, JWT secret, allowed
frontend origin, admin seed credentials, and Razorpay test keys.

## API Overview

All routes are prefixed with `/api`. Key resource groups:

| Route | Description |
|---|---|
| `/auth` | Register, login (role-based: user/mechanic/admin) |
| `/vehicles` | CRUD for a user's vehicles |
| `/mechanics/nearby` | Public, geolocation-based mechanic search |
| `/service-requests` | Booking lifecycle (create → accept → status → complete) |
| `/payments` | Invoice retrieval + Razorpay order creation/verification |
| `/subscriptions` | Monthly/annual plan management |
| `/coupons` | Discount code validation and admin management |
| `/complaints` | User/mechanic complaints & disputes |
| `/admin/*` | Admin-only: verification, reports, moderation |

Full route-by-route breakdown is in the project report.

## Real-Time Events (Socket.IO)

| Event | Direction | Purpose |
|---|---|---|
| `mechanic:location` | mechanic → server → customer | Live GPS position during an active job |
| `notification:new` | server → user | Instant push the moment a request is accepted/updated/cancelled |

Every socket connection authenticates with the same JWT used for REST calls.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start in production mode |
| `npm run seed` | Seed an admin account + sample mechanics/services |

## Deployment

Configured for Render (Node web service). Set all `.env.example` variables
as environment variables on your host — never commit a real `.env` file.