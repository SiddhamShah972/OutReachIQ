# OutreachIQ

> AI-powered job outreach automation platform. Send cold emails from your own Gmail, track replies, build sequences, and manage your entire job application pipeline.

---

## Architecture Overview

```
OutreachIQ
├── Frontend: Next.js 14 (App Router + TypeScript)
│   ├── Tailwind CSS + shadcn/ui + Framer Motion
│   ├── Recharts (analytics) + @dnd-kit (kanban)
│   └── react-hook-form + zod (forms)
├── Backend: Next.js API routes (/app/api/...)
│   ├── Neon PostgreSQL + Prisma ORM
│   ├── BullMQ + Upstash Redis (job queues)
│   └── Anthropic claude-haiku-4-5 (all AI)
├── Auth: NextAuth.js v5 with Google OAuth + Gmail scopes
├── Email: Gmail API via user's own OAuth tokens
├── Storage: Cloudinary (resume/profile files)
└── Realtime: Pusher (private-user-{userId} channels)
```

**Key principle:** All outgoing cold emails are sent from the **user's own Gmail account** via OAuth tokens obtained at sign-in. OutreachIQ never touches a third-party email relay for outbound mail.

---

## Full Feature List

| Feature | Description |
|---------|-------------|
| **Google OAuth + Gmail** | Sign in with Google; OutreachIQ requests Gmail send/read/modify scopes so you own the sender |
| **AI Email Composer** | Claude Haiku generates personalized cold emails; supports A/B subject lines and tone selection |
| **Job Aggregation** | Pulls live jobs from Adzuna, Remotive, The Muse, Arbeitnow; AI scores each against your profile |
| **Email Finder** | Hunter.io → pattern-based guesses → generic fallbacks with confidence labels |
| **Pipeline Kanban** | Drag-and-drop kanban (Applied → Screened → Interview → Offer → Rejected); realtime via Pusher |
| **Follow-up Sequences** | BullMQ-powered automated follow-ups; paused automatically on reply detection |
| **Email Warmup** | Progressive daily send-limit ramp to protect Gmail reputation |
| **Offer Comparison** | Side-by-side offer comparison with Claude AI recommendation |
| **Insights Dashboard** | Recharts funnels, reply rates, heatmap; AI daily recommendations |
| **Open Tracking** | Invisible 1×1 GIF pixel; reply detection via Gmail thread polling |
| **Resume Upload** | Cloudinary PDF storage + pdf-parse text extraction; used by AI for skills matching |
| **Dark Mode** | next-themes full dark/light toggle |
| **Mobile Responsive** | Collapsible sidebar + bottom nav |

---

## Quick Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/SiddhamShah972/OutReachIQ.git
cd OutReachIQ
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env.local
# Fill in all values — see instructions below
```

### 3. Run Database Migration
```bash
npx prisma migrate dev --name init
```

### 4. Start Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Start Workers (optional for full functionality)
```bash
# In separate terminals:
npx ts-node --project tsconfig.worker.json workers/followup.ts
npx ts-node --project tsconfig.worker.json workers/warmup.ts
npx ts-node --project tsconfig.worker.json workers/tracker.ts
```

---

## Obtaining Free API Keys

### Neon PostgreSQL (free tier, 0.5 GB)
1. Go to [neon.tech](https://neon.tech) → Sign up
2. Create a new project
3. Copy the **Connection string** (pooled) → `DATABASE_URL`
4. Copy the **Direct connection string** → `DIRECT_URL`

### Google OAuth + Gmail API
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable **Gmail API** under APIs & Services
4. Go to **OAuth consent screen** → External → fill app name
5. Add scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.modify`
6. Create **OAuth 2.0 Client ID** (Web application)
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
8. Copy **Client ID** → `GOOGLE_CLIENT_ID`
9. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### Anthropic Claude (free $5 credit on sign-up)
1. Go to [console.anthropic.com](https://console.anthropic.com) → Sign up
2. API Keys → Create Key
3. Copy → `ANTHROPIC_API_KEY`

### Cloudinary (free tier, 25 GB)
1. Go to [cloudinary.com](https://cloudinary.com) → Sign up
2. Dashboard → copy **Cloud Name**, **API Key**, **API Secret**
3. Set → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Pusher (free tier, 200k messages/day)
1. Go to [pusher.com](https://pusher.com) → Sign up → Create app
2. Choose **Channels** product
3. App Keys tab → copy **app_id**, **key**, **secret**, **cluster**
4. Set → `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
5. Set `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` (same values)

### Upstash Redis (free tier, 10k commands/day)
1. Go to [upstash.com](https://upstash.com) → Sign up → Create Database
2. Choose **Redis** → free tier → copy **UPSTASH_REDIS_URL** and **UPSTASH_REDIS_TOKEN**

### Hunter.io (free tier, 25 searches/month)
1. Go to [hunter.io](https://hunter.io) → Sign up
2. API → copy API Key → `HUNTER_API_KEY`

### Resend (free tier, 100 emails/day)
1. Go to [resend.com](https://resend.com) → Sign up
2. API Keys → Create Key → `RESEND_API_KEY`
3. Set `RESEND_FROM_EMAIL` to a verified sending address

### Adzuna Jobs API (free tier)
1. Go to [api.adzuna.com](https://developer.adzuna.com) → Sign up
2. Create an app → copy **App ID** and **API Key**
3. Set → `ADZUNA_APP_ID`, `ADZUNA_API_KEY`

---

## Token Encryption Key
Generate a random 32-character string:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```
Set result → `TOKEN_ENCRYPTION_KEY`

---

## Neon Setup Guide
1. Create account at neon.tech
2. New project → choose region closest to you
3. Database name: `neondb` (default)
4. Connection pooling is enabled by default — use the pooled URL for `DATABASE_URL`
5. Use the direct URL (non-pooled) for `DIRECT_URL` (required by Prisma migrations)
6. Run: `npx prisma migrate dev --name init`

---

## Cloudinary Setup Guide
1. After signing up, go to Settings → Upload
2. Create an **upload preset** named `outreachiq_resumes` (unsigned, folder: `resumes`)
3. The app uses raw upload for PDFs via the server-side SDK (signed)

---

## Pusher Setup Guide
1. Create app → enable **Private Channels** (required for auth)
2. In app settings, ensure **Client Events** is enabled if you want client-triggered events
3. The auth endpoint is at `/api/pusher/auth`

---

## Migration & Run Instructions

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Seed with sample data
# npx prisma db seed

# Start dev server
npm run dev

# Build for production
npm run build
npm start
```

---

## Worker Run Instructions

Workers process background jobs for sequences, warmup, and tracking. Run each in a separate process:

```bash
# Process follow-up sequences (runs hourly)
npx ts-node --project tsconfig.worker.json workers/followup.ts

# Process email warmup phase transitions (runs hourly)
npx ts-node --project tsconfig.worker.json workers/warmup.ts

# Check for replies and update statuses (runs every 15 min)
npx ts-node --project tsconfig.worker.json workers/tracker.ts
```

In production, use PM2 or a similar process manager:
```bash
npm install -g pm2
pm2 start workers/followup.ts --interpreter ts-node
pm2 start workers/warmup.ts --interpreter ts-node
pm2 start workers/tracker.ts --interpreter ts-node
```

---

## Important Notes

- **All cold emails are sent from the user's own Gmail** via OAuth tokens obtained during Google sign-in. OutreachIQ does **not** use any third-party SMTP relay (SendGrid, Mailgun, etc.) for outbound mail.
- Gmail tokens are **encrypted at rest** using AES-256-GCM before being stored in the database. They are never exposed to the browser.
- Resend is used **only** for in-app notification emails (e.g., "your sequence completed").
- The warmup module progressively increases daily send limits to protect your Gmail reputation.
- Reply detection polls Gmail threads every 15 minutes via the tracker worker, then pauses sequences automatically.

---

## Environment Variables Reference

See `.env.example` for the complete list. All variables are required unless marked optional.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL pooled connection |
| `DIRECT_URL` | ✅ | Neon PostgreSQL direct connection (for migrations) |
| `NEXTAUTH_URL` | ✅ | Your app URL |
| `NEXTAUTH_SECRET` | ✅ | Random secret for NextAuth |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `PUSHER_APP_ID` | ✅ | Pusher app ID |
| `PUSHER_KEY` | ✅ | Pusher key |
| `PUSHER_SECRET` | ✅ | Pusher secret |
| `PUSHER_CLUSTER` | ✅ | Pusher cluster |
| `NEXT_PUBLIC_PUSHER_KEY` | ✅ | Pusher key (client-side) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ✅ | Pusher cluster (client-side) |
| `UPSTASH_REDIS_URL` | ✅ | Upstash Redis URL |
| `UPSTASH_REDIS_TOKEN` | ✅ | Upstash Redis token |
| `HUNTER_API_KEY` | ✅ | Hunter.io API key |
| `RESEND_API_KEY` | ✅ | Resend API key |
| `RESEND_FROM_EMAIL` | ✅ | Verified sending email for Resend |
| `ADZUNA_APP_ID` | ✅ | Adzuna app ID |
| `ADZUNA_API_KEY` | ✅ | Adzuna API key |
| `TOKEN_ENCRYPTION_KEY` | ✅ | 32-char key for AES-256-GCM encryption |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| Drag & Drop | @dnd-kit |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 (auth.js) |
| AI | Anthropic claude-haiku-4-5 |
| Storage | Cloudinary |
| Realtime | Pusher |
| Queues | BullMQ + Upstash Redis |
| Email Find | Hunter.io |
| Notifications | Resend |
