# FocusNode

A productivity workspace for managing tasks, boards, and focused work. Built with Next.js and a custom design system.

## Features

- **Kanban boards** — Swimlane-based boards with drag-and-drop cards, priorities, WIP limits, and multiple projects (switch boards via the sidebar or `?board=` query param).
- **Focus timer** — Pomodoro sessions (25 / 5 / 15 minutes) with a visual clock dial, play/pause/skip controls, and a distraction-blocker panel.
- **Daily planner** — Plan and track today’s tasks with estimates, status, and board context.
- **Team workload** — View team capacity, filters, and task assignments across projects.
- **Command palette** — Press `⌘K` (or click the header button) to jump between views, start a focus session, and run quick actions.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [shadcn/ui](https://ui.shadcn.com) + [Base UI](https://base-ui.com)
- [cmdk](https://cmdk.paco.me) for the command palette
- [Lucide](https://lucide.dev) icons

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run start`| Serve production build   |

## Project structure

```
app/
├── page.tsx              # Kanban board (home)
├── focus-timer/          # Pomodoro timer
├── daily-planner/        # Daily task planner
├── team/                 # Team workload view
├── components/           # Header, SideNav, CommandPalette, UI primitives
└── lib/                  # Board data and utilities
```

Board seed data lives in `app/lib/boards.ts`. UI is client-side with in-memory state (no backend or persistence yet).

## Routes

| Path              | View            |
| ----------------- | --------------- |
| `/`               | Kanban boards   |
| `/focus-timer`    | Focus timer     |
| `/daily-planner`  | Daily planner   |
| `/team`           | Team workload   |
