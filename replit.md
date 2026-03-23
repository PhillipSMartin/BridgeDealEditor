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
  - `components/bridge/` - Bridge domain components
    - `BridgeEditor.tsx` - Main editor with toolbar, import/export
    - `BboUrlBuilder.tsx` - BBO Handviewer URL generator dialog
    - `HtmlBuilder.tsx` - HTML export dialog with live preview
    - `AuctionDisplay.tsx` - Auction sequence display
    - `HandDisplay.tsx` - Individual hand card display
    - `BridgeTable.tsx` - Full four-hand table layout
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions
  - `types/bridge.ts` - Bridge domain type definitions
  - `utils/` - Utility helpers
    - `buildHtml.ts` - HTML export generator (translated from Python DealFormatter)
    - `linParser.ts` - BBO LIN/URL parser
    - `pbnParser.ts` - PBN file parser
  - `assets/` - Static assets (e.g., board8.json)
- `public/` - Static public files (gargoyle.jpg logo)
- `index.html` - HTML entry point

## Bridge Deal Editor Features

- Import: JSON file, PBN file (.pbn/.txt), BBO URL paste
- Export: JSON download, BBO URL copy, BBO Handviewer URL builder, HTML export
- Edit: Drag cards between hands, build play sequence by clicking cards, rotate deal, clear play
- HTML export (`buildHtml.ts`): TypeScript translation of Python DealFormatter/buildhtml.py
  - Options: which hands (N/E/S/W), auction style, played card count/display/felt, suit exclusion, title
  - Live iframe preview using srcdoc; Download and Copy HTML buttons

## Development

- **Dev server**: runs on `0.0.0.0:5000` via `npm run dev`
- **Workflow**: "Start application" workflow configured for port 5000 (webview)

## Deployment

- **Target**: Static site deployment
- **Build command**: `npm run build`
- **Output directory**: `dist`
