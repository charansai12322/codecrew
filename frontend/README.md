# Code Crew — Frontend Application

Modern React 19 + TypeScript + Vite developer interface for the Code Crew multi-agent review engine.

---

## Tech Stack & Architecture

- **Framework:** React 19 & Vite 8
- **Language:** TypeScript 5.8+ (Strict Type-Checking with `verbatimModuleSyntax`)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Testing:** Vitest & jsdom
- **Linting:** Oxlint

### Directory Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── editor/          # Code editor input, language & focus selectors, presets
│   │   ├── pipeline/        # 3-agent pipeline visualization & live status
│   │   ├── results/         # Remediated code, side-by-side diff, bug report, review verdict
│   │   └── ui/              # Alert banners, badges, toolbars
│   ├── services/
│   │   └── api.ts           # Typed HTTP client communicating with FastAPI backend
│   ├── types/               # TypeScript models matching backend Pydantic schemas
│   ├── App.tsx              # Main dual-pane workspace orchestrator
│   └── main.tsx             # React DOM entry point
├── tests/                   # Vitest unit & contract tests
└── package.json
```

---

## Getting Started

### 1. Requirements
- Node.js `v20+` or `v24+` (Installed: `v24.18.0`)
- npm `v10+` (Installed: `11.16.0`)

### 2. Installation
```powershell
npm install
```

### 3. Environment Configuration
Copy the template configuration if backend runs on a custom port:
```powershell
cp .env.example .env
```
Default:
```ini
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Running the Development Server
```powershell
npm run dev
```
Local development server runs at `http://localhost:5173`.

### 5. Running Tests & Quality Checks
```powershell
# Run Vitest test suite
npm test

# Run Oxlint
npm run lint

# Build production bundle
npm run build
```
