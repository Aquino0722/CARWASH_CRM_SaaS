# 05_NEXTJS_FRONTEND_UX.md — Next.js Frontend and UX Guide

## Purpose

This document defines the frontend architecture, UI system, visual direction, and interaction rules for CARWASH.

The frontend must feel like a premium automotive SaaS product.

It must be:

* elegant,
* dark by default,
* fast,
* modern,
* responsive,
* operationally useful,
* visually impressive where appropriate.

## Mandatory Frontend Stack

Use:

* Next.js App Router.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* Supabase SSR Auth.
* GSAP.
* ScrollTrigger only for public/report/marketing pages.

Do not use:

* Material UI,
* Bootstrap,
* Chakra UI,
* Ant Design,
* DaisyUI,
* Mantine,
* custom UI libraries unless explicitly approved.

## Frontend Location

The app must live in:

```txt
apps/web/
```

Expected structure:

```txt
apps/web/
  src/
    app/
    components/
    features/
    lib/
    hooks/
    styles/
    types/
```

## App Router Structure

Use this route structure:

```txt
src/app/
  layout.tsx
  globals.css

  (public)/
    page.tsx
    r/
      [token]/
        page.tsx

  (auth)/
    login/
      page.tsx
    callback/
      route.ts

  (dashboard)/
    layout.tsx
    select-tenant/
      page.tsx
    dashboard/
      page.tsx
    customers/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
    vehicles/
      [id]/
        page.tsx
    service-orders/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
        inspection/
          page.tsx
        report/
          page.tsx
    bays/
      page.tsx
    warranties/
      page.tsx
    settings/
      whatsapp/
        page.tsx
```

## Component Organization

Use this folder structure:

```txt
src/components/
  ui/
  layout/
  shared/

src/features/
  auth/
  tenants/
  dashboard/
  customers/
  vehicles/
  service-orders/
  bays/
  inspections/
  reports/
  warranties/
  whatsapp/
  public-report/

src/lib/
  api/
  supabase/
  utils/
  constants/
```

## Server and Client Components

Use Server Components by default.

Use Client Components only when necessary.

Client Components are allowed for:

* forms,
* drag and drop,
* realtime subscriptions,
* GSAP animations,
* before/after sliders,
* local UI state,
* charts requiring browser APIs,
* file upload controls,
* interactive SVG editor.

Do not mark an entire page as `"use client"` unless required.

Prefer this pattern:

```txt
page.tsx                → Server Component
feature-widget.tsx      → Client Component only if interactive
```

## Supabase SSR Auth

Use Supabase SSR auth.

Required files:

```txt
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/middleware.ts
```

Use browser client only inside Client Components.

Use server client inside Server Components, route handlers, and middleware.

Never use Service Role Key in frontend code.

Allowed frontend Supabase env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Forbidden frontend env vars:

```env
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## API Client to .NET

All dashboard data mutations should go through the .NET API, not directly through Supabase from the browser.

Required file:

```txt
src/lib/api/api-client.ts
```

The API client must:

* get Supabase access token,
* attach `Authorization: Bearer <token>`,
* attach `X-Tenant-Id`,
* attach `X-Correlation-Id`,
* handle 401,
* handle 403,
* handle 409,
* return typed data.

Required headers:

```txt
Authorization: Bearer <supabase_access_token>
X-Tenant-Id: <active_tenant_id>
X-Correlation-Id: <uuid>
```

## Tenant Handling

The selected tenant should be stored in a safe frontend state.

Recommended:

```txt
localStorage for active tenant id
server validation on every API request
```

Frontend must never assume tenant access is valid just because a tenant id exists locally.

Backend is always the source of truth.

Required components:

```txt
src/features/tenants/tenant-switcher.tsx
src/features/tenants/select-tenant-card.tsx
src/lib/tenant/active-tenant.ts
```

## Visual Direction

The UI must feel like a high-end automotive detailing dashboard.

Default style:

```txt
dark mode
black graphite background
deep charcoal surfaces
subtle borders
soft shadows
premium spacing
high contrast text
elegant typography
minimal but refined motion
```

Avoid:

```txt
generic startup gradients
childish colors
excessive glassmorphism
overanimated dashboard
neon overload
low-contrast gray text
```

## Color Direction

Recommended palette:

```txt
Background: near-black / graphite
Surface: dark charcoal
Border: subtle gray
Text: white / near-white
Muted text: cool gray
Accent: champagne gold, metallic silver, or electric blue
Success: green
Warning: amber
Danger: red
```

Do not hardcode colors everywhere.

Prefer Tailwind theme tokens.

## shadcn/ui Rules

Use shadcn/ui for reusable interface elements.

Required components:

```txt
button
card
dialog
dropdown-menu
table
badge
tabs
toast
sheet
input
textarea
select
skeleton
progress
separator
avatar
tooltip
popover
form
```

Do not create custom versions of common UI components unless shadcn/ui cannot satisfy the need.

## Layout Components

Required layout components:

```txt
src/components/layout/dashboard-shell.tsx
src/components/layout/sidebar.tsx
src/components/layout/topbar.tsx
src/components/layout/mobile-nav.tsx
src/components/layout/page-header.tsx
```

Dashboard shell must include:

* sidebar,
* topbar,
* tenant switcher,
* user menu,
* responsive mobile navigation,
* content container.

## Dashboard UX

The dashboard is operational software.

It should prioritize:

* clarity,
* speed,
* dense but readable information,
* quick actions,
* minimal friction.

Dashboard should not be overanimated.

Use simple Tailwind transitions for:

* hover states,
* active tabs,
* opening panels,
* small feedback states.

Use GSAP only if explicitly required.

## Dashboard Main Page

Route:

```txt
src/app/(dashboard)/dashboard/page.tsx
```

Required widgets:

```txt
Active service orders
Vehicles currently in bays
Reports sent this month
Warranty alerts
Estimated revenue
Recent activity
```

Components:

```txt
src/features/dashboard/kpi-card.tsx
src/features/dashboard/recent-activity.tsx
src/features/dashboard/service-order-overview.tsx
src/features/dashboard/warranty-alert-card.tsx
```

## Customers UI

Routes:

```txt
src/app/(dashboard)/customers/page.tsx
src/app/(dashboard)/customers/new/page.tsx
src/app/(dashboard)/customers/[id]/page.tsx
```

Components:

```txt
src/features/customers/customer-table.tsx
src/features/customers/customer-form.tsx
src/features/customers/customer-detail-header.tsx
src/features/customers/customer-vehicles-list.tsx
```

UX requirements:

* searchable table,
* create customer dialog or page,
* WhatsApp consent visible,
* customer detail shows vehicles and orders.

## Vehicles UI

Route:

```txt
src/app/(dashboard)/vehicles/[id]/page.tsx
```

Components:

```txt
src/features/vehicles/vehicle-form.tsx
src/features/vehicles/vehicle-summary-card.tsx
src/features/vehicles/vehicle-history-timeline.tsx
```

Vehicle page should show:

* customer,
* make,
* model,
* year,
* plate,
* color,
* service history,
* visual inspection history,
* active warranty.

## Service Orders UI

Routes:

```txt
src/app/(dashboard)/service-orders/page.tsx
src/app/(dashboard)/service-orders/new/page.tsx
src/app/(dashboard)/service-orders/[id]/page.tsx
```

Components:

```txt
src/features/service-orders/service-order-table.tsx
src/features/service-orders/service-order-form.tsx
src/features/service-orders/service-order-status-badge.tsx
src/features/service-orders/service-order-actions.tsx
src/features/service-orders/service-order-timeline.tsx
```

Status should be visually clear:

```txt
draft
quoted
scheduled
checked_in
in_progress
quality_check
ready_for_delivery
delivered
cancelled
```

## Work Bays Realtime Board

Route:

```txt
src/app/(dashboard)/bays/page.tsx
```

Components:

```txt
src/features/bays/bay-board.tsx
src/features/bays/bay-column.tsx
src/features/bays/work-item-card.tsx
src/features/bays/use-bay-realtime.ts
src/features/bays/use-drag-move.ts
```

Requirements:

* Kanban-style columns by bay.
* Drag and drop.
* Optimistic UI update.
* Supabase Realtime subscription.
* Version conflict handling.
* Toast on conflict.

Conflict UX:

```txt
If backend returns 409 VERSION_CONFLICT:
  show toast
  refresh board
  do not silently overwrite
```

## Visual Inspection UI

Route:

```txt
src/app/(dashboard)/service-orders/[id]/inspection/page.tsx
```

Components:

```txt
src/features/inspections/vehicle-svg-editor.tsx
src/features/inspections/panel-popover.tsx
src/features/inspections/damage-mark-toolbar.tsx
src/features/inspections/micron-reading-table.tsx
src/features/inspections/inspection-photo-uploader.tsx
src/features/inspections/aesthetic-history-timeline.tsx
```

Requirements:

* interactive SVG vehicle template,
* clickable panels,
* damage marks,
* damage severity,
* micron readings,
* save as JSONB through .NET API,
* reconstruct UI from saved JSONB.

Use Client Components for SVG editor.

Do not store inspection state only in frontend memory.

## Report Publishing UI

Route:

```txt
src/app/(dashboard)/service-orders/[id]/report/page.tsx
```

Components:

```txt
src/features/reports/report-builder.tsx
src/features/reports/report-photo-selector.tsx
src/features/reports/report-preview-card.tsx
src/features/reports/publish-report-button.tsx
```

Requirements:

* select before photos,
* select after photos,
* preview report title and summary,
* publish report,
* show generated public link,
* trigger WhatsApp send through backend/outbox.

Do not send WhatsApp directly from frontend.

## Public Report Landing

Route:

```txt
src/app/(public)/r/[token]/page.tsx
```

Components:

```txt
src/features/public-report/report-hero.tsx
src/features/public-report/before-after-slider.tsx
src/features/public-report/process-timeline.tsx
src/features/public-report/gallery-grid.tsx
src/features/public-report/share-whatsapp-button.tsx
src/features/public-report/gsap-report-animations.tsx
```

Requirements:

* no login required,
* token-based access,
* call .NET public endpoint,
* show sanitized report data only,
* premium visual experience,
* mobile-first,
* share button,
* before/after slider.

## GSAP Rules

Use GSAP only for:

* public report landing,
* premium marketing sections,
* scroll storytelling,
* before/after reveal,
* process timeline animation,
* gallery reveal.

Do not use GSAP for:

* simple button hover,
* dashboard table interactions,
* standard modal animations,
* dropdowns,
* sidebar transitions.

Use Tailwind/CSS transitions for simple interactions.

## ScrollTrigger Rules

ScrollTrigger is allowed only in Client Components.

Required pattern:

```txt
"use client"

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

useEffect(() => {
  gsap.registerPlugin(ScrollTrigger)

  // animation setup

  return () => {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  }
}, [])
```

Never register ScrollTrigger in Server Components.

## Loading States

Every page that fetches data should include loading UI.

Use:

```txt
Skeleton
Spinner only when appropriate
Optimistic UI where safe
```

## Empty States

Every table or board must have a useful empty state.

Examples:

```txt
No customers yet.
Create your first customer to start managing vehicles.

No active work items.
Create or check in a service order to assign it to a bay.
```

## Error States

Frontend must handle:

```txt
401 → redirect to login
403 → show access denied
404 → show not found
409 → show conflict and refresh data
500 → show generic error with correlation id
```

## Forms

Use:

* React Hook Form,
* Zod,
* shadcn/ui form components.

Rules:

* validate client-side,
* backend remains source of truth,
* show field errors clearly,
* avoid silent failures.

## File Uploads

Image uploads should go through backend-approved flow.

Options:

1. Frontend asks backend for signed upload URL.
2. Frontend uploads to Supabase Storage.
3. Frontend confirms upload to backend.

Do not expose service role key.

## Realtime

Use Supabase Realtime for:

* bays,
* work_items,
* service_orders if needed.

Realtime hooks must:

* unsubscribe on unmount,
* filter by tenant,
* avoid memory leaks,
* refetch on version conflict.

## Accessibility

Minimum requirements:

* buttons have accessible labels,
* forms have labels,
* dialogs are keyboard usable,
* color is not the only status indicator,
* text contrast is readable.

## Frontend Done Definition

A frontend feature is done only when:

1. It uses the required stack.
2. It uses shadcn/ui where appropriate.
3. It respects dark premium visual style.
4. It handles loading state.
5. It handles empty state.
6. It handles error state.
7. It sends auth and tenant headers when calling .NET.
8. It does not expose secrets.
9. It works on mobile.
10. It builds successfully.
