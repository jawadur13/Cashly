# Cashly

Cashly is a personal finance web app built with Next.js and Appwrite. It helps users manage accounts, categories, and transactions with a simple mobile-friendly experience, including authentication, balances, summaries, and transaction history.

🔗 **Live app:** [https://cashly.mvp.bd/](https://cashly.mvp.bd/)

## Overview

### What the app includes
- User authentication with Appwrite Auth (register, login, password reset)
- Account management and balance tracking
- Categories for income and expenses with a large built-in icon set
- Transaction creation, editing, and filtering (search, type, account)
- Summary tab with monthly / yearly / all-time views, opening & closing balances, savings rate, and category breakdowns
- Multi-currency support with exchange-rate conversion
- Balance privacy: hidden by default with a 5-second "peek" eye toggle
- Responsive mobile-first UI (bottom nav on phones, sidebar on desktop)
- Progressive Web App support via service worker registration

### Tech stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Appwrite Cloud for auth and database
- Lucide icons

## Project structure

- src/app: route pages and app layout
- src/components: reusable UI and feature components
- src/hooks: data hooks for accounts, transactions, categories, and summary views
- src/lib: app constants, utility helpers, Appwrite client/config, and currency formatting
- src/providers: auth, theme, settings, toast, and app providers
- scripts: database setup and smoke-test helpers

## Prerequisites

Before running the project locally, make sure you have:
- Node.js 20+ recommended
- npm
- An Appwrite Cloud project

## Environment variables

Create a local environment file named .env.local in the project root with the following values:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://<your-appwrite-endpoint>/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<your-database-id>
APPWRITE_API_KEY=<your-server-side-appwrite-api-key>
APPWRITE_DATABASE_ID=<your-database-id>
```

### Notes
- NEXT_PUBLIC_* values are used by the browser app.
- APPWRITE_* values are used by the local setup and smoke-test scripts.
- Never commit your real secrets. The repository already ignores .env.local and .env.vercel.

## Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Appwrite setup

1. Create a project in Appwrite Cloud.
2. Enable email/password authentication.
3. Create a database and note the database ID.
4. Create collections named:
   - accounts
   - transactions
   - categories
5. Add the required environment variables above.

### Database setup helper

A helper script is included to create the collections, attributes, indexes, and seed categories:

```bash
node scripts/setup-db.mjs
```

### Smoke test

You can run the smoke test script to verify Appwrite connectivity and basic CRUD flow:

```bash
node scripts/smoke-test.cjs
```

## Build and lint

Build the app:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Deployment on Vercel

To deploy this app to Vercel:

1. Push the repository to GitHub.
2. Create a new Vercel project and import the repository.
3. Add the same environment variables in Vercel Project Settings > Environment Variables.
4. Deploy the project.

### Vercel env file

A ready-to-use env file is included at .env.vercel for reference and upload. It is gitignored by default.

### If login shows "Failed to fetch" on Vercel

Cashly uses the Appwrite browser SDK directly from the client. If the app works on localhost but fails on your deployed Vercel URL, the most common cause is that the Vercel domain has not been added to the Appwrite project as an allowed Web platform.

Check these items in Appwrite Cloud:

1. Add your production domain, such as cashly-rust.vercel.app, under Platforms > Web.
2. If you use preview deployments, add those domains too or use the appropriate wildcard setup supported by Appwrite.
3. Make sure the deployed Vercel project has the same NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and NEXT_PUBLIC_APPWRITE_DATABASE_ID values as your local environment.
4. Re-deploy after updating environment variables.

If those settings are correct, open the browser console and network tab to look for a CORS error or an Appwrite request that is being blocked.

## Useful commands

```bash
npm run dev
npm run build
npm run lint
node scripts/setup-db.mjs
node scripts/smoke-test.cjs
```

## Notes

- The app is designed as a mobile-first finance experience.
- Authentication and data storage are handled by Appwrite rather than a custom backend.
- The app uses client-side Appwrite SDK access and relies on the Appwrite permission model for per-user data isolation.
