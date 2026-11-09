# Goodoo TV

Goodoo TV is a web app for watching supported video sources together in synchronized, invite-only rooms. A signed-in user creates a room with a video link, then shares the room URL or its 12-character invite code. Playback state and room membership are coordinated in real time.

The app is built with Next.js, React, Tailwind CSS, Socket.IO, Prisma, and PostgreSQL. Its current interface is Persian and right-to-left.

## Features

- Create rooms from YouTube links, direct video URLs, and HLS streams (`.m3u8`).
- Join a room from its invite link or 12-character code.
- Synchronize playback through Socket.IO. The room host controls playback; guests can pause.
- Sign in with a phone number and a six-digit verification code.
- Edit profile details and upload a PNG, JPEG, or WebP avatar (up to 250 KB).
- Switch between light and dark themes, with a reduced-glass display setting.
- Use the responsive interface on desktop and mobile browsers.

## Requirements

- Node.js 22 or later and npm
- PostgreSQL 16 or later
- Docker Compose (for the containerized setup)

## Run with Docker Compose

From the project root, run:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Compose starts PostgreSQL and the app; the app applies pending Prisma migrations before it starts. The database uses a named Docker volume so its data persists across container restarts.

The Compose file includes development credentials for local use. Change them before exposing the service to an untrusted network.

## Run locally

1. Copy the environment template and install dependencies:

   ```bash
   cp .env.example .env
   npm install
   ```

2. Start PostgreSQL and set `DATABASE_URL` in `.env` to a connection string for that database. The template expects PostgreSQL on `localhost:5432` with the local credentials shown in `compose.yml`.

   To start only the database with Compose:

   ```bash
   docker compose up -d db
   ```

3. Apply database migrations and start the development server:

   ```bash
   npm run db:migrate
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). `npm run dev` reads environment variables from `.env` and starts the custom Next.js and Socket.IO server.

## Sign-in for local development

Enter a valid mobile number and use `123456` as the verification code. No SMS is sent; the code is hard-coded in the login endpoint. This is a development-only flow and is not suitable for production. Replace it with a trusted SMS delivery and code-verification service before public deployment.

Sessions expire after 30 days. The browser stores a random session token in an HttpOnly cookie; only its SHA-256 hash is stored in PostgreSQL.

## Video sources

YouTube links are played with the YouTube IFrame Player API. Direct video URLs and HLS streams are played in the browser. MKV links from `fj-ios.com` and `tdmm2.ir` are transcoded to HLS with FFmpeg for Safari compatibility; Docker images install FFmpeg. Transcodes use temporary disk space and CPU, allow at most two active jobs, and are removed after 30 minutes without requests. Embedded subtitles are not included in the HLS output. Other containers and codecs remain subject to browser support.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `HOSTNAME` | No | Server bind address; defaults to `0.0.0.0`. |

For local development, `DATABASE_URL` is loaded from `.env`. In Docker Compose, the app service receives its database URL from `compose.yml`.

## Database and deployment

Prisma schema and migrations are in `prisma/`. For local development, `npm run db:migrate` creates and applies migrations. To apply committed migrations in a deployment, run:

```bash
npm run db:deploy
```

Build and start the app with:

```bash
npm run build
npm start
```

The Docker image runs `prisma migrate deploy` before starting the app. Back up the PostgreSQL database before applying schema changes in production.

## Scaling note

Room records and playback state are stored in PostgreSQL. Live participant presence is held in the memory of a single Node.js process, so multiple app instances need a shared Socket.IO adapter to provide consistent room membership.
