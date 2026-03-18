# Project Overview

This is a React + Vite + TypeScript frontend application using Tailwind CSS and shadcn/ui components.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI primitives)
- **Routing**: React Router DOM v6
- **State/Data**: TanStack Query
- **Forms**: React Hook Form + Zod

## Project Structure

- `src/` - Application source code
  - `App.tsx` - Root app component with routing
  - `pages/` - Page components (Index, NotFound)
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions
  - `types/` - TypeScript type definitions
  - `utils/` - Utility helpers
  - `assets/` - Static assets (e.g., board8.json)
- `public/` - Static public files
- `index.html` - HTML entry point

## Development

- **Dev server**: runs on `0.0.0.0:5000` via `npm run dev`
- **Workflow**: "Start application" workflow configured for port 5000 (webview)

## Deployment

- **Target**: Static site deployment
- **Build command**: `npm run build`
- **Output directory**: `dist`
