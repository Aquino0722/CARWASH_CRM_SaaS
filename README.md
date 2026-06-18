# CARWASH

Multi-tenant SaaS CRM for high-ticket car detailing and premium car wash businesses.

## Core Pillars

1. **Visual vehicle clinical history** — Interactive SVG-based vehicle inspection with paint micron measurements
2. **Automated before/after viral reports** — Generated and sent via WhatsApp
3. **Warranty & wear-level alerts** — Traffic-light (green/yellow/red) automated notifications
4. **Real-time work bay management** — Kanban board with Supabase Realtime

## Planned Apps

| App | Technology | Purpose |
|-----|------------|---------|
| `apps/web` | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui | Frontend dashboard & public reports |
| `apps/api` | .NET 8/9, Clean Architecture, CQRS (MediatR) | Main REST API |
| `apps/whatsapp-service` | Node.js, Express, TypeScript, whatsapp-web.js | Isolated WhatsApp session management |

## Stack

- **Database & Auth**: Supabase (PostgreSQL, Auth, RLS, Storage, Realtime)
- **Deployment**: Vercel (frontend), Render/Railway (backend & WhatsApp service)
- **CI/CD**: GitHub Actions

## Project Structure

```
CARWASH/
├── AGENTS.md
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── api/                 # .NET Web API
│   └── whatsapp-service/    # Node.js WhatsApp microservice
├── infra/
│   └── supabase/
│       ├── migrations/      # SQL migrations (numeric prefixes)
│       ├── seeds/           # Seed data
│       └── policies/        # RLS policies
├── docs/
│   ├── 00_MASTER_ROADMAP.md
│   ├── 01_ENGINEERING_PRINCIPLES.md
│   ├── 02_SUPABASE_SCHEMA_AND_RLS.md
│   ├── 03_DOTNET_BACKEND_ARCHITECTURE.md
│   ├── 04_WHATSAPP_MICROSERVICE.md
│   ├── 05_NEXTJS_FRONTEND_UX.md
│   ├── 06_FEATURE_PROMPTS.md
│   └── 07_DEPLOYMENT_AND_ENV.md
├── .env.example
├── docker-compose.dev.yml
└── .gitignore
```

## Getting Started

1. Copy `.env.example` to `.env` and fill in values
2. Each app has its own README with setup instructions
3. Run `docker-compose -f docker-compose.dev.yml up` for local services (when implemented)

## Documentation

Start with `AGENTS.md` and `docs/00_MASTER_ROADMAP.md`.