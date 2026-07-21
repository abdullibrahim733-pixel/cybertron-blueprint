# Cybertron

AI-Powered Hardware Design Platform

## Overview

Cybertron is an integrated AI-driven platform for hardware design and learning. Users describe a device or project in natural language, and Cybertron's intelligent agents generate complete design outputs (electrical schematics, mechanical blueprints, BOMs), suggest components, and provide diagnostics and build instructions.

## Quick Start

```bash
# Install dependencies
npm install

# Run database migration and seed demo data
npm run setup

# Start development servers (API + Web)
npm run dev
```

- **API**: http://localhost:4000/graphql
- **Web**: http://localhost:3000

## Demo Credentials

- **Email**: demo@cybertron.dev
- **Password**: demo123

## Project Structure

```
blueprint/
├── apps/
│   ├── api/          # Node.js + Apollo Server + GraphQL API
│   └── web/          # React + TypeScript + Vite frontend
├── packages/
│   └── shared/       # Shared TypeScript interfaces
└── package.json      # Monorepo root (npm workspaces)
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Apollo Client
- **Backend**: Node.js, Apollo Server 4, GraphQL, better-sqlite3
- **Auth**: JWT (JSON Web Tokens)
- **Database**: SQLite (portable, zero-config)

## Features (Phase 1)

- User authentication (register/login)
- Project management (create, update, status tracking)
- Bill of Materials (BOM) management
- Parts search with category filtering
- Supplier database
- Collaborative project sharing

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + Web dev servers |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start Web dev server only |
| `npm run setup` | Run migration + seed |
| `npm run build` | Build all packages |

## License

MIT
