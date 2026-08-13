# 🔁 Bumerán — Backend

> **"Lo que das, vuelve."** — the API behind Bumerán, a neighborhood favor-exchange app where people offer help, ask for it, and give things away.

<p align="center">
  <img src="https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 11">
  <img src="https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 7">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white" alt="Twilio">
</p>

---

## 📖 Overview

This is the **REST API** for [Bumerán](https://github.com/Dual-Stack-Studio/Bumer-n-Client), a mobile favor-exchange platform. It handles authentication, the favor lifecycle, neighbor-to-neighbor connections, reviews and phone verification.

A favor comes in three flavors — **`necesito`** (I need something), **`ofrezco`** (I'm offering help) and **`regalo`** (I'm giving something away). Neighbors connect around a favor, help each other, and rate the exchange afterwards — building local reputation over time.

🔗 **Production API:** `https://bumeran-backend-production.up.railway.app`

---

## 🛠️ Tech Stack

| Area | Technology |
|------|------------|
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM | Prisma 7 (with the `pg` driver adapter) |
| Database | PostgreSQL |
| Auth | Google Sign-In verification (`google-auth-library`) → JWT (`@nestjs/jwt` + Passport JWT) |
| SMS | Twilio — 6-digit OTP for phone verification |
| Push notifications | Expo Push API (`https://exp.host/--/expo-push/v2/push/send`) — fire-and-forget |
| Security | Helmet, `@nestjs/throttler` (rate limiting), `class-validator` DTOs |
| Deployment | Railway |

---

## 🔐 Authentication flow

Bumerán has no passwords. Sign-in is delegated to Google:

1. The mobile app performs **Google Sign-In** and gets a Google **ID token**.
2. The app sends it to `POST /api/auth/login`.
3. The backend verifies the token with `google-auth-library` (against the web & Android client IDs), creates the user on first login, and returns a signed **JWT access token**.
4. Protected routes require `Authorization: Bearer <jwt>`.

---

## 📱 Phone verification flow

Before a user can connect with a neighbor, they must verify their phone number:

1. `POST /api/verificacion/enviar` — stores a 6-digit code (expires in 10 min) and sends it via **Twilio SMS**.
2. `POST /api/verificacion/confirmar` — validates the code, marks `telefonoVerificado = true` on the user.
3. `POST /api/conexiones` — returns **403 Forbidden** if the requesting user's phone is not verified.

Anti-abuse: the same phone number cannot be verified on more than one account. If a number is already verified on a different account, the confirmation step is rejected.

> In development (Twilio not configured), the code is returned in the API response body for easy testing.

---

## 🗄️ Data Model

Prisma over PostgreSQL. Core entities:

- **User** — `googleId`, `email`, `name`, `photo`, phone + verification fields (`telefono`, `telefonoVerificado`, `telefonoVerificadoEn`), rating aggregates (`promedioCalificacion`, `totalReviews`), `suspendido` (auto-set when average rating < 2.0 with 3+ reviews, or manually via the admin panel), `isAdmin`, `expoPushToken` (stored on login for push delivery).
- **Favor** — `tipo` (`necesito` / `ofrezco` / `regalo`), `titulo`, `descripcion`, `categoria`, `latitude` / `longitude`, `estado` (`abierto` / `en_proceso` / `cerrado` / `cancelado`), `expiraEn`, `telefonoContacto`, `fotos` (array of Cloudinary URLs).
- **FavorConexion** — links a helper (`ayudante`) to a requester (`solicitante`) on a favor; `estado` (`pendiente` → `aceptada` → `completada` / `cancelada`). Unique per `(favor, ayudante)`.
- **Review** — `estrellas` + `comentario`, tied to a favor, an author and a recipient. Unique per `(favor, author)`.
- **VerificacionTelefono** — one-time code + expiry for phone verification, upserted on each send request.
- **Notificacion** — `tipo`, `titulo`, `cuerpo`, `leida`, `payload` (JSON with `favorId` / `conexionId`), `creadoEn`. Created automatically by connection lifecycle events and delivered via Expo Push API.

---

## 📡 API Reference

All routes are prefixed with **`/api`**. Protected routes (🔒) require a JWT.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Log in with a Google ID token; returns a JWT |
| GET | `/auth/me` | 🔒 | Current user profile |

### Favores — `/api/favores`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/favores` | — | List favors (filterable / paginated) |
| GET | `/favores/:id` | — | Favor detail |
| POST | `/favores` | 🔒 | Create a favor |
| PATCH | `/favores/:id` | 🔒 | Update a favor (owner only) |
| DELETE | `/favores/:id` | 🔒 | Delete a favor (owner only) |

### Conexiones — `/api/conexiones`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/conexiones` | 🔒 | Request a connection — **requires phone verified** |
| PATCH | `/conexiones/:id/aceptar` | 🔒 | Accept a connection |
| PATCH | `/conexiones/:id/completar` | 🔒 | Mark a connection completed |
| PATCH | `/conexiones/:id/cancelar` | 🔒 | Cancel a connection |
| GET | `/conexiones/favor/:favorId` | 🔒 | Connections for a favor |
| GET | `/conexiones/mis` | 🔒 | My connections (sent & received) |

### Reviews — `/api/reviews`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reviews` | 🔒 | Leave a review after a completed exchange |
| GET | `/reviews/usuario/:id` | — | Reviews received by a user |

### Usuarios — `/api/usuarios`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/usuarios/:id` | — | Public user profile |
| DELETE | `/usuarios/me` | 🔒 | Delete my account |
| PATCH | `/usuarios/push-token` | 🔒 | Register / update Expo push token |

### Notificaciones — `/api/notificaciones`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notificaciones` | 🔒 | My last 50 notifications |
| PATCH | `/notificaciones/leer-todas` | 🔒 | Mark all as read |
| PATCH | `/notificaciones/:id/leer` | 🔒 | Mark one as read |

### Verificación — `/api/verificacion`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/verificacion/enviar` | 🔒 | Send a 6-digit SMS code via Twilio |
| POST | `/verificacion/confirmar` | 🔒 | Confirm the code; sets `telefonoVerificado = true` |
| GET | `/verificacion/estado` | 🔒 | Current verification status |

### Admin — `/api/admin`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/usuarios` | 🔒👑 | List users — `?search=&suspendido=&page=`, paginated |
| GET | `/admin/usuarios/:id` | 🔒👑 | User detail — favores + reseñas recibidas |
| PATCH | `/admin/usuarios/:id/suspension` | 🔒👑 | Manually suspend/reactivate a user — body `{ suspendido: boolean }` |

👑 requires `isAdmin: true` on the requesting user (checked by `AdminGuard`, on top of the JWT check). There's no self-serve way to become admin — the first admin is bootstrapped with a manual `UPDATE users SET "isAdmin" = true WHERE email = '...'`. Consumed by the separate `bumeran-admin` panel (own repo, own deploy), not the mobile app.

---

## ⚙️ Environment Variables

Create a `.env` file (git-ignored):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bumeran
PORT=3000

# Google Sign-In client IDs used to verify ID tokens
GOOGLE_CLIENT_ID=your-web-oauth-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-oauth-client-id.apps.googleusercontent.com

# JWT
JWT_ACCESS_SECRET=a_long_random_secret

# CORS — allowed browser origins
FRONTEND_URL=http://localhost:8081
ADMIN_URL=http://localhost:5173

# Twilio SMS (optional — if unset, the code is returned in the response for dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js **20+**
- PostgreSQL (a `docker-compose.yml` is provided for a local instance)

### 1. Install
```bash
npm install
```

### 2. Database
```bash
docker compose up -d          # local PostgreSQL
npx prisma migrate dev        # apply migrations & generate the client
```

### 3. Run
```bash
npm run start:dev             # watch mode
npm run start                 # normal
npm run start:prod            # prisma migrate deploy + node dist/main
```

The API listens on `http://localhost:3000` with the global `/api` prefix.

---

## 🔗 Related repositories

| Repo | Description |
|------|-------------|
| [Bumer-n-Client](https://github.com/Dual-Stack-Studio/Bumer-n-Client) | Bumerán mobile app — React Native + Expo SDK 54 |

---

## 🏗️ About

Solo project under **Dual-Stack Studio**, currently in **active development**. Built with Claude Sonnet 4.6 (Anthropic) as an engineering partner throughout — architecture, API design and data modeling.
