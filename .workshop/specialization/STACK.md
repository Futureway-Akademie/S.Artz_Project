# Technischer Stack

Der technische Stack ergänzt den zentralen Workshop-Workflow und darf ihn nicht überschreiben. Details zur Architektur: `docs/architecture.md`.

## Laufzeit und Build

- Node.js 24 / npm 11 (lokal geprüft)
- Vite 8 mit `@vitejs/plugin-react`
- TypeScript 6, strikt (`strict`, `noUncheckedIndexedAccess`, `noUnused*`)
- React 18

## Geplant, wird im jeweiligen Task ergänzt

- `react-router` v7 mit `BrowserRouter` (task-1-6)
- `zod` für Speicher- und Import-Validierung (task-1-4)

## Qualität

- ESLint 9 (Flat Config) mit `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`
  - ESLint 9 statt 10, weil `eslint-plugin-jsx-a11y` ESLint 10 noch nicht unterstützt
- Vitest 5 mit jsdom, Testing Library und `@testing-library/jest-dom`; Zeitzone in Tests `Europe/Berlin`

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver (http://localhost:5173) |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ohne Ausgabe |
| `npm test` | Vitest einmalig |

## Struktur

Vite-Projekt im Repository-Root; Quellcode unter `src/`, statische Dateien unter `public/` (Logos in `public/brand/`).
