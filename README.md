# Sprint Planning Report Analyzer

Internal Persian RTL MVP for uploading Jira sprint exports (Excel/CSV), storing Sprint Snapshots, comparing snapshots, calculating sprint planning metrics, and generating management-ready Persian reports.

## Stack
Next.js + TypeScript, Tailwind CSS, shadcn-style UI primitives, Prisma, SQLite, SheetJS/xlsx, Recharts-ready analytics structure, Vitest.

## Setup
```bash
npm install
cp .env.example .env
npm run prisma:push
npm run seed
npm run dev
```

Open http://localhost:3000.

## Test data
Two CSV snapshots are included in `sample-data/`. The seed script loads both and creates a reusable default mapping profile.

## Main features
- Dashboard for latest snapshot totals and breakdowns.
- Upload page for Excel/CSV import with default column mapping and validation.
- Snapshot list with totals.
- Comparison page with item-by-item before/after changes.
- Analytics page for team, status, stakeholder, blocked/remain, and capacity-risk metrics.
- Persian Report Composer with Markdown output and API structure for HTML export.

## Environment
```env
DATABASE_URL="file:./dev.db"
```
